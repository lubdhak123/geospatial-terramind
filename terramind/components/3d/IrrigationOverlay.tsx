'use client'

/**
 * IrrigationOverlay.tsx
 * Underground irrigation pipe network rendered on the 3D terrain.
 *
 * Layers:
 *  1. Soil-moisture heat plane  — transparent color per cell
 *  2. Pipe tubes                — color-coded by status, pulsing flow
 *  3. Flow particles            — animated dots travelling along active pipes
 *  4. Blockage markers          — red pulsing spheres at blocked segments
 *  5. Dry-zone surface overlay  — yellow hatched plane above dry cells
 *  6. Hover / selection labels  — Html panels via @react-three/drei
 */

import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  useIrrigationStore,
  getFlowDemand,
  analyzeCell,
  type SoilCell,
  type PipeSegment,
  type IrrigationNetwork,
} from '@/lib/irrigationStore'
import { getTerrainHeight } from './GridTerrainOverlay'

// ── Constants ─────────────────────────────────────────────────────────────
const CELL_SIZE = 1.0

// ── Color maps ────────────────────────────────────────────────────────────
const MOISTURE_COLOR = (m: number): string => {
  if (m < 0.25) return '#ef4444'   // critical dry  — red
  if (m < 0.40) return '#f59e0b'   // low           — amber
  if (m < 0.65) return '#22c55e'   // optimal       — green
  if (m < 0.78) return '#3b82f6'   // saturated     — blue
  return '#8b5cf6'                  // waterlogged   — purple
}

const PIPE_COLOR: Record<string, string> = {
  active:   '#38bdf8',  // sky blue
  blocked:  '#ef4444',  // red
  dry:      '#78350f',  // dark amber
  overflow: '#a78bfa',  // purple
}

