import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { Group, Mesh } from 'three'

/**
 * The looping "order packing" diorama:
 * artisan products float in, drop into a kraft box, flaps close,
 * a gold band seals it and the parcel ships away — then it loops (~7s).
 * Fully deterministic (all transforms derive from clock time).
 */

const DURATION = 7 // seconds

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

interface ProdDef {
  start: [number, number, number]
  hover: [number, number, number]
  inside: [number, number, number]
  approach: [number, number] // t-window
  drop: [number, number]
  spin: number
}

const PRODUCTS: ProdDef[] = [
  { start: [-5.2, 2.6, 0.4], hover: [-0.78, 1.7, 0], inside: [-0.45, -1.02, 0.1], approach: [0.05, 0.26], drop: [0.40, 0.54], spin: 0.7 },
  { start: [5.4, -1.8, 0.6], hover: [0.78, 1.7, 0], inside: [0.45, -1.02, 0.1], approach: [0.12, 0.33], drop: [0.47, 0.61], spin: -0.9 },
  { start: [-5.6, -2.2, 0.2], hover: [-0.26, 1.8, 0], inside: [0, -1.0, -0.15], approach: [0.19, 0.40], drop: [0.54, 0.68], spin: 1.1 },
  { start: [5.2, 2.9, 0], hover: [0.26, 1.8, 0], inside: [0.12, -1.05, 0.2], approach: [0.26, 0.47], drop: [0.61, 0.75], spin: -0.6 },
]

function ProductMesh({ kind }: { kind: number }) {
  switch (kind % 4) {
    case 0: // terracotta pot
      return (
        <group>
          <mesh scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.30, 24, 24]} />
            <meshStandardMaterial color="#b4552d" roughness={0.75} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.19, 0.16, 0.1, 20]} />
            <meshStandardMaterial color="#8a3c1e" roughness={0.8} />
          </mesh>
        </group>
      )
    case 1: // book
      return (
        <group rotation={[0.2, 0.3, 0.1]}>
          <mesh>
            <boxGeometry args={[0.5, 0.62, 0.14]} />
            <meshStandardMaterial color="#0f766e" roughness={0.45} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0, 0.085]}>
            <boxGeometry args={[0.36, 0.44, 0.02]} />
            <meshStandardMaterial color="#d9a441" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      )
    case 2: // bangle set
      return (
        <group rotation={[0.6, 0, 0.4]}>
          <mesh>
            <torusGeometry args={[0.24, 0.045, 18, 48]} />
            <meshStandardMaterial color="#d9a441" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0.05, 0.03, 0.05]}>
            <torusGeometry args={[0.19, 0.04, 18, 48]} />
            <meshStandardMaterial color="#a4123f" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      )
    default: // herb jar
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.42, 22]} />
            <meshStandardMaterial color="#5d7a4a" roughness={0.5} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.14, 18]} />
            <meshStandardMaterial color="#d9a441" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      )
  }
}

