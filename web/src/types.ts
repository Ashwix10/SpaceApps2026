export type RegionId = 'head_neck' | 'chest' | 'heart' | 'spine' | 'pelvis' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';
export interface CrewProfile {
  id: string;
  name: string;
  age: number;
  sex: 'F' | 'M';
  mass_kg: number;
  fitness: 'low' | 'average' | 'high';
  role: string;
  baseline: { hip_bmd_g_cm2: number; spine_bmd_g_cm2: number; leg_lean_mass_kg: number; vo2max_ml_kg_min: number };
}
export interface Mission {
  destination: 'ISS' | 'MOON' | 'MARS';
  duration_days: number;
  eva_days: number[];
}
export type InjuryType = 'ankle_sprain' | 'wrist_fracture' | 'lower_back_strain' | 'thigh_muscle_tear';
export interface Injury {
  type: InjuryType;
  severity: 1 | 2 | 3;
  day: number;
  side: 'left' | 'right' | null;
}
export interface Countermeasures {
  resistance_min_per_day: number;
  aerobic_min_per_day: number;
  protein_g_per_kg: number;
  calorie_pct: number;
  bisphosphonate: boolean;
}
export interface ForecastRequest {
  crew: CrewProfile;
  mission: Mission;
  injury: Injury | null;
  countermeasures: Countermeasures;
}
export interface RiskScore { level: 'green' | 'yellow' | 'red'; score: number; reason: string }
export type SeriesKey = 'hip_bmd_pct' | 'spine_bmd_pct' | 'leg_muscle_pct' | 'vo2max_pct';
export interface ForecastResponse {
  days: number[];
  landing_day: number;
  series: Record<SeriesKey, number[]>;
  bands: Record<SeriesKey, { low: number[]; high: number[] }>;
  regions: Record<RegionId, number[]>;
  risks: Record<'fracture' | 'eva_fitness' | 'landing_fitness', RiskScore>;
  events: { day: number; type: 'launch' | 'injury' | 'eva' | 'landing'; label: string }[];
  meta: { model_version: string; params_version: string };
}
export interface CompareRequest { request: ForecastRequest; alternative: Countermeasures }
export interface CompareResponse { baseline: ForecastResponse; alternative: ForecastResponse }
export interface ExplainRequest {
  forecast: ForecastResponse;
  comparison: CompareResponse | null;
  crew_name: string;
  audience: 'surgeon' | 'crew';
}
export interface ExplainResponse { text: string; source: 'ai' | 'template' }
export interface InjuryInfo { type: string; label: string; needs_side: boolean }
export interface DemoSeed extends ForecastRequest { alternative: Countermeasures }
export interface Defaults { countermeasures: Countermeasures; mission: Mission; demo: DemoSeed }
export interface HealthResponse { status: 'ok'; model_version: string; params_version: string }
export interface BodyTwinProps {
  regions: Record<RegionId, number[]>;
  day: number;
  compareRegions?: Record<RegionId, number[]> | null;
  injuredRegion?: RegionId | null;
  selectedRegion?: RegionId | null;
  onRegionSelect?: (id: RegionId | null) => void;
  height?: number;
}