// ── Soil moisture cell overlay ────────────────────────────────────────────
function MoistureCellMesh({ cell, isHovered, isSelected, onHover, onLeave, onClick }: {
  cell: SoilCell
  isHovered: boolean
  isSelected: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const color   = MOISTURE_COLOR(cell.moisture)
  const base    = cell.isDry ? 0.32 : cell.isSaturated ? 0.28 : 0.16
  const opacity = isSelected ? 0.55 : isHovered ? 0.42 : base

  // Pulse on dry cells
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    if (cell.isDry) {
      mat.opacity = opacity + Math.sin(clock.getElapsedTime() * 2.5) * 0.08
    } else {
      mat.opacity += (opacity - mat.opacity) * 0.08
    }
  })

  const cellY = getTerrainHeight(cell.x, cell.z) + 0.01

  const borderPts = useMemo(() => {
    const x0 = cell.x - CELL_SIZE * 0.47
    const x1 = cell.x + CELL_SIZE * 0.47
    const z0 = cell.z - CELL_SIZE * 0.47
    const z1 = cell.z + CELL_SIZE * 0.47
    const by = getTerrainHeight(cell.x, cell.z) + 0.012
    return [
      new THREE.Vector3(x0, by, z0),
      new THREE.Vector3(x1, by, z0),
      new THREE.Vector3(x1, by, z1),
      new THREE.Vector3(x0, by, z1),
      new THREE.Vector3(x0, by, z0),
    ]
  }, [cell.x, cell.z])

  return (
    <group>
      {/* Fill plane */}
      <mesh
        ref={meshRef}
        position={[cell.x, cellY, cell.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover() }}
        onPointerLeave={onLeave}
      >
        <planeGeometry args={[CELL_SIZE * 0.94, CELL_SIZE * 0.94]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border */}
      <Line
        points={borderPts}
        color={color}
        lineWidth={isSelected ? 2.5 : isHovered ? 2 : (cell.isDry ? 1.8 : 0.8)}
        transparent
        opacity={isSelected ? 1 : isHovered ? 0.9 : (cell.isDry ? 0.7 : 0.35)}
        depthWrite={false}
      />

      {/* Hover label */}
      {(isHovered || isSelected) && (
        <Html
          position={[cell.x, cellY + 0.3, cell.z]}
          center
          distanceFactor={10}
          zIndexRange={[80, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: 'system-ui, sans-serif',
            background: `${color}1a`,
            border: `1px solid ${color}55`,
            borderRadius: 10,
            padding: '5px 9px',
            backdropFilter: 'blur(10px)',
            whiteSpace: 'nowrap',
            minWidth: 120,
          }}>
            <div style={{ color, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 3 }}>
              {cell.id.toUpperCase()} · {cell.soilType.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 9 }}>
              <span style={{ color: '#94a3b8' }}>
                H₂O <strong style={{ color }}>{Math.round(cell.moisture * 100)}%</strong>
              </span>
              <span style={{ color: '#94a3b8' }}>
                Perm <strong style={{ color: '#a78bfa' }}>{cell.permeability}</strong>
              </span>
            </div>
            <div style={{ color, fontSize: 8, fontWeight: 800, marginTop: 3 }}>
              {cell.isDry       ? '⚠ DRY ZONE'
               : cell.isSaturated ? '💧 SATURATED'
               : '✓ Moisture OK'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Single pipe tube segment ──────────────────────────────────────────────
function PipeMesh({ seg, isHovered, isSelected, onHover, onLeave, onClick }: {
  seg: PipeSegment
  isHovered: boolean
  isSelected: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const matRef    = useRef<THREE.MeshStandardMaterial>(null!)
  const color     = PIPE_COLOR[seg.status] ?? '#38bdf8'
  const emissive  = seg.blocked ? '#7f1d1d' : seg.status === 'active' ? '#0e4f66' : '#000000'
  const radius    = seg.id.startsWith('ML') ? 0.055 : 0.035
  const baseOpacity = isSelected ? 1.0 : isHovered ? 0.90 : seg.status === 'active' ? 0.75 : 0.28

  // Terrain-anchored Y for this pipe (embedded just below surface)
  const pipeY = useMemo(() => {
    const midX = (seg.from.x + seg.to.x) / 2
    const midZ = (seg.from.z + seg.to.z) / 2
    return getTerrainHeight(midX, midZ) + 0.02
  }, [seg.from.x, seg.from.z, seg.to.x, seg.to.z])

  // Tube geometry sitting on terrain surface
  const { tubeGeo } = useMemo(() => {
    const thFrom = getTerrainHeight(seg.from.x, seg.from.z) + 0.02
    const thTo   = getTerrainHeight(seg.to.x,   seg.to.z)   + 0.02
    const curve  = new THREE.CatmullRomCurve3([
      new THREE.Vector3(seg.from.x, thFrom, seg.from.z),
      new THREE.Vector3((seg.from.x + seg.to.x) / 2, (thFrom + thTo) / 2, (seg.from.z + seg.to.z) / 2),
      new THREE.Vector3(seg.to.x, thTo, seg.to.z),
    ])
    return { tubeGeo: new THREE.TubeGeometry(curve, 10, radius, 8, false) }
  }, [seg.from.x, seg.from.z, seg.to.x, seg.to.z, radius])

  // Emissive pulse on active; throb on blocked; lerp opacity otherwise
  useFrame(({ clock }) => {
    if (!matRef.current) return
    const mat = matRef.current
    const t = clock.getElapsedTime()
    if (isSelected) {
      mat.emissiveIntensity = 0.30 + Math.sin(t * 4) * 0.10
      mat.opacity = baseOpacity
    } else if (seg.blocked) {
      mat.emissiveIntensity = 0.18 + Math.sin(t * 1.8) * 0.12
      mat.opacity = 0.55 + Math.sin(t * 1.5) * 0.18
    } else if (seg.status === 'active' && seg.flowLevel !== 'none') {
      mat.emissiveIntensity = 0.08 + Math.sin(t * 3 + seg.from.x) * 0.05
      mat.opacity += (baseOpacity - mat.opacity) * 0.1
    } else {
      mat.emissiveIntensity = 0
      mat.opacity += (baseOpacity - mat.opacity) * 0.1
    }
  })

  return (
    <group>
      {/* Physical tube — terrain-embedded */}
      <mesh
        geometry={tubeGeo}
        renderOrder={2}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover() }}
        onPointerLeave={onLeave}
      >
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={emissive}
          emissiveIntensity={seg.status === 'active' ? 0.1 : 0}
          metalness={isSelected ? 0.45 : 0.25}
          roughness={0.68}
          transparent
          opacity={baseOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Glow ring on blockage */}
      {seg.blocked && (
        <BlockageMarker x={(seg.from.x + seg.to.x) / 2} z={(seg.from.z + seg.to.z) / 2} />
      )}

      {/* Hover label */}
      {(isHovered || isSelected) && (
        <Html
          position={[(seg.from.x + seg.to.x) / 2, pipeY + 0.35, (seg.from.z + seg.to.z) / 2]}
          center
          distanceFactor={10}
          zIndexRange={[90, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <PipeLabel seg={seg} color={color} />
        </Html>
      )}
    </group>
  )
}

// ── Blockage pulse marker ─────────────────────────────────────────────────
function BlockageMarker({ x, z }: { x: number; z: number }) {
  const outerRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const markerY  = getTerrainHeight(x, z) + 0.02

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (outerRef.current) {
      const s = 1 + Math.sin(t * 2.2) * 0.3
      outerRef.current.scale.setScalar(s)
      ;(outerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t * 2.2) * 0.15
    }
    if (innerRef.current) {
      ;(innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 3) * 0.2
    }
  })

  return (
    <group position={[x, markerY, z]}>
      {/* Outer pulse ring */}
      <mesh ref={outerRef} renderOrder={5}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Inner solid */}
      <mesh ref={innerRef} renderOrder={6}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* Cross marker */}
      <Line
        points={[new THREE.Vector3(-0.13, 0, 0), new THREE.Vector3(0.13, 0, 0)]}
        color="#ffffff" lineWidth={2} transparent opacity={0.9} depthWrite={false}
      />
      <Line
        points={[new THREE.Vector3(0, -0.13, 0), new THREE.Vector3(0, 0.13, 0)]}
        color="#ffffff" lineWidth={2} transparent opacity={0.9} depthWrite={false}
      />
    </group>
  )
}

