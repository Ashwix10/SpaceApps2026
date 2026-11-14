import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Sandbox } from './body/dev/Sandbox';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode>
  {new URLSearchParams(location.search).get('sandbox') === 'body' ? <Sandbox /> : <App />}
</StrictMode>);
