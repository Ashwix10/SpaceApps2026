import evidence from '../../data/evidence.json';
import params from '../../data/params.json';

export function SciencePanel({ activeParamsVersion }: { activeParamsVersion?: string }) {
  return <section className="panel science-panel" aria-label="Science and model limits">
    <span className="eyebrow">SCIENCE / ASSUMPTIONS</span><h2>What supports this simulation?</h2>
    <p>{evidence.overall_status}. Active parameter set: <strong>{activeParamsVersion ?? 'Unavailable'}</strong>. This evidence review covers {params.version}, reviewed {evidence.reviewed_on}.</p>
    {activeParamsVersion && activeParamsVersion !== evidence.params_version && <p role="alert">The active parameters differ from this bundled evidence review. These citations do not establish provenance for the active settings.</p>}
    <p>The bone base rate uses a chosen midpoint of NASA's broad reported range. Related research is context for the other settings; it does not validate their exact values.</p>
    <div className="science-table"><table><thead><tr><th>Model component</th><th>Evidence status</th><th>Interpretation</th></tr></thead>
      <tbody>{evidence.parameters.map(entry => <tr key={entry.path}><td>{entry.label}</td><td>{entry.status}</td><td>{entry.note}</td></tr>)}</tbody></table></div>
    <h3>Limits to keep in mind</h3><ul>{evidence.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
    <h3>Primary references</h3><p>Reference summaries are bundled for offline reading. Select and copy a URL to open the original in your browser.</p>
    {evidence.sources.map(source => <details key={source.id}><summary>{source.title}</summary><p>{source.finding}</p>
      <input readOnly aria-label={`${source.title} reference URL`} value={source.url} onFocus={event => event.target.select()} />
    </details>)}
  </section>;
}
