"""Reproduce a descriptive fit to published cohort means, not personal predictions."""
import argparse
from copy import deepcopy
import json
from pathlib import Path

from astrotwin_model import forecast, load_params
from astrotwin_model.engine import effectiveness, KEYS

ROOT = Path(__file__).resolve().parents[1]


def fitted_params(params, study):
    result = deepcopy(params)
    effect = effectiveness(study['reference_countermeasures'], result)
    for item in study['outcomes']:
        tissue = item['key']
        deficit = 1 - item['post_mean'] / item['pre_mean']
        # Undo the assumed postflight recovery to match the actual test window.
        landing = 1 - deficit * 2 ** (item['fit_offset_days'] / result['recovery_half_life_days'][tissue])
        if not 0 < landing <= 1:
            raise ValueError(f'Invalid landing fraction for {tissue}')
        effective_rate = 1 - landing ** (1 / study['population']['mission_days_mean'])
        result['daily_loss'][tissue] = effective_rate / (1 - effect[tissue])
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true', help='Write derived rates; otherwise verify committed rates')
    args = parser.parse_args()
    study = json.loads((ROOT / 'data/research/sprint_control.json').read_text(encoding='utf-8'))
    params = load_params(str(ROOT / 'data/params.json'))
    fitted = fitted_params(params, study)
    if args.write:
        (ROOT / 'data/params.json').write_text(json.dumps(fitted, indent=2) + '\n', encoding='utf-8')
    else:
        for tissue in KEYS:
            assert abs(fitted['daily_loss'][tissue] - params['daily_loss'][tissue]) < 1e-12, tissue
    crew = json.loads((ROOT / 'data/crew_presets.json').read_text(encoding='utf-8'))[0]
    request = {'crew': crew, 'mission': {'destination': 'ISS', 'duration_days': 165, 'eva_days': []},
               'injury': None, 'countermeasures': study['reference_countermeasures']}
    out = forecast(request, fitted)
    rows = []
    for item in study['outcomes']:
        observed = 100 * item['post_mean'] / item['pre_mean']
        simulated = out['series'][KEYS[item['key']]][165 + item['fit_offset_days']]
        assert abs(observed - simulated) <= .011
        rows.append({'outcome': item['label'], 'postflight_day': item['fit_offset_days'],
                     'observed_ratio_pct': round(observed, 4), 'model_pct': simulated,
                     'fit_residual_percentage_points': round(simulated - observed, 4)})
    # A deliberately challenging separate historical cohort; NOT a validation target.
    early = out['series']['vo2max_pct'][15]
    report = {'status': 'Descriptive aggregate fit; no independent predictive validation',
              'source': study['doi'], 'reference_mission_days': 165, 'reference_group_n': 17,
              'calibration_rows': rows,
              'external_challenge': {'source': 'https://ntrs.nasa.gov/citations/20140003748',
                 'measurement': 'Early-flight VO2peak (day 15), different historical cohort',
                 'observed_pct': 83, 'reported_95_ci_pct': [78, 87], 'model_pct': early,
                 'outside_reported_mean_ci': not 78 <= early <= 87,
                 'interpretation': 'The smooth model misses early-flight adaptation. Cohort/protocol differences also prevent an individual-accuracy claim.'},
              'limits': study['limits']}
    (ROOT / 'docs/calibration_report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('PASS: four published endpoints reproduced to rounding; historical early-flight mismatch explicitly reported. No prediction-accuracy claim.')


if __name__ == '__main__':
    main()
