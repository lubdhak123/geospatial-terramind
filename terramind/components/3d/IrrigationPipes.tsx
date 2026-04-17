'use client'

/**
 * IrrigationPipes — physically embedded 3D pipe network for a 1×1 region cell.
 *
 * Layout: a grid of 3 horizontal + 3 vertical main runs with 3×3 lateral risers.
 * Pipes sit at terrainHeight - 0.02 so terrain slightly overlaps them.
 * Flow particles animate along active pipes. Click selects a pipe for detail.
 */

import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Types ────────────────────────────────────────────────────────────────

interface PipeSegment {
  id: string
  points: THREE.Vector3[]
  active: boolean    // is water flowing
  flowRate: number   // 0–1 (relative)
  blocked: boolean
  moistureContrib: number // 0–1
}

interface IrrigationPipesProps {
  /** Cell origin in 10×10 terrain space */
  cx: number
  cz: number
  /** Cell moisture (0–1) from fieldDataEngine — drives active-pipe count */
  moisture: number
  /** Irrigation urgency from analysis */
  irrigationUrgency: 'none' | 'schedule' | 'soon' | 'immediate'
  /** Whether the irrigation layer toggle is on */
  visible: boolean
  /** Which micro-cell (0-8 flat) is selected, null = none */
  selectedMicro: { r: number; c: number } | null
  /** Called when user clicks a pipe */
  onPipeClick?: (pipe: PipeSegment) => void
  /** Terrain sampler so the network can hug the displaced field surface */
  getTerrainHeight?: (x: number, z: number) => number
}

// ── Deterministic hash ────────────────────────────────────────────────────

function dHash(a: number, b: number, salt = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

// ── Build pipe network geometry ───────────────────────────────────────────

function buildPipeNetwork(
  cx: number,
  cz: number,
  moisture: number,
  getTerrainHeight?: (x: number, z: number) => number,
): PipeSegment[] {
  const pipes: PipeSegment[] = []
  const half = 0.5
  const terrainAt = (x: number, z: number) => (getTerrainHeight ? getTerrainHeight(x, z) : 0)
  const surfacePoint = (x: number, z: number, offset = 0.02) =>
    new THREE.Vector3(x, terrainAt(x, z) + offset, z)

  // ── 3 horizontal main runs (Z-axis aligned) ───────────────────────────
  for (let i = 0; i < 3; i++) {
    const xOff = -half + (i + 1) * (1 / 4) // 0.25, 0.5, 0.75 within cell
    const active = moisture > 0.25 + i * 0.1
    const blocked = dHash(cx + i, cz, 1) > 0.82
    pipes.push({
      id: `h${i}`,
      points: [
        surfacePoint(cx + xOff - half, cz - half + 0.05),
        surfacePoint(cx + xOff - half, cz - half + 0.5),
        surfacePoint(cx + xOff - half, cz + half - 0.05),
      ],
      active: active && !blocked,
      flowRate: active ? 0.4 + dHash(cx, i, 3) * 0.6 : 0,
      blocked,
      moistureContrib: (1 / 3) * moisture,
    })
  }

  // ── 3 vertical main runs (X-axis aligned) ────────────────────────────
  for (let j = 0; j < 3; j++) {
    const zOff = -half + (j + 1) * (1 / 4)
    const active = moisture > 0.30 + j * 0.08
    const blocked = dHash(cx, cz + j, 2) > 0.85
    pipes.push({
      id: `v${j}`,
      points: [
        surfacePoint(cx - half + 0.05, cz + zOff - half),
        surfacePoint(cx, cz + zOff - half),
        surfacePoint(cx + half - 0.05, cz + zOff - half),
      ],
      active: active && !blocked,
      flowRate: active ? 0.3 + dHash(cz, j, 5) * 0.5 : 0,
      blocked,
      moistureContrib: (1 / 3) * moisture,
    })
  }

  // ── 9 micro-riser stubs (short vertical drops at grid intersections) ──
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rx = cx - half + (c + 0.5) * (1 / 3)
      const rz = cz - half + (r + 0.5) * (1 / 3)
      const active = moisture > 0.35
      const stemBase = terrainAt(rx, rz) + 0.02
      pipes.push({
        id: `s${r}${c}`,
        points: [
          new THREE.Vector3(rx, stemBase - 0.02, rz),
          new THREE.Vector3(rx, stemBase, rz),
          new THREE.Vector3(rx, stemBase + 0.03, rz),
        ],
        active,
        flowRate: active ? 0.2 + dHash(r, c, 7) * 0.4 : 0,
        blocked: false,
        moistureContrib: moisture / 9,
      })
    }
  }

  return pipes
}