function Diorama() {
  const root = useRef<Group>(null)
  const boxGroup = useRef<Group>(null)
  const productRefs = useRef<Array<Group | null>>([])
  const backFlap = useRef<Group>(null)
  const frontFlap = useRef<Group>(null)
  const ribbonV = useRef<Mesh>(null)
  const ribbonH = useRef<Mesh>(null)

  useFrame((state) => {
    const t = (state.clock.elapsedTime % DURATION) / DURATION

    // whole package: grow in, bounce on close, shrink away at loop end
    if (boxGroup.current) {
      let scale = 1
      if (t < 0.05) scale = easeOutBack(clamp01(t / 0.05))
      else if (t > 0.93) scale = Math.max(0.001, 1 - easeInOut(clamp01((t - 0.93) / 0.07)))
      const bounce = t > 0.82 && t < 0.9 ? 1 + Math.sin((t - 0.82) * Math.PI / 0.08) * 0.04 : 1
      boxGroup.current.scale.setScalar(scale * bounce)
      boxGroup.current.position.y = t > 0.93 ? easeInOut(clamp01((t - 0.93) / 0.07)) * 1.4 : 0
    }

    // flaps close between 0.76 → 0.86
    const closeT = easeInOut(clamp01((t - 0.76) / 0.1))
    if (backFlap.current) backFlap.current.rotation.x = -2.35 + closeT * 2.3
    if (frontFlap.current) frontFlap.current.rotation.x = 2.35 - closeT * 2.3

    // gold sealing band appears 0.86 → 0.93
    const bandT = clamp01((t - 0.86) / 0.07)
    const bandS = bandT === 0 ? 0.0001 : easeOutBack(bandT)
    ribbonV.current?.scale.set(1, bandS, 1)
    ribbonH.current?.scale.set(bandS, 1, 1)

    // products
    PRODUCTS.forEach((def, i) => {
      const g = productRefs.current[i]
      if (!g) return
      const [a0, a1] = def.approach
      const [d0, d1] = def.drop
      let pos: [number, number, number]
      let scale = 1
      if (t < a0) pos = def.start
      else if (t < a1) {
        const p = easeInOut((t - a0) / (a1 - a0))
        pos = [
          def.start[0] + (def.hover[0] - def.start[0]) * p,
          def.start[1] + (def.hover[1] - def.start[1]) * p + Math.sin(p * Math.PI) * 0.5,
          def.start[2] + (def.hover[2] - def.start[2]) * p,
        ]
      } else if (t < d0) {
        pos = [def.hover[0], def.hover[1] + Math.sin((t - a1) * 9) * 0.06, def.hover[2]]
      } else if (t < d1) {
        const p = easeInOut((t - d0) / (d1 - d0))
        pos = [
          def.hover[0] + (def.inside[0] - def.hover[0]) * p,
          def.hover[1] + (def.inside[1] - def.hover[1]) * p * p, // accelerating fall
          def.hover[2] + (def.inside[2] - def.hover[2]) * p,
        ]
        scale = 1 - 0.25 * p
      } else {
        pos = def.inside
        scale = 0.75
      }
      // reset visibility for next loop
      if (t < a0) g.visible = true
      g.position.set(...pos)
      g.scale.setScalar(scale)
      g.rotation.y = def.spin * state.clock.elapsedTime * (t < d1 ? 1 : 0) + (t < d1 ? 0 : def.spin)
      g.rotation.x = Math.sin(state.clock.elapsedTime * 1.4 + i) * (t < d1 ? 0.25 : 0)
    })

    // gentle overall sway
    if (root.current) {
      root.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.08
      root.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.03
    }
  })

  return (
    <group ref={root}>
      <group ref={boxGroup} position={[0, -0.4, 0]}>
        {/* kraft box */}
        <group>
          {/* bottom + 4 walls */}
          <mesh position={[0, -0.81, 0]}>
            <boxGeometry args={[1.5, 0.06, 1.1]} />
            <meshStandardMaterial color="#c79a6b" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.5, -0.55]}>
            <boxGeometry args={[1.5, 0.62, 0.06]} />
            <meshStandardMaterial color="#c79a6b" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.5, 0.55]}>
            <boxGeometry args={[1.5, 0.62, 0.06]} />
            <meshStandardMaterial color="#b98b5d" roughness={0.85} />
          </mesh>
          <mesh position={[-0.75, -0.5, 0]}>
            <boxGeometry args={[0.06, 0.62, 1.1]} />
            <meshStandardMaterial color="#b98b5d" roughness={0.85} />
          </mesh>
          <mesh position={[0.75, -0.5, 0]}>
            <boxGeometry args={[0.06, 0.62, 1.1]} />
            <meshStandardMaterial color="#c79a6b" roughness={0.85} />
          </mesh>

          {/* flaps */}
          <group ref={backFlap} position={[0, -0.18, -0.55]}>
            <mesh position={[0, 0, 0.55]}>
              <boxGeometry args={[1.5, 0.05, 1.1]} />
              <meshStandardMaterial color="#cfa478" roughness={0.85} />
            </mesh>
          </group>
          <group ref={frontFlap} position={[0, -0.18, 0.55]}>
            <mesh position={[0, 0, -0.55]}>
              <boxGeometry args={[1.5, 0.05, 1.1]} />
              <meshStandardMaterial color="#cfa478" roughness={0.85} />
            </mesh>
          </group>

          {/* gold seal band */}
          <mesh ref={ribbonV} position={[0, -0.5, 0]} scale={[1, 0.0001, 1]}>
            <boxGeometry args={[1.56, 0.66, 0.12]} />
            <meshStandardMaterial color="#d9a441" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh ref={ribbonH} position={[0, -0.5, 0]} scale={[0.0001, 1, 1]}>
            <boxGeometry args={[0.12, 0.66, 1.16]} />
            <meshStandardMaterial color="#d9a441" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>

        {/* floating products */}
        {PRODUCTS.map((def, i) => (
          <group key={i} ref={(el) => { productRefs.current[i] = el }} position={def.start}>
            <ProductMesh kind={i} />
          </group>
        ))}
      </group>

      {/* soft grounding shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.32, 0]}>
        <circleGeometry args={[1.7, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>

      <Sparkles count={36} scale={[4.5, 3, 2]} position={[0, 0.4, 0.6]} size={3.2} speed={0.5} color="#d9a441" opacity={0.6} />
    </group>
  )
}

export default function PackingScene({ active = true }: { active?: boolean }) {
  const memo = useMemo(() => <Diorama />, [])
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.5, 5.6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 6, 4]} intensity={1.25} color="#fff1d6" />
      <pointLight position={[-4, 2, 3]} intensity={18} color="#d9a441" distance={16} />
      <pointLight position={[4, -1, 3]} intensity={12} color="#2dd4bf" distance={16} />
      {memo}
    </Canvas>
  )
}
