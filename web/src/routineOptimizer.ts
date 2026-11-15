import type { Countermeasures, ForecastRequest, ForecastResponse, SeriesKey } from './types';

export type RoutineObjective = 'balanced' | 'bone' | 'cardio' | 'lean';
export const routineObjectives: Record<RoutineObjective, { label: string; metric: string; description: string; keys: SeriesKey[] }> = {
  balanced: { label: 'All four measures', metric: 'Average baseline retained', description: 'All four landing measures count equally.', keys: ['hip_bmd_pct', 'spine_bmd_pct', 'leg_muscle_pct', 'vo2max_pct'] },
  bone: { label: 'Bone density', metric: 'Bone baseline retained', description: 'Hip and spine density take priority.', keys: ['hip_bmd_pct', 'spine_bmd_pct'] },
  cardio: { label: 'Cardio', metric: 'Cardio baseline retained', description: 'Cardio retention takes priority.', keys: ['vo2max_pct'] },
  lean: { label: 'Leg lean tissue', metric: 'Leg tissue baseline retained', description: 'Leg lean tissue retention takes priority.', keys: ['leg_muscle_pct'] },
};

/** Manual routine controls are deliberately excluded from the optimization input. */
export function canonicalOptimizationRequest(request: ForecastRequest, medicationScenario = false): ForecastRequest {
  return {
    crew: structuredClone(request.crew),
    mission: structuredClone(request.mission),
    injury: structuredClone(request.injury),
    countermeasures: { resistance_min_per_day: 60, aerobic_min_per_day: 60, protein_g_per_kg: 1.2, calorie_pct: 100, bisphosphonate: medicationScenario },
  };
}

/** Exercise grid uses non-decreasing nutrition limits from the current model equations. */
export function buildRoutineCandidates(budget: number, medicationScenario = false): Countermeasures[] {
  if (!Number.isFinite(budget) || budget < 0 || budget > 240) throw new Error('Invalid exercise time budget');
  const candidates: Countermeasures[] = [];
  for (let resistance = 0; resistance <= 90; resistance += 15) {
    for (let aerobic = 0; aerobic <= 60; aerobic += 15) {
      if (resistance + aerobic <= budget) candidates.push({ resistance_min_per_day: resistance, aerobic_min_per_day: aerobic, protein_g_per_kg: 1.6, calorie_pct: 100, bisphosphonate: medicationScenario });
    }
  }
  return candidates;
}

/** Check nutrition at the best exercise split, without a large Cartesian-product search. */
export function buildNutritionCandidates(routine: Countermeasures): Countermeasures[] {
  return [.8, 1.2, 1.6].flatMap(protein => [80, 90, 100].map(calories => ({ ...routine, protein_g_per_kg: protein, calorie_pct: calories })));
}

export function landingObjective(forecast: ForecastResponse, objective: RoutineObjective): number {
  const values = routineObjectives[objective].keys.map(key => forecast.series[key][forecast.landing_day]);
  if (values.some(value => !Number.isFinite(value))) throw new Error('The forecast has no valid landing result');
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export interface RankedRoutine {
  routine: Countermeasures;
  forecast: ForecastResponse;
  score: number;
  allMeasuresScore: number;
  minutes: number;
  stage: 'exercise' | 'nutrition';
}
export interface RoutineSearchResult {
  best: RankedRoutine;
  evaluated: number;
  ranking: RankedRoutine[];
  exerciseRanking: RankedRoutine[];
  nutritionRanking: RankedRoutine[];
  budget: number;
  objective: RoutineObjective;
  medicationScenario: boolean;
  landingDay: number;
  crewMassKg: number;
}
export interface RoutineSearchProgress { stage: 'exercise' | 'nutrition'; complete: number; total: number }

const routineKey = (routine: Countermeasures) => JSON.stringify(routine);
function compareRanked(a: RankedRoutine, b: RankedRoutine): number {
  const primary = b.score - a.score;
  if (Math.abs(primary) > 1e-8) return primary;
  const allMeasures = b.allMeasuresScore - a.allMeasuresScore;
  if (Math.abs(allMeasures) > 1e-8) return allMeasures;
  return a.minutes - b.minutes
    || Math.abs(a.routine.calorie_pct - 100) - Math.abs(b.routine.calorie_pct - 100)
    || Math.abs(a.routine.protein_g_per_kg - 1.2) - Math.abs(b.routine.protein_g_per_kg - 1.2)
    || a.routine.resistance_min_per_day - b.routine.resistance_min_per_day;
}

/** Rank real API forecasts in two bounded stages. Manual inputs never seed this search. */
export async function optimizeRoutine(
  request: ForecastRequest,
  budget: number,
  objective: RoutineObjective,
  runForecast: (request: ForecastRequest) => Promise<ForecastResponse>,
  onProgress?: (progress: RoutineSearchProgress) => void,
  signal?: AbortSignal,
  medicationScenario = false,
): Promise<RoutineSearchResult> {
  const snapshot = canonicalOptimizationRequest(request, medicationScenario);
  const evaluated = new Map<string, RankedRoutine>();
  let modelVersion: string | undefined;
  let paramsVersion: string | undefined;
  const abortIfNeeded = () => { if (signal?.aborted) throw new DOMException('Routine search canceled', 'AbortError'); };

  async function evaluate(candidates: Countermeasures[], stage: RankedRoutine['stage']): Promise<RankedRoutine[]> {
    let cursor = 0;
    let complete = 0;
    let failed = false;
    const ranking: RankedRoutine[] = new Array(candidates.length);
    async function worker() {
      while (!failed && cursor < candidates.length) {
        abortIfNeeded();
        const index = cursor++;
        const routine = candidates[index];
        const cached = evaluated.get(routineKey(routine));
        try {
          if (cached) ranking[index] = cached;
          else {
            const output = await runForecast({ ...snapshot, countermeasures: { ...routine } });
            abortIfNeeded();
            if (output.landing_day !== snapshot.mission.duration_days) throw new Error('The forecast returned a different landing day');
            const score = landingObjective(output, objective);
            const allMeasuresScore = landingObjective(output, 'balanced');
            if (modelVersion === undefined) { modelVersion = output.meta.model_version; paramsVersion = output.meta.params_version; }
            if (output.meta.model_version !== modelVersion || output.meta.params_version !== paramsVersion) throw new Error('The model changed during this search. Run it again.');
            ranking[index] = { routine, forecast: output, score, allMeasuresScore, minutes: routine.resistance_min_per_day + routine.aerobic_min_per_day, stage };
            evaluated.set(routineKey(routine), ranking[index]);
          }
          onProgress?.({ stage, complete: ++complete, total: candidates.length });
        } catch (error) { failed = true; throw error; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, candidates.length) }, worker));
    abortIfNeeded();
    return ranking.sort(compareRanked);
  }

  const exerciseRanking = await evaluate(buildRoutineCandidates(budget, medicationScenario), 'exercise');
  const nutritionRanking = await evaluate(buildNutritionCandidates(exerciseRanking[0].routine), 'nutrition');
  const ranking = [...evaluated.values()].sort(compareRanked);
  return { best: ranking[0], evaluated: ranking.length, ranking, exerciseRanking, nutritionRanking, budget, objective, medicationScenario, landingDay: snapshot.mission.duration_days, crewMassKg: snapshot.crew.mass_kg };
}
