import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, OrbitControls, useGLTF } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Mesh } from 'three';
import type { BodyTwinProps, RegionId } from '../types';
import { regionAt, surfaceRegions } from './regions';
import { regionColors, systemColors } from './metrics';
import type { ActiveInjury } from './injury';

function HumanBody({ regions, day, selectedRegion, onRegionSelect, onHover }: BodyTwinProps & {
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
      const color = new Color(regionColors[id]);
      color.multiplyScalar(0.72 + Math.min(1, Math.max(0, regions[id]?.[day] ?? 1)) * 0.28);
      if (selectedRegion && selectedRegion !== id) color.multiplyScalar(0.62);
      else if (hovered === id || selectedRegion === id) color.lerp(new Color('#FFFFFF'), 0.4);
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
  }, [regions, day, selectedRegion, hovered, surface]);
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
    <meshStandardMaterial vertexColors roughness={0.5} metalness={0.06} transparent opacity={0.7} depthWrite={false} emissive="#8DCEC8" emissiveIntensity={0.025} />
  </mesh>;
}

function InteriorAnatomy({ selectedRegion, onRegionSelect, onHover }: BodyTwinProps & { onHover: (region: RegionId | null) => void }) {
  const interaction = (id: RegionId) => ({
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onRegionSelect?.(selectedRegion === id ? null : id); },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onHover(id); },
    onPointerOut: () => onHover(null),
  });
  return <group>
    {[-1, 1].map(side => <mesh key={side} position={[side * .14, 2.24, .12]} scale={[.105, .18, .065]} {...interaction('chest')}>
      <sphereGeometry args={[1, 24, 24]} /><meshStandardMaterial color={systemColors.cardio} transparent opacity={.55} roughness={.5} emissive={systemColors.cardio} emissiveIntensity={selectedRegion === 'chest' ? .35 : .08} />
    </mesh>)}
    <group position={[.075, 2.21, .2]} rotation={[0, 0, -.18]} {...interaction('heart')}>
      <mesh scale={[.075, .1, .055]}><sphereGeometry args={[1, 24, 24]} /><meshStandardMaterial color="#F2847D" emissive="#F2847D" emissiveIntensity={selectedRegion === 'heart' ? .65 : .2} roughness={.4} /></mesh>
      <mesh position={[-.025, .07, 0]} rotation={[0, 0, -.28]}><cylinderGeometry args={[.013, .016, .085, 12]} /><meshStandardMaterial color="#FFB2A8" /></mesh>
    </group>
    <group {...interaction('spine')}>
      {Array.from({ length: 9 }, (_, index) => <mesh key={index} position={[0, 1.8 + index * .039, .155]}>
        <boxGeometry args={[.07, .026, .035]} /><meshStandardMaterial color={systemColors.spine} emissive={systemColors.spine} emissiveIntensity={selectedRegion === 'spine' ? .6 : .18} roughness={.5} />
      </mesh>)}
    </group>
    <group {...interaction('pelvis')}>
      {[-1, 1].map(side => <mesh key={side} position={[side * .13, 1.68, .09]} scale={[1, 1.2, .55]} rotation={[.1, 0, side * .3]}>
        <torusGeometry args={[.12, .045, 16, 32]} /><meshStandardMaterial color={systemColors.hip} emissive={systemColors.hip} emissiveIntensity={selectedRegion === 'pelvis' ? .4 : .1} roughness={.65} />
      </mesh>)}
    </group>
  </group>;
}

function InjuryRing({ injury }: { injury: ActiveInjury }) {
  const side = injury.side === 'left' ? 1 : -1;
  const position: [number, number, number] = injury.type === 'ankle_sprain' ? [side * .17, .2, .1]
    : injury.type === 'wrist_fracture' ? [side * .72, 1.38, .12]
    : injury.type === 'thigh_muscle_tear' ? [side * .18, 1.2, .2] : [0, 1.91, .2];
  return <Billboard position={position}>
    <mesh renderOrder={20}><ringGeometry args={[.125, .139, 48]} /><meshBasicMaterial color="#FFC18D" depthTest={false} depthWrite={false} /></mesh>
    <mesh renderOrder={21}><ringGeometry args={[.097, .103, 48]} /><meshBasicMaterial color="#F18E80" depthTest={false} depthWrite={false} /></mesh>
    <mesh position={[0, .025, 0]} renderOrder={22}><planeGeometry args={[.014, .07]} /><meshBasicMaterial color="#FFE3BE" depthTest={false} depthWrite={false} /></mesh>
    <mesh position={[0, -.037, 0]} renderOrder={22}><circleGeometry args={[.009, 12]} /><meshBasicMaterial color="#FFE3BE" depthTest={false} depthWrite={false} /></mesh>
  </Billboard>;
}

export function BodyScene(props: BodyTwinProps & { onHover: (region: RegionId | null) => void; activeInjury?: ActiveInjury | null }) {
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
      <InteriorAnatomy {...props} />
      {props.activeInjury && <InjuryRing injury={props.activeInjury} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.009, 0.06]}>
        <circleGeometry args={[0.43, 64]} /><meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <ringGeometry args={[0.65, 0.654, 64]} /><meshBasicMaterial color={systemColors.muscle} transparent opacity={0.3} />
      </mesh>
    </group>)}
    <OrbitControls target={[0, 1.52, 0]} enablePan={false} minDistance={3.8} maxDistance={Math.max(8, fittedDistance + 1)}
      minPolarAngle={0.8} maxPolarAngle={1.9} autoRotate={rotating && !window.matchMedia('(prefers-reduced-motion: reduce)').matches} autoRotateSpeed={0.25}
      onStart={() => setRotating(false)} onEnd={() => setRotating(false)} />
  </>;
}
