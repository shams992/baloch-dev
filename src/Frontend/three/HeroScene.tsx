import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import type { Group } from 'three'

/**
 * Hero background: floating Balochi-inspired geometry — octagram motifs,
 * embroidery diamonds, rings and particles in gold / teal / crimson.
 * Subtle by design; the foreground text stays readable.
 */

const GOLD = '#d9a441'
const TEAL = '#2dd4bf'
const CRIMSON = '#c24364'

function Octagram({ position, size = 0.7, color = GOLD, speed = 1 }: { position: [number, number, number]; size?: number; color?: string; speed?: number }) {
  const g = useRef<Group>(null)
  useFrame((state) => {
    if (!g.current) return
    g.current.rotation.z = state.clock.elapsedTime * 0.18 * speed
    g.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 * speed) * 0.3
  })
  return (
    <group ref={g} position={position}>
      <mesh>
        <boxGeometry args={[size, size, 0.02]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[size, size, 0.02]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 0.12, 16, 16]} />
        <meshStandardMaterial color={TEAL} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function Scene() {
  const parallax = useRef<Group>(null)
  useFrame((state) => {
    if (!parallax.current) return
    const t = state.clock.elapsedTime
    parallax.current.rotation.y += (state.pointer.x * 0.16 - parallax.current.rotation.y) * 0.04
    parallax.current.rotation.x += (-state.pointer.y * 0.08 - parallax.current.rotation.x) * 0.04
    parallax.current.position.y = Math.sin(t * 0.4) * 0.12
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 7, 4]} intensity={1.1} color="#fff3dd" />
      <pointLight position={[-7, 2, 2]} intensity={26} color={GOLD} distance={20} />
      <pointLight position={[7, -1, 3]} intensity={22} color={TEAL} distance={20} />

      <group ref={parallax}>
        {/* large octagram anchors */}
        <Float speed={1.1} rotationIntensity={0.4} floatIntensity={1.1}>
          <Octagram position={[-4.6, 1.4, -2]} size={1.5} color={GOLD} speed={0.7} />
        </Float>
        <Float speed={0.9} rotationIntensity={0.4} floatIntensity={1.3}>
          <Octagram position={[4.8, -1.2, -1.5]} size={1.2} color={CRIMSON} speed={-0.6} />
        </Float>
        <Float speed={1.3} rotationIntensity={0.5} floatIntensity={0.9}>
          <Octagram position={[3.6, 2.4, -3]} size={0.8} color={TEAL} speed={1.1} />
        </Float>

        {/* embroidery diamonds */}
        <Float speed={1.6} floatIntensity={1.6}>
          <mesh position={[-2.6, -2.2, -1]} scale={[1, 1.5, 1]}>
            <octahedronGeometry args={[0.45]} />
            <meshStandardMaterial color={CRIMSON} metalness={0.5} roughness={0.35} transparent opacity={0.92} flatShading />
          </mesh>
        </Float>
        <Float speed={1.2} floatIntensity={1.2}>
          <mesh position={[5.6, 1.8, -2.5]} scale={[1, 1.4, 1]}>
            <octahedronGeometry args={[0.34]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} flatShading />
          </mesh>
        </Float>
        <Float speed={1.5} floatIntensity={1.5}>
          <mesh position={[-6.2, -0.4, -2.5]} scale={[1, 1.3, 1]}>
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial color={TEAL} metalness={0.7} roughness={0.25} flatShading />
          </mesh>
        </Float>

        {/* rings — bracelet / vessel motifs */}
        <Float speed={1} rotationIntensity={0.9} floatIntensity={1}>
          <mesh position={[0.4, 2.9, -4]} rotation={[Math.PI / 2.6, 0.3, 0]}>
            <torusGeometry args={[1.05, 0.045, 16, 72]} />
            <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.2} transparent opacity={0.85} />
          </mesh>
        </Float>
        <Float speed={0.8} rotationIntensity={0.7} floatIntensity={1.2}>
          <mesh position={[-3.4, 3, -4.5]} rotation={[Math.PI / 1.9, -0.4, 0.2]}>
            <torusGeometry args={[0.7, 0.035, 16, 64]} />
            <meshStandardMaterial color={TEAL} metalness={0.8} roughness={0.25} transparent opacity={0.7} />
          </mesh>
        </Float>
        <Float speed={1.4} rotationIntensity={0.8} floatIntensity={1}>
          <mesh position={[1.8, -2.7, -2]} rotation={[Math.PI / 2.2, 0, 0.4]}>
            <torusGeometry args={[0.5, 0.04, 14, 56]} />
            <meshStandardMaterial color={CRIMSON} metalness={0.7} roughness={0.3} transparent opacity={0.8} />
          </mesh>
        </Float>

        {/* small drifting beads */}
        {Array.from({ length: 10 }).map((_, i) => (
          <Float key={i} speed={1 + (i % 3) * 0.4} floatIntensity={2} rotationIntensity={1}>
            <mesh
              position={[(i % 2 ? 1 : -1) * (2.2 + (i * 0.7) % 4.5), ((i * 1.3) % 5.4) - 2.7, -1 - (i % 4)]}
            >
              <icosahedronGeometry args={[0.07 + (i % 3) * 0.035]} />
              <meshStandardMaterial color={i % 3 === 0 ? GOLD : i % 3 === 1 ? TEAL : '#ede3cf'} metalness={0.8} roughness={0.25} />
            </mesh>
          </Float>
        ))}
      </group>

      <Sparkles count={90} scale={[13, 7.5, 5]} position={[0, 0.5, 1]} size={2.4} speed={0.32} color={GOLD} opacity={0.5} />
      <Sparkles count={50} scale={[10, 6, 4]} position={[0, -1, 0]} size={1.6} speed={0.22} color={TEAL} opacity={0.4} />
    </>
  )
}

export default function HeroScene({ active = true }: { active?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={active ? 'always' : 'never'}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden
    >
      <Scene />
    </Canvas>
  )
}
