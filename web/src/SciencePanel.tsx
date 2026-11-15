import study from '../../data/research/sprint_control.json';
import observations from '../../data/nasa_observations.json';
import evidence from '../../data/evidence.json';
import params from '../../data/params.json';

const sourceNames: Record<string, string> = { nasa_bone: 'Bone changes in space', nasa_muscle: 'Muscle health', nasa_exercise: 'Exercise and recovery', nasa_fracture: 'Injury healing' };

export function SciencePanel({ activeParamsVersion }: { activeParamsVersion?: string }) {
  return <section className="science-panel" aria-label="Sources and model limits">
    <p>Four model rates reference published human measurements from NASA’s Sprint study. Daily curves and routine effects remain simplified assumptions.</p>
    {activeParamsVersion && activeParamsVersion !== evidence.params_version && <p role="alert">The active settings differ from this source review. The references below may not cover them.</p>}
    <section className="study-reference"><h2>The human data behind the model</h2>
      <p>17 people. A 165-day average mission. Published group measurements, not personal health records.</p>
      <div className="science-table"><table><thead><tr><th>Measurement</th><th>Before flight</th><th>After flight</th><th>When measured</th></tr></thead><tbody>
        {study.outcomes.map(item => <tr key={item.key}><td>{item.label}</td><td>{item.pre_mean} {item.unit}</td><td>{item.post_mean} {item.unit}</td><td>{item.postflight_days[0] === item.postflight_days[1] ? item.postflight_days[0] : `${item.postflight_days[0]}–${item.postflight_days[1]}`} days after landing</td></tr>)}
      </tbody></table></div>
      <p>Group averages vary between studies. Leg lean-mass change was not statistically significant. Matching these values does not prove personal prediction accuracy.</p>
      <a className="source-link" href={study.url} target="_blank" rel="noopener noreferrer">Read the NASA Sprint study</a>
    </section>
    <details><summary>Broader NASA findings</summary><NASAObservations /></details>
    <h2>Read the research</h2>
    {evidence.sources.map(source => <details key={source.id}><summary>{sourceNames[source.id] ?? source.title}</summary><p>{source.finding}</p>
      <a className="source-link" href={source.url} target="_blank" rel="noopener noreferrer">Open source ↗</a></details>)}
    <details><summary>What the model leaves out</summary><ul>{evidence.limits.map(limit => <li key={limit}>{limit}</li>)}</ul></details>
    <details><summary>Assumptions behind the numbers</summary><div className="science-table"><table><thead><tr><th>Part of the model</th><th>Evidence</th><th>What it means</th></tr></thead>
      <tbody>{evidence.parameters.map(entry => <tr key={entry.path}><td>{entry.label}</td><td>{entry.status}</td><td>{entry.note}</td></tr>)}</tbody></table></div></details>
    <p className="science-version">Source review {evidence.reviewed_on} · Settings {activeParamsVersion ?? params.version} · Fictional crew profiles</p>
  </section>;
}

export function NASAObservations() {
  return <section aria-label="Published NASA observations">
    <h3>What NASA has observed</h3>
    <div className="research-facts">{observations.observations.map(item => <article className="research-fact" key={item.id}>
      <strong>{item.display}</strong><span>{item.label}</span><p>{item.context}</p>
      <a href={item.url} target="_blank" rel="noopener noreferrer">Read NASA findings</a>
    </article>)}</div>
    <p>These are published group summaries, not personal astronaut records. The app’s forecasts are simulations; they are not these measured results.</p>
    <details><summary>How this research is used</summary>{observations.observations.map(item => <p key={item.id}>{item.model_use}</p>)}
      <p>{observations.exercise_context.note}</p><a className="source-link" href={observations.exercise_context.url} target="_blank" rel="noopener noreferrer">NASA exercise research</a>
    </details>
  </section>;
}
