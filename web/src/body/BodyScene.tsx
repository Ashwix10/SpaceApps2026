import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh } from 'three';
import type { BodyTwinProps, RegionId } from '../types';
import { healthColor, theme } from '../theme';
import { regionAt, surfaceRegions } from './regions';

function HumanBody({ regions, day, injuredRegion, selectedRegion, onRegionSelect, onHover }: BodyTwinProps & {
  onHover: (region: RegionId | null) => void;
}) {
  const mesh = useRef<Mesh>(null);
  const { scene } = useGLTF('/models/human-reference.glb?reference=male-v1');
  const [hovered, setHovered] = useState<RegionId | null>(null);
  const surface = useMemo(() => {
    let source: BufferGeometry | undefined;
    scene.traverse(object => { if (object instanceof Mesh) source = object.geometry; });
    if (!source) throw new Error('Human surface missing');
    const geometry = source.clone();
    const original = new Float32Array(geometry.getAttribute('position').array);
    const colors = new Float32Array(original.length).fill(0.7);
    geometry.setAttribute('color', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage));
    (geometry.getAttribute('position') as BufferAttribute).setUsage(DynamicDrawUsage);
    const regionIndices = new Uint8Array(original.length / 3);
    for (let i = 0; i < regionIndices.length; i++) regionIndices[i] = surfaceRegions.indexOf(regionAt(original[i * 3], original[i * 3 + 1], original[i * 3 + 2]));
    return { geometry, original, regionIndices, colorTargets: colors.slice(), positionTargets: original.slice(), changing: false };
  }, [scene]);
  useEffect(() => () => surface.geometry.dispose(), [surface]);
  useEffect(() => {
    const palette = surfaceRegions.map(id => {
      const color = new Color(healthColor(regions[id]?.[day] ?? 1));
      if (selectedRegion && selectedRegion !== id) color.multiplyScalar(0.58);
      else if (hovered === id || selectedRegion === id) color.lerp(new Color('#FFFFFF'), 0.22);
      if (injuredRegion === id && (regions[id]?.[day] ?? 1) < 0.9) color.lerp(new Color(theme.danger), 0.12);
      return color;
    });
    for (let i = 0; i < surface.regionIndices.length; i++) {
      const index = i * 3;
      const color = palette[surface.regionIndices[i]];
      surface.colorTargets.set([color.r, color.g, color.b], index);
      // Keep the modeled anatomy intact. Color indicates change; it is not a body scan.
      surface.positionTargets[index] = surface.original[index];
      surface.positionTargets[index + 1] = surface.original[index + 1];
      surface.positionTargets[index + 2] = surface.original[index + 2];
    }
    surface.changing = true;
  }, [regions, day, selectedRegion, hovered, injuredRegion, surface]);
  useFrame((_, delta) => {
    if (!surface.changing) return;
    const colors = surface.geometry.getAttribute('color');
    const positions = surface.geometry.getAttribute('position');
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 14);
    let difference = 0;
    for (let i = 0; i < surface.colorTargets.length; i++) {
      const colorDelta = surface.colorTargets[i] - colors.array[i];
      const positionDelta = surface.positionTargets[i] - positions.array[i];
      colors.array[i] += colorDelta * blend;
      positions.array[i] += positionDelta * blend;
      difference = Math.max(difference, Math.abs(colorDelta), Math.abs(positionDelta));
    }
    colors.needsUpdate = true; positions.needsUpdate = true;
    surface.changing = difference > 0.001;
  });
  function hitRegion(event: ThreeEvent<PointerEvent | MouseEvent>) {
    const point = mesh.current!.worldToLocal(event.point.clone());
    return regionAt(point.x, point.y, point.z);
  }
  return <mesh ref={mesh} geometry={surface.geometry}
    onClick={event => { if (event.delta > 5) return; event.stopPropagation(); const id = hitRegion(event); onRegionSelect?.(selectedRegion === id ? null : id); }}
    onPointerMove={event => { event.stopPropagation(); const id = hitRegion(event); setHovered(id); onHover(id); }}
    onPointerOut={() => { setHovered(null); onHover(null); }}>
    <meshStandardMaterial vertexColors roughness={0.64} metalness={0.025} emissive="#FFFFFF" emissiveIntensity={0.008} />
  </mesh>;
}

export function BodyScene(props: BodyTwinProps & { onHover: (region: RegionId | null) => void }) {
  const [rotating, setRotating] = useState(false);
  const { camera, size } = useThree();
  const isComparison = Boolean(props.compareRegions);
  const aspect = size.width / Math.max(1, size.height);
  const fittedDistance = Math.max(5.9, (isComparison ? 6.8 : 3.8) / aspect);
  useEffect(() => {
    camera.position.set(0, 1.65, fittedDistance);
    camera.updateProjectionMatrix();
  }, [camera, fittedDistance]);
  const bodies = props.compareRegions ? [props.regions, props.compareRegions] : [props.regions];
  return <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[-3, 5, 5]} intensity={2.1} color="#FFFFFF" />
    <directionalLight position={[4, 2, 3]} intensity={0.5} color="#FFFFFF" />
    <directionalLight position={[0, 4, -4]} intensity={1.35} color="#FFFFFF" />
    {bodies.map((regions, i) => <group key={i} position={[bodies.length === 1 ? 0 : i ? 1.05 : -1.05, 0, 0]} scale={bodies.length === 1 ? 1 : 0.9}>
      <HumanBody {...props} regions={regions} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.009, 0.06]}>
        <circleGeometry args={[0.43, 64]} /><meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <ringGeometry args={[0.65, 0.654, 64]} /><meshBasicMaterial color="#8A8A8D" transparent opacity={0.2} />
      </mesh>
    </group>)}
    <OrbitControls target={[0, 1.52, 0]} enablePan={false} minDistance={3.8} maxDistance={Math.max(8, fittedDistance + 1)}
      minPolarAngle={0.8} maxPolarAngle={1.9} autoRotate={rotating && !window.matchMedia('(prefers-reduced-motion: reduce)').matches} autoRotateSpeed={0.25}
      onStart={() => setRotating(false)} onEnd={() => setRotating(false)} />
  </>;
}