// ── Pipe detail label ─────────────────────────────────────────────────────
function PipeLabel({ seg, color }: { seg: PipeSegment; color: string }) {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      background: `${color}15`,
      border: `1px solid ${color}50`,
      borderRadius: 10,
      padding: '5px 9px',
      backdropFilter: 'blur(10px)',
      whiteSpace: 'nowrap',
      minWidth: 140,
    }}>
      <div style={{ color, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 3 }}>
        {seg.id} · {seg.status.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 6, fontSize: 8, color: '#94a3b8', flexWrap: 'wrap' }}>
        <span>Flow <strong style={{ color }}>{Math.round(seg.flowRate * 100)}%</strong></span>
        <span>Pressure <strong style={{ color: '#38bdf8' }}>{seg.pressureKPa} kPa</strong></span>
      </div>
      {seg.blocked && (
        <div style={{
          color: '#ef4444', fontSize: 8, fontWeight: 800, marginTop: 3,
          borderTop: '1px solid #ef444430', paddingTop: 3,
        }}>
          ⚠ {seg.blockagePct}% blocked · {seg.blockageCause.slice(0, 36)}
        </div>
      )}
      <div style={{ color: '#475569', fontSize: 7, marginTop: 2 }}>
        Last inspected: {seg.lastInspected}
      </div>
    </div>
  )
}

