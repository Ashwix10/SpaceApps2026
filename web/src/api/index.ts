import type { CompareRequest, CompareResponse, CrewProfile, Defaults, ExplainRequest, ExplainResponse, ForecastRequest, ForecastResponse, HealthResponse, InjuryInfo } from '../types';
import { mockCrew, mockDefaults, mockForecast } from '../mocks';
import injuryTypes from '../../../data/injuries.json';

const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
async function call<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.detail === 'string' ? error.detail : `API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createApi(mocks: boolean) {
  return {
    health: (): Promise<HealthResponse> => mocks ? Promise.resolve({ status: 'ok', model_version: '0.0-mock', params_version: '0.1-placeholder' }) : call('/health'),
    crew: (): Promise<CrewProfile[]> => mocks ? Promise.resolve(structuredClone(mockCrew) as CrewProfile[]) : call('/crew'),
    injuries: (): Promise<InjuryInfo[]> => mocks ? Promise.resolve(injuryTypes) : call('/injuries'),
    defaults: (): Promise<Defaults> => mocks ? Promise.resolve(structuredClone(mockDefaults)) : call('/defaults'),
    forecast: (input: ForecastRequest): Promise<ForecastResponse> => mocks ? Promise.resolve(mockForecast(input)) : call('/forecast', input),
    compare: (input: CompareRequest): Promise<CompareResponse> => mocks ? Promise.resolve({ baseline: mockForecast(input.request), alternative: mockForecast({ ...input.request, countermeasures: input.alternative }) }) : call('/compare', input),
    explain: (input: ExplainRequest): Promise<ExplainResponse> => mocks ? Promise.resolve({ text: 'Mock mode: explanation service is disconnected. Flat curves are placeholders for integration only.', source: 'template' }) : call('/explain', input),
  };
}
