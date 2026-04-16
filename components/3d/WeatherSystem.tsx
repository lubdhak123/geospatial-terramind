'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface WeatherConfig {
  type: 'clear' | 'rain' | 'drizzle' | 'drought'
  intensity: number // 0-1
}

// ── Rain particles (Feature 7) ────────────────────────────────────────
function RainParticles({ intensity }: { intensity: number }) {
  const COUNT = 2000
  const ref   = useRef<THREE.Points>(null!)

  const { geo, posArray } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = 3 + Math.random() * 5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geo: g, posArray: pos }
  }, [])

  useFrame(() => {
    for (let i = 0; i < COUNT; i++) {
      posArray[i * 3 + 1] -= 0.08 * intensity
      if (posArray[i * 3 + 1] < -0.5) {
        posArray[i * 3]     = (Math.random() - 0.5) * 10
        posArray[i * 3 + 1] = 8
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 10
      }
    }
    ;(geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#aaccff"
        size={0.025}
        transparent
        opacity={0.55 * intensity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ── Drought heat haze (Feature 7) ────────────────────────────────────
function DroughtOverlay({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta * 0.4
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.06 + Math.sin(t.current) * 0.02 * intensity
    }
  })

  return (
    <mesh ref={ref} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial
        color="#ffcc44"
        transparent
        opacity={0.07 * intensity}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Main export ────────────────────────────────────────────────────────
export function WeatherSystem({ type, intensity }: WeatherConfig) {
  if (type === 'clear') return null

  if (type === 'rain')    return <RainParticles intensity={intensity} />
  if (type === 'drizzle') return <RainParticles intensity={intensity * 0.4} />
  if (type === 'drought') return <DroughtOverlay intensity={intensity} />

  return null
}