// ── Flow particles along active pipes ────────────────────────────────────
// Each particle is a small sphere that travels from→to over time
function FlowParticles({ seg }: { seg: PipeSegment }) {
  const COUNT   = seg.id.startsWith('ML') ? 4 : 2
  const SPEED   = 0.35 + seg.flowRate * 0.45
  const color   = seg.status === 'overflow' ? '#a78bfa' : '#7dd3fc'

  const refs = useRef<(THREE.Mesh | null)[]>([])

  const fromY = getTerrainHeight(seg.from.x, seg.from.z) + 0.025
  const toY   = getTerrainHeight(seg.to.x,   seg.to.z)   + 0.025

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      const phase  = (t * SPEED + i / COUNT) % 1
      const fromV  = new THREE.Vector3(seg.from.x, fromY, seg.from.z)
      const toV    = new THREE.Vector3(seg.to.x,   toY,   seg.to.z)
      mesh.position.lerpVectors(fromV, toV, phase)
      const fade = 1 - Math.abs(phase * 2 - 1) * 0.6
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.85
    })
  })

  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { refs.current[i] = el }}
          renderOrder={7}
        >
          <sphereGeometry args={[0.028, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

// ── Underground pipe trench line (visual depth cue) ───────────────────────
function TrenchLine({ seg }: { seg: PipeSegment }) {
  const color  = PIPE_COLOR[seg.status] ?? '#38bdf8'
  const pts    = useMemo(() => {
    const yFrom = getTerrainHeight(seg.from.x, seg.from.z) + 0.021
    const yTo   = getTerrainHeight(seg.to.x,   seg.to.z)   + 0.021
    return [
      new THREE.Vector3(seg.from.x, yFrom, seg.from.z),
      new THREE.Vector3(seg.to.x,   yTo,   seg.to.z),
    ]
  }, [seg.from.x, seg.from.z, seg.to.x, seg.to.z])

  return (
    <Line
      points={pts}
      color={color}
      lineWidth={seg.id.startsWith('ML') ? 2.5 : 1.5}
      transparent
      opacity={0.5}
      depthWrite={false}
    />
  )
}

// ── Depth guide lines (visual connector from surface to pipe) ─────────────
function DepthGuides({ seg }: { seg: PipeSegment }) {
  if (seg.id.startsWith('ML')) return null
  const midX = (seg.from.x + seg.to.x) / 2
  const midZ = (seg.from.z + seg.to.z) / 2
  const color = PIPE_COLOR[seg.status] ?? '#38bdf8'
  const pts   = useMemo(() => {
    const surfaceY = getTerrainHeight(midX, midZ) + 0.04
    const pipeY    = getTerrainHeight(midX, midZ) + 0.02
    return [
      new THREE.Vector3(midX, surfaceY, midZ),
      new THREE.Vector3(midX, pipeY,    midZ),
    ]
  }, [midX, midZ])

  return (
    <Line
      points={pts}
      color={color}
      lineWidth={0.6}
      transparent
      opacity={0.2}
      depthWrite={false}
    />
  )
}

// ── Cell inspector HUD (floating panel for selected cell) ────────────────
function CellInspectorHUD({
  cell, pipes,
}: {
  cell: SoilCell
  pipes: PipeSegment[]
}) {
  const analysis = analyzeCell(cell, pipes)
  const demand   = getFlowDemand(cell.moisture)

  return (
    <Html
      position={[cell.x + 1.2, getTerrainHeight(cell.x, cell.z) + 0.8, cell.z]}
      distanceFactor={12}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        fontFamily: 'system-ui, sans-serif',
        background: 'rgba(3,13,26,0.92)',
        border: `1.5px solid ${analysis.color}60`,
        borderRadius: 14,
        padding: '10px 13px',
        width: 210,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 20px ${analysis.color}20`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: analysis.color, boxShadow: `0 0 8px ${analysis.color}`,
          }} />
          <span style={{ color: analysis.color, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}>
            CELL {cell.id.toUpperCase()} — {analysis.status.toUpperCase()}
          </span>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
          {[
            { label: 'Moisture',     value: `${Math.round(cell.moisture * 100)}%`,  color: MOISTURE_COLOR(cell.moisture) },
            { label: 'Flow Demand',  value: `${Math.round(demand * 100)}%`,          color: demand > 0.6 ? '#f59e0b' : '#22c55e' },
            { label: 'Soil Type',    value: cell.soilType,                           color: '#a78bfa' },
            { label: 'Permeability', value: cell.permeability.toString(),            color: '#38bdf8' },
          ].map(m => (
            <div key={m.label} style={{
              background: `${m.color}0d`, border: `1px solid ${m.color}22`,
              borderRadius: 8, padding: '4px 7px',
            }}>
              <div style={{ color: '#475569', fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {m.label}
              </div>
              <div style={{ color: m.color, fontSize: 11, fontWeight: 900 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Analysis detail */}
        <div style={{
          background: `${analysis.color}0a`, border: `1px solid ${analysis.color}25`,
          borderRadius: 8, padding: '6px 8px',
        }}>
          <div style={{ color: analysis.color, fontSize: 8, fontWeight: 800, marginBottom: 3 }}>
            {analysis.status === 'Blockage detected' ? '⚠ PIPE OBSTRUCTION' :
             analysis.status === 'Irrigation required' ? '⚠ IRRIGATION NEEDED' :
             analysis.status === 'Overflow risk'       ? '💧 OVERFLOW RISK' :
             '✓ NORMAL OPERATION'}
          </div>
          <p style={{ color: '#94a3b8', fontSize: 9, lineHeight: 1.5, margin: 0 }}>
            {analysis.detail}
          </p>
        </div>

        {/* Close hint */}
        <div style={{ color: '#334155', fontSize: 7, textAlign: 'center', marginTop: 6 }}>
          Click again to deselect
        </div>
      </div>
    </Html>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
export function IrrigationOverlay() {
  const {
    network,
    selectedCell, setSelectedCell,
    selectedPipe, setSelectedPipe,
    showPipes, showMoistureOverlay, showFlowParticles,
  } = useIrrigationStore()

  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [hoveredPipe, setHoveredPipe] = useState<string | null>(null)

  const handleCellClick = useCallback((cell: SoilCell) => {
    console.log('[Irrigation] Cell:', cell.id, '| Moisture:', cell.moisture, '| Blocked:', cell.isDry)
    setSelectedCell(selectedCell?.id === cell.id ? null : cell)
    setSelectedPipe(null)
  }, [selectedCell, setSelectedCell, setSelectedPipe])

  const handlePipeClick = useCallback((seg: PipeSegment) => {
    console.log('[Irrigation] Pipe:', seg.id, '| Flow:', seg.flowRate, '| Blocked:', seg.blocked)
    setSelectedPipe(selectedPipe?.id === seg.id ? null : seg)
    setSelectedCell(null)
  }, [selectedPipe, setSelectedPipe, setSelectedCell])

  // Separate mainline from laterals
  const mainlinePipes = network.pipes.filter(p => p.id.startsWith('ML'))
  const lateralPipes  = network.pipes.filter(p => !p.id.startsWith('ML'))

  return (
    <group>
      {/* ── 1. Soil moisture overlay ────────────────────────────────────── */}
      {showMoistureOverlay && network.cellsFlat.map(cell => (
        <MoistureCellMesh
          key={cell.id}
          cell={cell}
          isHovered={hoveredCell === cell.id}
          isSelected={selectedCell?.id === cell.id}
          onHover={() => setHoveredCell(cell.id)}
          onLeave={() => setHoveredCell(null)}
          onClick={() => handleCellClick(cell)}
        />
      ))}

      {/* ── 2. Pipe tubes + depth guides ────────────────────────────────── */}
      {showPipes && (
        <>
          {/* Mainline (top horizontal pipe) */}
          {mainlinePipes.map(seg => (
            <group key={seg.id}>
              <PipeMesh
                seg={seg}
                isHovered={hoveredPipe === seg.id}
                isSelected={selectedPipe?.id === seg.id}
                onHover={() => setHoveredPipe(seg.id)}
                onLeave={() => setHoveredPipe(null)}
                onClick={() => handlePipeClick(seg)}
              />
              <TrenchLine seg={seg} />
            </group>
          ))}

          {/* Lateral pipes */}
          {lateralPipes.map(seg => (
            <group key={seg.id}>
              <PipeMesh
                seg={seg}
                isHovered={hoveredPipe === seg.id}
                isSelected={selectedPipe?.id === seg.id}
                onHover={() => setHoveredPipe(seg.id)}
                onLeave={() => setHoveredPipe(null)}
                onClick={() => handlePipeClick(seg)}
              />
              <TrenchLine seg={seg} />
              <DepthGuides seg={seg} />
            </group>
          ))}
        </>
      )}

      {/* ── 3. Flow particles on active pipes ───────────────────────────── */}
      {showPipes && showFlowParticles &&
        network.pipes
          .filter(p => p.status === 'active' && p.flowLevel !== 'none')
          .map(seg => <FlowParticles key={`fp_${seg.id}`} seg={seg} />)
      }

      {/* ── 4. Cell inspector HUD ───────────────────────────────────────── */}
      {selectedCell && (
        <CellInspectorHUD
          cell={selectedCell}
          pipes={network.pipes}
        />
      )}

      {/* ── 5. Network legend (top-left of scene) ───────────────────────── */}
      <NetworkLegend network={network} />
    </group>
  )
}

// ── Network summary legend ────────────────────────────────────────────────
function NetworkLegend({ network }: { network: IrrigationNetwork }) {
  return (
    <Html
      position={[-4.8, getTerrainHeight(-4.8, -4.8) + 1.2, -4.8]}
      distanceFactor={14}
      zIndexRange={[50, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        fontFamily: 'system-ui, sans-serif',
        background: 'rgba(3,13,26,0.88)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: 12,
        padding: '8px 11px',
        minWidth: 170,
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{ color: '#38bdf8', fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 6 }}>
          💧 IRRIGATION NETWORK
        </div>
        {[
          { color: '#38bdf8', label: `Active pipes`,             value: `${network.pipes.filter((p: PipeSegment) => p.status === 'active').length}` },
          { color: '#ef4444', label: `Blocked`,                  value: `${network.blockedPipes}` },
          { color: '#f59e0b', label: `Dry zones`,                value: `${network.dryCells} cells` },
          { color: '#22c55e', label: `Avg moisture`,             value: `${Math.round(network.avgMoisture * 100)}%` },
          { color: '#a78bfa', label: `Coverage`,                 value: `${network.coveragePct}%` },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: row.color }} />
              <span style={{ color: '#64748b', fontSize: 8 }}>{row.label}</span>
            </div>
            <span style={{ color: row.color, fontSize: 9, fontWeight: 900 }}>{row.value}</span>
          </div>
        ))}
        {/* Pipe color legend */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 5, paddingTop: 5 }}>
          {[
            { color: '#38bdf8', label: 'Active — flowing' },
            { color: '#ef4444', label: 'Blocked — no flow' },
            { color: '#78350f', label: 'Dry — inactive' },
            { color: '#a78bfa', label: 'Overflow' },
          ].map(e => (
            <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <div style={{ width: 14, height: 3, borderRadius: 2, background: e.color }} />
              <span style={{ color: '#475569', fontSize: 7 }}>{e.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Html>
  )
}
