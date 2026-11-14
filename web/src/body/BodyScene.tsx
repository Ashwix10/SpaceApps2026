import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, Group, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { BodyTwinProps, RegionId } from '../types';
import { healthColor } from '../theme';

type Segment = { position: [number, number, number]; scale: [number, number, number]; sphere?: boolean };
const anatomy: { id: RegionId; position: [number, number, number]; parts: Segment[] }[] = [
  { id: 'head_neck', position: [0, 2.76, 0], parts: [
    { position: [0, 0.1, 0], scale: [0.22, 0.29, 0.23], sphere: true },
    { position: [0, -0.24, 0], scale: [0.095, 0.12, 0.095] },
  ] },
  { id: 'chest', position: [0, 2.04, 0], parts: [{ position: [0, 0, 0], scale: [0.42, 0.47, 0.23] }] },
  { id: 'heart', position: [0.12, 2.17, 0.24], parts: [{ position: [0, 0, 0], scale: [0.1, 0.13, 0.09], sphere: true }] },
  { id: 'spine', position: [0, 1.98, 0.15], parts: Array.from({ length: 8 }, (_, i) => ({ position: [0, -0.39 + i * 0.105, 0] as [number, number, number], scale: [0.055, 0.045, 0.06] as [number, number, number], sphere: true })) },
  { id: 'pelvis', position: [0, 1.39, 0], parts: [{ position: [0, 0, 0], scale: [0.32, 0.2, 0.21] }] },
  ...(['left', 'right'] as const).map((side, index) => ({ id: `${side}_arm` as RegionId,
    position: [(index ? -1 : 1) * 0.59, 1.95, 0] as [number, number, number], parts: [
      { position: [0, 0.05, 0] as [number, number, number], scale: [0.12, 0.33, 0.12] as [number, number, number] },
      { position: [0, -0.51, 0.02] as [number, number, number], scale: [0.09, 0.28, 0.09] as [number, number, number] },
      { position: [0, -0.83, 0.02] as [number, number, number], scale: [0.085, 0.12, 0.06] as [number, number, number], sphere: true },
    ] })),
  ...(['left', 'right'] as const).map((side, index) => ({ id: `${side}_leg` as RegionId,
    position: [(index ? -1 : 1) * 0.2, 0.79, 0] as [number, number, number], parts: [
      { position: [0, 0.13, 0] as [number, number, number], scale: [0.15, 0.36, 0.15] as [number, number, number] },
      { position: [0, -0.43, 0] as [number, number, number], scale: [0.105, 0.3, 0.105] as [number, number, number] },
      { position: [0, -0.72, 0.09] as [number, number, number], scale: [0.11, 0.09, 0.22] as [number, number, number], sphere: true },
    ] })),
];

function Region({ shape, value, selected, injured, onSelect, onHover }: {
  shape: typeof anatomy[number]; value: number; selected: boolean; injured: boolean;
  onSelect: () => void; onHover: (id: RegionId | null) => void;
}) {
  const group = useRef<Group>(null);
  const pulse = useRef<MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const color = useMemo(() => new Color(healthColor(value)), [value]);
  const material = useMemo(() => new MeshStandardMaterial({ color: '#3B82F6', emissive: '#3B82F6', emissiveIntensity: 0.45,
    metalness: 0.45, roughness: 0.32, transparent: true, opacity: shape.id === 'chest' ? 0.3 : 0.76, depthWrite: false }), [shape.id]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 10);
    material.color.lerp(color, ease); material.emissive.copy(material.color);
    material.emissiveIntensity = hover || selected ? 1 : 0.45;
    if (group.current) {
      const thickness = /arm|leg|chest/.test(shape.id) ? 0.85 + 0.15 * value : 1;
      group.current.scale.x += (thickness - group.current.scale.x) * ease;
      group.current.scale.z += (thickness - group.current.scale.z) * ease;
    }
    if (pulse.current) pulse.current.opacity = 0.4 + 0.35 * Math.sin(clock.elapsedTime * 4);
  });
  return <group ref={group} position={shape.position}
    onClick={e => { e.stopPropagation(); onSelect(); }}
    onPointerOver={e => { e.stopPropagation(); setHover(true); onHover(shape.id); }}
    onPointerOut={() => { setHover(false); onHover(null); }}>
    {shape.parts.map((part, i) => <group key={i} position={part.position} scale={part.scale}>
      <mesh><sphereGeometry args={[1, 20, 16]} /><primitive object={material} attach="material" /></mesh>
      <mesh scale={1.035}><sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color={selected || hover ? '#D9FAFF' : '#4FD1FF'} wireframe transparent opacity={selected || hover ? 0.65 : 0.08} depthWrite={false} />
      </mesh>
    </group>)}
    {injured && <mesh position={[0, shape.id.endsWith('leg') ? -0.52 : 0, 0.28]}>
      <torusGeometry args={[0.23, 0.012, 8, 48]} /><meshBasicMaterial ref={pulse} color="#EF4444" transparent depthWrite={false} />
    </mesh>}
  </group>;
}

export function BodyScene({ regions, day, compareRegions, injuredRegion, selectedRegion, onRegionSelect, onHover }: BodyTwinProps & { onHover: (id: RegionId | null) => void }) {
  const [rotating, setRotating] = useState(true);
  const bodies = compareRegions ? [regions, compareRegions] : [regions];
  return <>
    <ambientLight intensity={1.1} /><directionalLight position={[3, 5, 5]} intensity={2} color="#B6EDFF" />
    <pointLight position={[-3, 2, -2]} intensity={10} color="#2864D7" />
    {bodies.map((data, i) => <group key={i} position={[bodies.length === 1 ? 0 : i ? 0.85 : -0.85, 0, 0]} scale={bodies.length === 1 ? 1 : 0.88}>
      {anatomy.map(shape => <Region key={shape.id} shape={shape} value={data[shape.id]?.[day] ?? 1}
        selected={selectedRegion === shape.id} injured={injuredRegion === shape.id}
        onSelect={() => onRegionSelect?.(selectedRegion === shape.id ? null : shape.id)} onHover={onHover} />)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[0.7, 0.71, 64]} /><meshBasicMaterial color="#4FD1FF" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[0.85, 0.855, 64]} /><meshBasicMaterial color="#4FD1FF" transparent opacity={0.12} />
      </mesh>
    </group>)}
    <OrbitControls target={[0, 1.4, 0]} enablePan={false} minDistance={4} maxDistance={8}
      minPolarAngle={0.8} maxPolarAngle={1.9} autoRotate={rotating} autoRotateSpeed={0.35}
      onStart={() => setRotating(false)} onEnd={() => setRotating(true)} />
  </>;
}
