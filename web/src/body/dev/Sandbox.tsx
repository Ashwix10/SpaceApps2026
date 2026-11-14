import { BodyTwin } from '../index';
import { mockDefaults, mockForecast } from '../../mocks';
import { useState } from 'react';

export function Sandbox() {
  const [day, setDay] = useState(0);
  const forecast = mockForecast(mockDefaults.demo);
  return <main><h1>BodyTwin sandbox</h1><p>Replace the placeholder in web/src/body/ with the 3D component.</p>
    <BodyTwin regions={forecast.regions} day={day} />
    <label>Day {day}<input type="range" min="0" max={forecast.days.length - 1} value={day} onChange={e => setDay(Number(e.target.value))} /></label>
  </main>;
}
