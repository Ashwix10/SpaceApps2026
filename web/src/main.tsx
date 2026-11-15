import { lazy, Suspense, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
const Sandbox = lazy(() => import('./body/dev/Sandbox').then(m => ({ default: m.Sandbox })));
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode>
  {new URLSearchParams(location.search).get('sandbox') === 'body' ? <Suspense fallback={<p>Preparing body view…</p>}><Sandbox /></Suspense> : <App />}
</StrictMode>);