// ── Single pipe mesh ──────────────────────────────────────────────────────

interface PipeMeshProps {
  pipe: PipeSegment
  isSelected: boolean
  isHighlighted: boolean  // in selected micro region
  onClick: () => void
}

function PipeMesh({ pipe, isSelected, isHighlighted, onClick }: PipeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef  = useRef<THREE.MeshStandardMaterial>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const particlePosRef = useRef<Float32Array | null>(null)
  const curveRef = useRef<THREE.CatmullRomCurve3>(new THREE.CatmullRomCurve3(pipe.points))

  const baseRadius  = pipe.id.startsWith('s') ? 0.012 : 0.022
  const selectScale = isSelected ? 1.55 : 1.0

  // TubeGeometry — reuse cached curve
  const tubeGeo = useMemo(() => {
    curveRef.current = new THREE.CatmullRomCurve3(pipe.points)
    return new THREE.TubeGeometry(curveRef.current, 12, baseRadius * selectScale, 8, false)
  }, [pipe.points, baseRadius, selectScale])

  // Flow particle initial positions — along the same cached curve
  const { particleGeo, particleCount } = useMemo(() => {
    if (!pipe.active || pipe.id.startsWith('s')) {
      return { particleGeo: null, particleCount: 0 }
    }
    const count = 8
    const positions = new Float32Array(count * 3)
    particlePosRef.current = positions
    for (let i = 0; i < count; i++) {
      const p = curveRef.current.getPointAt(i / count)
      positions[i * 3]     = p.x
      positions[i * 3 + 1] = p.y + 0.001
      positions[i * 3 + 2] = p.z
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { particleGeo: geo, particleCount: count }
  }, [pipe.active, pipe.points, pipe.id])

  // Colors
  const activeColor  = pipe.blocked ? '#ef4444' : '#22d3ee'
  const inactiveColor = '#334155'
  const emissiveColor = pipe.blocked ? '#7f1d1d' : '#0e7490'

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (matRef.current) {
      // Pulse emissive on active pipes
      if (pipe.active && !pipe.blocked) {
        matRef.current.emissiveIntensity = 0.08 + Math.sin(t * 3 + pipe.flowRate * 10) * 0.05
      }
      // Selection glow
      if (isSelected) {
        matRef.current.emissiveIntensity = 0.25 + Math.sin(t * 4) * 0.08
      }
    }

    // Animate flow particles along curve (curve cached, not rebuilt per frame)
    if (particlesRef.current && particlePosRef.current && pipe.active) {
      const curve = curveRef.current
      const speed = pipe.flowRate * 0.18
      const buf = particlePosRef.current
      for (let i = 0; i < particleCount; i++) {
        const t0 = ((i / particleCount + t * speed) % 1 + 1) % 1
        const p = curve.getPointAt(t0)
        buf[i * 3]     = p.x
        buf[i * 3 + 1] = p.y + 0.004
        buf[i * 3 + 2] = p.z
      }
      const attr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      attr.array = buf
      attr.needsUpdate = true
    }
  })

  const opacity = isSelected ? 1.0 : isHighlighted ? 0.85 : pipe.active ? 0.55 : 0.22

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={tubeGeo}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { document.body.style.cursor = 'default' }}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          ref={matRef}
          color={pipe.active ? activeColor : inactiveColor}
          emissive={pipe.active ? emissiveColor : '#000000'}
          emissiveIntensity={pipe.active ? 0.1 : 0}
          metalness={0.25}
          roughness={0.70}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Trench darkening strip above the pipe */}
      {!pipe.id.startsWith('s') && (
        <mesh
          position={[
            (pipe.points[0].x + pipe.points[2].x) / 2,
            pipe.points[0].y + 0.001,
            (pipe.points[0].z + pipe.points[2].z) / 2,
          ]}
          rotation={[-Math.PI / 2, 0, pipe.id.startsWith('h') ? 0 : Math.PI / 2]}
        >
          <planeGeometry args={[0.9, 0.06]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}

      {/* Flow particles */}
      {particleGeo && pipe.active && (
        <points ref={particlesRef} geometry={particleGeo}>
          <pointsMaterial
            color="#67e8f9"
            size={0.018}
            transparent
            opacity={0.85}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  )
}

// ── Tooltip overlay (HTML-space rendered in 3D via drei Html, or plain mesh) ──

interface PipeTooltipProps {
  pipe: PipeSegment | null
  onClose: () => void
}

function PipeTooltipMesh({ pipe, onClose }: PipeTooltipProps) {
  // Billboard quad above the selected pipe mid-point
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  const tex = useMemo(() => {
    if (!pipe) return null
    const cv = document.createElement('canvas')
    cv.width = 256; cv.height = 128
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = 'rgba(3,13,26,0.92)'
    ctx.roundRect(0, 0, 256, 128, 12)
    ctx.fill()
    ctx.strokeStyle = pipe.blocked ? '#ef4444' : '#22d3ee'
    ctx.lineWidth = 2
    ctx.roundRect(1, 1, 254, 126, 11)
    ctx.stroke()

    ctx.fillStyle = pipe.blocked ? '#ef4444' : '#22d3ee'
    ctx.font = 'bold 13px monospace'
    ctx.fillText(pipe.blocked ? '⛔ BLOCKED' : '💧 ACTIVE', 14, 28)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`Flow Rate: ${(pipe.flowRate * 100).toFixed(0)}%`, 14, 52)
    ctx.fillText(`Moisture Contribution: ${(pipe.moistureContrib * 100).toFixed(1)}%`, 14, 70)
    ctx.fillText(`Pipe: ${pipe.id.toUpperCase()}`, 14, 88)

    ctx.fillStyle = '#475569'
    ctx.font = '10px monospace'
    ctx.fillText('[click pipe to close]', 14, 112)

    return new THREE.CanvasTexture(cv)
  }, [pipe])

  if (!pipe || !tex) return null

  const mid = pipe.points[Math.floor(pipe.points.length / 2)]

  return (
    <mesh position={[mid.x, mid.y + 0.25, mid.z]} onClick={(e) => { e.stopPropagation(); onClose() }}>
      <planeGeometry args={[0.55, 0.28]} />
      <meshBasicMaterial ref={matRef} map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

// ── Main exported component ───────────────────────────────────────────────

export function IrrigationPipes({
  cx, cz, moisture, irrigationUrgency, visible, selectedMicro, onPipeClick, getTerrainHeight,
}: IrrigationPipesProps) {
  const [selectedPipe, setSelectedPipe] = useState<PipeSegment | null>(null)

  const pipes = useMemo(
    () => buildPipeNetwork(cx, cz, moisture, getTerrainHeight),
    [cx, cz, moisture, getTerrainHeight]
  )

  const handleClick = useCallback((pipe: PipeSegment) => {
    setSelectedPipe(prev => prev?.id === pipe.id ? null : pipe)
    onPipeClick?.(pipe)
  }, [onPipeClick])

  // Determine which pipes are in the selected micro-zone quadrant
  const microHighlightedIds = useMemo(() => {
    if (!selectedMicro) return new Set<string>()
    const ids = new Set<string>()
    // Riser at that micro position
    ids.add(`s${selectedMicro.r}${selectedMicro.c}`)
    // Horizontal and vertical runs crossing through the micro column/row
    const hMap = [0, 1, 2]
    hMap.forEach(i => {
      const xOff = (i + 1) * (1 / 4) - 0.5
      const microC = Math.floor((xOff + 0.5) * 3)
      if (microC === selectedMicro.c) ids.add(`h${i}`)
    })
    const vMap = [0, 1, 2]
    vMap.forEach(j => {
      const zOff = (j + 1) * (1 / 4) - 0.5
      const microR = Math.floor((zOff + 0.5) * 3)
      if (microR === selectedMicro.r) ids.add(`v${j}`)
    })
    return ids
  }, [selectedMicro])

  if (!visible) return null

  return (
    <group>
      {pipes.map(pipe => (
        <PipeMesh
          key={pipe.id}
          pipe={pipe}
          isSelected={selectedPipe?.id === pipe.id}
          isHighlighted={microHighlightedIds.has(pipe.id)}
          onClick={() => handleClick(pipe)}
        />
      ))}
      <PipeTooltipMesh pipe={selectedPipe} onClose={() => setSelectedPipe(null)} />
    </group>
  )
}
