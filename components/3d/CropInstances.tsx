'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Yield data ─────────────────────────────────────────────────────────
export const YIELD_ZONES = [
  { x: -3, z: -3, yield: 52, health: 'excellent' as const },
  { x:  0, z: -3, yield: 48, health: 'good'      as const },
  { x:  3, z: -3, yield: 38, health: 'moderate'  as const },
  { x: -3, z:  0, yield: 45, health: 'good'      as const },
  { x:  0, z:  0, yield: 55, health: 'excellent' as const },
  { x:  3, z:  0, yield: 32, health: 'poor'      as const },
  { x: -3, z:  3, yield: 42, health: 'moderate'  as const },
  { x:  3, z:  3, yield: 28, health: 'poor'      as const },
]

const HEALTH_COLORS: Record<string, string> = {
  excellent: '#10b981', // Emerald
  good:      '#34d399', // Light emerald
  moderate:  '#fbbf24', // Amber
  poor:      '#ef4444', // Red
}

type Health = 'excellent' | 'good' | 'moderate' | 'poor'
interface ZoneInstance { x: number; z: number; targetH: number }

function pointInPolygon(point: number[], vs: number[][]) {
  let x = point[0], y = point[1]
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1]
    let xj = vs[j][0], yj = vs[j][1]
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// ── One InstancedMesh per health category ─────────────────────────────
function HealthMesh({ color, items, progressRef }: { color: string, items: ZoneInstance[], progressRef: React.RefObject<number> }) {
  const ref   = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    progressRef.current = Math.min(progressRef.current + delta * 1.2, 1)
    const ease = 1 - Math.pow(1 - progressRef.current, 3) 
    if (!ref.current) return

    items.forEach((item, i) => {
      const h = Math.max(item.targetH * ease, 0.001)
      dummy.position.set(item.x, h / 2, item.z)
      dummy.scale.set(1, h, 1)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  if (items.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </instancedMesh>
  )
}

// ── Main export: Feature 8 ─────────────────────────────────────────────
export function CropInstances({ 
  visible, 
  boundaryCoords, 
  center 
}: { 
  visible: boolean
  boundaryCoords?: [number, number][]
  center?: [number, number]
}) {
  const progressRef = useRef(0)

  const categorized = useMemo(() => {
    const cats: Record<Health, ZoneInstance[]> = {
      excellent: [], good: [], moderate: [], poor: [],
    }

    // Pre-calculate boundary in 3D space
    let bounds: number[][] | null = null
    if (boundaryCoords && center && boundaryCoords.length > 2) {
      bounds = boundaryCoords.map(c => [
        ((c[0] - center[1]) / 0.01) * 5,
        -((c[1] - center[0]) / 0.01) * 5
      ])
    }

    // Grid spacing for neat rows
    const spacingX = 0.15
    const spacingZ = 0.15

    for (let x = -4.5; x <= 4.5; x += spacingX) {
      for (let z = -4.5; z <= 4.5; z += spacingZ) {
        
        // Skip if outside farm polygon
        if (bounds && !pointInPolygon([x, z], bounds)) continue

        // IDW interpolation to find local yield (simplified nearest for now)
        let bestDist = Infinity
        let yieldVal = 40
        let healthZone: Health = 'moderate'

        for (const zone of YIELD_ZONES) {
          const dx = x - zone.x
          const dz = z - zone.z
          const distSq = dx*dx + dz*dz
          if (distSq < bestDist) {
            bestDist = distSq
            yieldVal = (zone as any).yield || (zone as any).pointH || 40
            healthZone = zone.health
          }
        }

        // Deterministic variation based on position (avoids re-render jitter)
        const seed  = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
        const seed2 = Math.sin(x * 269.5 + z * 183.3) * 43758.5453
        const seed3 = Math.sin(x * 419.2 + z * 371.9) * 43758.5453
        const jitterX = ((seed  - Math.floor(seed))  - 0.5) * 0.04
        const jitterZ = ((seed2 - Math.floor(seed2)) - 0.5) * 0.04
        const targetH = (yieldVal / 20) * (0.8 + (seed3 - Math.floor(seed3)) * 0.4)

        cats[healthZone].push({
          x: x + jitterX,
          z: z + jitterZ,
          targetH,
        })
      }
    }
    return cats
  }, [boundaryCoords, center])

  if (!visible) return null

  return (
    <group>
      {(Object.keys(categorized) as Health[]).map((h) => (
        <HealthMesh key={h} color={HEALTH_COLORS[h]} items={categorized[h]} progressRef={progressRef} />
      ))}
    </group>
  )
}
