'use client'

/**
 * TerrainScene.jsx
 *
 * Clean 2-level precision agriculture viewer built on React Three Fiber.
 *
 * LEVEL 1 — Field View
 *   Full terrain + 10×10 NDVI grid.
 *   Click any cell → transition to Detail View.
 *
 * LEVEL 2 — Detail View
 *   Terrain fades to 20% opacity.
 *   Selected region is highlighted.
 *   3×3 micro-grid rendered inside the region.
 *   4-layer stack (NDVI / Moisture / Nutrients / Pipes) floats
 *   at offset Y positions, each perfectly aligned to the region.
 *   Hover / click a micro-cell → analysis panel updates.
 *
 * Data source: lib/fieldDataEngine.ts (deterministic, no API calls)
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, useTexture, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  FIELD_GRID,
  ndviColor, moistureColor, RISK_COLOR, HEALTH_COLOR,
} from '@/lib/fieldDataEngine'
import { usePipelineStore } from '@/lib/pipelineStore'
import { getCropRecommendations, explainRecommendation, cellToRegionData, CROPS } from '@/lib/cropRecommendation'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TW   = 10          // terrain world-space width
const TH   = 10          // terrain world-space height
const ROWS = 10
const COLS = 10
const CW   = TW / COLS   // L1 cell width  = 1.0
const CH   = TH / ROWS   // L1 cell height = 1.0

// Y positions for the 4 analysis layers (all within the selected region)
const LAYER_Y = {
  ndvi:      1.80,   // sits just above terrain surface
  moisture:  1.60,
  nutrients: 1.40,
  pipes:     1.20,
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** World-space X of a column's left edge (terrain centred at 0,0) */
function colX(col) { return -TW / 2 + col * CW }
/** World-space Z of a row's top  edge */
function rowZ(row) { return -TH / 2 + row * CH }
/** Cell centre X */
function cx(col, w = CW) { return colX(col) + w / 2 }
/** Cell centre Z */
function cz(row, h = CH) { return rowZ(row) + h / 2 }

/** Nutrient composite colour — red=deficient → yellow=low → green=ok */
function nutrientColor(ac) {
  const n = ac.analysis.nitrogen_status
  if (n === 'deficient') return '#ef4444'
  if (n === 'low')       return '#f59e0b'
  if (n === 'excess')    return '#a78bfa'
  return '#22c55e'
}

/** Irrigation pipe colour — blue=flowing, orange=partial, red=blocked */
function pipeColor(ac) {
  if (!ac.analysis.irrigation_needed) return '#38bdf8'   // flowing fine
  if (ac.analysis.irrigation_urgency === 'schedule') return '#f59e0b'
  return '#ef4444'   // immediate deficit
}

// ─────────────────────────────────────────────────────────────────────────────
// TERRAIN MESH  (satellite + heightmap displacement)
// ─────────────────────────────────────────────────────────────────────────────
function TerrainPlane({ satelliteUrl, heightmapUrl, opacity }) {
  const meshRef = useRef()
  const [satTex, heightTex] = useTexture([satelliteUrl, heightmapUrl])

  satTex.wrapS = satTex.wrapT     = THREE.ClampToEdgeWrapping
  satTex.minFilter                = THREE.LinearMipmapLinearFilter
  satTex.magFilter                = THREE.LinearFilter
  satTex.anisotropy               = 16
  satTex.colorSpace               = THREE.SRGBColorSpace

  heightTex.wrapS = heightTex.wrapT = THREE.ClampToEdgeWrapping
  heightTex.minFilter               = THREE.LinearFilter
  heightTex.magFilter               = THREE.LinearFilter
  heightTex.colorSpace              = THREE.NoColorSpace

  // Smoothly lerp terrain opacity so the fade-out is animated
  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material
    mat.opacity += (opacity - mat.opacity) * 0.08
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
    >
      <planeGeometry args={[TW, TH, 256, 256]} />
      <meshStandardMaterial
        map={satTex}
        displacementMap={heightTex}
        displacementScale={1.5}
        roughness={0.85}
        metalness={0.0}
        transparent
        opacity={opacity}
        depthWrite={opacity > 0.5}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD VIEW — 10×10 NDVI grid
// ─────────────────────────────────────────────────────────────────────────────
function FieldGrid({ onCellClick, grid }) {
  const [hovered, setHovered] = useState(null)

  return (
    <group>
      {grid.map((row, ri) =>
        row.map((ac, ci) => {
          const x    = colX(ci)
          const z    = rowZ(ri)
          const midX = x + CW / 2
          const midZ = z + CH / 2
          const col  = ndviColor(ac.ndvi)
          const isHov = hovered === ac.id

          return (
            <group key={ac.id}>
              {/* Fill plane — transparent, brightens on hover */}
              <mesh
                position={[midX, LAYER_Y.ndvi, midZ]}
                rotation={[-Math.PI / 2, 0, 0]}
                renderOrder={4}
                onClick={(e) => { e.stopPropagation(); onCellClick(ac) }}
                onPointerEnter={(e) => { e.stopPropagation(); setHovered(ac.id) }}
                onPointerLeave={() => setHovered(null)}
              >
                <planeGeometry args={[CW * 0.94, CH * 0.94]} />
                <meshBasicMaterial
                  color={col}
                  transparent
                  opacity={isHov ? 0.38 : 0.10}
                  depthWrite={false}
                  depthTest={false}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Border lines */}
              <Line
                points={[
                  new THREE.Vector3(x,      LAYER_Y.ndvi + 0.01, z),
                  new THREE.Vector3(x + CW, LAYER_Y.ndvi + 0.01, z),
                  new THREE.Vector3(x + CW, LAYER_Y.ndvi + 0.01, z + CH),
                  new THREE.Vector3(x,      LAYER_Y.ndvi + 0.01, z + CH),
                  new THREE.Vector3(x,      LAYER_Y.ndvi + 0.01, z),
                ]}
                color={col}
                lineWidth={isHov ? 1.8 : 0.8}
                transparent
                opacity={isHov ? 0.9 : 0.40}
                depthWrite={false}
              />

              {/* Hover tooltip */}
              {isHov && (
                <Html
                  position={[midX, LAYER_Y.ndvi + 0.4, midZ]}
                  center
                  distanceFactor={10}
                  zIndexRange={[60, 0]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div style={{
                    fontFamily: 'system-ui, sans-serif',
                    background: `linear-gradient(135deg, ${col}22, rgba(3,13,26,0.93))`,
                    border: `1px solid ${col}60`,
                    borderRadius: 9,
                    padding: '7px 11px',
                    backdropFilter: 'blur(12px)',
                    whiteSpace: 'nowrap',
                    minWidth: 160,
                    boxShadow: `0 4px 18px rgba(0,0,0,0.55), 0 0 12px ${col}20`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, boxShadow: `0 0 7px ${col}` }} />
                      <span style={{ color: col, fontSize: 10, fontWeight: 900 }}>
                        {ac.id.toUpperCase()} · {ac.analysis.health_status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 10px' }}>
                      {[
                        { l: 'NDVI',  v: ac.ndvi.toFixed(2),                   c: col },
                        { l: 'H₂O',   v: `${Math.round(ac.moisture * 100)}%`,  c: '#38bdf8' },
                        { l: 'Yield', v: `${ac.analysis.yield_qtl_acre}q`,      c: '#a78bfa' },
                        { l: 'N',     v: `${ac.nitrogen}kg`,                    c: '#f59e0b' },
                        { l: 'pH',    v: String(ac.ph),                         c: '#22c55e' },
                        { l: 'Temp',  v: `${ac.temperature}°C`,                 c: '#f97316' },
                      ].map(m => (
                        <div key={m.l} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ color: '#475569', fontSize: 7, fontWeight: 700 }}>{m.l}</span>
                          <span style={{ color: m.c, fontSize: 9, fontWeight: 900 }}>{m.v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ color: '#38bdf8', fontSize: 7, marginTop: 5, fontWeight: 800 }}>
                      → Click to drill into this region
                    </div>
                  </div>
                </Html>
              )}
            </group>
          )
        })
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL VIEW COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateSubGrid — creates a 3×3 grid of sub-cells for the selected L1 cell.
 * Each sub-cell interpolates its data from the L1 cell with a small seeded offset.
 */
function generateSubGrid(ac) {
  const cells = []
  for (let sr = 0; sr < 3; sr++) {
    for (let sc = 0; sc < 3; sc++) {
      const seed = Math.sin((ac.row * 31 + ac.col * 17 + sr * 7 + sc * 13) * 0.731) * 0.5 + 0.5
      const nudge = (v, range) => Math.max(0, Math.min(1, v + (seed - 0.5) * range))
      cells.push({
        id: `${ac.id}_s${sr}${sc}`,
        sr, sc,
        ndvi:        nudge(ac.ndvi, 0.15),
        moisture:    nudge(ac.moisture, 0.18),
        nitrogen:    Math.round(ac.nitrogen + (seed - 0.5) * 25),
        phosphorus:  Math.round(ac.phosphorus + (seed - 0.5) * 8),
        potassium:   Math.round(ac.potassium + (seed - 0.5) * 20),
        ph:          Math.round((ac.ph + (seed - 0.5) * 0.4) * 100) / 100,
        temperature: Math.round((ac.temperature + (seed - 0.5) * 2) * 10) / 10,
        humidity:    Math.round(ac.humidity + (seed - 0.5) * 10),
        // inherit top-level analysis (same disease/degradation zone)
        analysis: ac.analysis,
      })
    }
  }
  return cells
}

// ── Single analysis layer (one of the 4 stacked planes) ──────────────────────
function AnalysisLayer({ regionX, regionZ, regionW, regionH, y, cells, colorFn, opacity, label, labelColor }) {
  const subW = regionW / 3
  const subH = regionH / 3

  return (
    <group>
      {cells.map(sub => {
        const wx  = regionX + sub.sc * subW
        const wz  = regionZ + sub.sr * subH
        const col = colorFn(sub)
        return (
          <mesh
            key={sub.id}
            position={[wx + subW / 2, y, wz + subH / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={5}
          >
            <planeGeometry args={[subW * 0.90, subH * 0.90]} />
            <meshBasicMaterial
              color={col}
              transparent
              opacity={opacity}
              depthWrite={false}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Layer label floating at left edge */}
      <Html
        position={[regionX - 0.15, y + 0.05, regionZ + regionH / 2]}
        center={false}
        distanceFactor={8}
        zIndexRange={[50, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontFamily: 'system-ui, sans-serif',
          background: `${labelColor}18`,
          border: `1px solid ${labelColor}50`,
          borderRadius: 5,
          padding: '2px 7px',
          color: labelColor,
          fontSize: 7,
          fontWeight: 900,
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)',
        }}>
          {label}
        </div>
      </Html>
    </group>
  )
}

// ── Layer connector lines — vertical dashes linking layer edges ───────────────
function LayerConnectors({ regionX, regionZ, regionW, regionH }) {
  const corners = [
    [regionX,           regionZ          ],
    [regionX + regionW, regionZ          ],
    [regionX + regionW, regionZ + regionH],
    [regionX,           regionZ + regionH],
  ]
  const ys = Object.values(LAYER_Y)

  return (
    <group>
      {corners.map(([x, z], i) => (
        <Line
          key={i}
          points={ys.map(y => new THREE.Vector3(x, y, z))}
          color="#334155"
          lineWidth={0.7}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      ))}
    </group>
  )
}

// ── Micro 3×3 grid — interactive cells for the detail view ───────────────────
function MicroGrid({ regionX, regionZ, regionW, regionH, subCells, onHover, onSelect, hoveredId, selectedId }) {
  const subW = regionW / 3
  const subH = regionH / 3
  const Y    = LAYER_Y.ndvi + 0.05   // sits slightly above the NDVI layer

  return (
    <group>
      {subCells.map(sub => {
        const wx   = regionX + sub.sc * subW
        const wz   = regionZ + sub.sr * subH
        const col  = ndviColor(sub.ndvi)
        const isHov = sub.id === hoveredId
        const isSel = sub.id === selectedId

        return (
          <group key={sub.id}>
            {/* Interactive fill */}
            <mesh
              position={[wx + subW / 2, Y, wz + subH / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={6}
              onClick={(e)         => { e.stopPropagation(); onSelect(sub) }}
              onPointerEnter={(e)  => { e.stopPropagation(); onHover(sub)  }}
              onPointerLeave={() => onHover(null)}
            >
              <planeGeometry args={[subW * 0.88, subH * 0.88]} />
              <meshBasicMaterial
                color={col}
                transparent
                opacity={isSel ? 0.55 : isHov ? 0.42 : 0.18}
                depthWrite={false}
                depthTest={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Border */}
            <Line
              points={[
                new THREE.Vector3(wx,          Y + 0.01, wz         ),
                new THREE.Vector3(wx + subW,   Y + 0.01, wz         ),
                new THREE.Vector3(wx + subW,   Y + 0.01, wz + subH  ),
                new THREE.Vector3(wx,          Y + 0.01, wz + subH  ),
                new THREE.Vector3(wx,          Y + 0.01, wz         ),
              ]}
              color={col}
              lineWidth={isSel ? 2.5 : isHov ? 2.0 : 1.2}
              transparent
              opacity={isSel ? 1.0 : isHov ? 0.9 : 0.65}
              depthWrite={false}
            />
          </group>
        )
      })}

      {/* Outer glowing border around the full 3×3 block */}
      <Line
        points={[
          new THREE.Vector3(regionX,           Y + 0.02, regionZ          ),
          new THREE.Vector3(regionX + regionW, Y + 0.02, regionZ          ),
          new THREE.Vector3(regionX + regionW, Y + 0.02, regionZ + regionH),
          new THREE.Vector3(regionX,           Y + 0.02, regionZ + regionH),
          new THREE.Vector3(regionX,           Y + 0.02, regionZ          ),
        ]}
        color="#38bdf8"
        lineWidth={2.8}
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </group>
  )
}

// ── Dark mask over everything OUTSIDE the selected region ────────────────────
function RegionMask({ regionX, regionZ, regionW, regionH }) {
  const refs  = [useRef(), useRef(), useRef(), useRef()]
  const Y     = 1.75
  const F     = 5    // half terrain width

  const northH = Math.max(0.001, regionZ + F)
  const southH = Math.max(0.001, F - (regionZ + regionH))
  const westW  = Math.max(0.001, regionX + F)
  const eastW  = Math.max(0.001, F - (regionX + regionW))

  const quads = [
    [0,                          -F + northH / 2,             F * 2,  northH  ],
    [0,                          regionZ + regionH + southH / 2, F * 2, southH ],
    [-F + westW / 2,             regionZ + regionH / 2,       westW,  regionH ],
    [regionX + regionW + eastW / 2, regionZ + regionH / 2,    eastW,  regionH ],
  ]

  useFrame(() => {
    refs.forEach(r => {
      if (!r.current) return
      r.current.material.opacity += (0.72 - r.current.material.opacity) * 0.09
    })
  })

  return (
    <group>
      {quads.map(([qx, qz, qw, qh], i) => (
        <mesh
          key={i}
          ref={refs[i]}
          position={[qx, Y, qz]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={3}
        >
          <planeGeometry args={[qw, qh]} />
          <meshBasicMaterial
            color="#000c1a"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA ANIMATOR
// ─────────────────────────────────────────────────────────────────────────────
function CameraAnimator({ target, controlsRef }) {
  const { camera } = useThree()
  const anim = useRef({ active: false, t: 0, startPos: new THREE.Vector3(), endPos: new THREE.Vector3(), startLook: new THREE.Vector3(), endLook: new THREE.Vector3() })

  useEffect(() => {
    if (!target) return
    const a = anim.current
    a.startPos.copy(camera.position)
    a.startLook.copy(controlsRef.current?.target ?? new THREE.Vector3())
    a.endPos.set(target.pos[0], target.pos[1], target.pos[2])
    a.endLook.set(target.look[0], target.look[1], target.look[2])
    a.t = 0
    a.active = true
    if (controlsRef.current) controlsRef.current.enabled = false
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    const a = anim.current
    if (!a.active) return
    a.t = Math.min(1, a.t + delta / 1.2)
    const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2   // easeInOutCubic
    camera.position.lerpVectors(a.startPos, a.endPos, e)
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(a.startLook, a.endLook, e)
      controlsRef.current.update()
    }
    if (a.t >= 1) {
      a.active = false
      if (controlsRef.current) controlsRef.current.enabled = true
    }
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS PANEL — HTML overlay (outside Canvas)
// ─────────────────────────────────────────────────────────────────────────────
function AnalysisPanel({ cell, onClose }) {
  if (!cell) return null

  const ac     = cell.analysis
  const col    = HEALTH_COLOR[ac.health_status]
  const riskCol = RISK_COLOR[ac.overall_risk]

  const Row = ({ label, value, color = '#94a3b8' }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: '#475569', fontSize: 8, fontWeight: 700 }}>{label}</span>
      <span style={{ color, fontSize: 8, fontWeight: 900 }}>{value}</span>
    </div>
  )

  const Section = ({ title, color = '#38bdf8', children }) => (
    <div style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 7, padding: '7px 10px', marginBottom: 5 }}>
      <div style={{ color, fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 5 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  )

  return (
    <div style={{
      position: 'absolute', top: 60, right: 16, width: 230, zIndex: 30,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(3,13,26,0.96)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: '10px 10px 0 0',
        padding: '7px 10px',
        backdropFilter: 'blur(16px)',
      }}>
        <span style={{ color: col, fontSize: 9, fontWeight: 900, flex: 1, letterSpacing: '0.08em' }}>
          📊 {cell.id.toUpperCase()} — {ac.health_status.toUpperCase()}
        </span>
        <span style={{
          background: `${riskCol}20`, border: `1px solid ${riskCol}50`,
          borderRadius: 4, padding: '1px 6px',
          color: riskCol, fontSize: 7, fontWeight: 900,
        }}>
          {ac.overall_risk.toUpperCase()}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2 }}>
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{
        background: 'rgba(3,13,26,0.95)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        padding: '8px 10px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 130px)',
      }}>
        {/* Alert */}
        {ac.action_required && (
          <div style={{ background: `${riskCol}18`, border: `1px solid ${riskCol}50`, borderRadius: 6, padding: '5px 8px', color: riskCol, fontSize: 8, fontWeight: 800, lineHeight: 1.5, marginBottom: 8 }}>
            ⚡ {ac.primary_alert}
          </div>
        )}

        <Section title="📡 SENTINEL DATA" color="#38bdf8">
          <Row label="NDVI"        value={cell.ndvi.toFixed(3)}                      color="#22c55e" />
          <Row label="Moisture"    value={`${Math.round(cell.moisture * 100)}%`}     color="#38bdf8" />
          <Row label="Temperature" value={`${cell.temperature}°C`}                  color="#f97316" />
          <Row label="Humidity"    value={`${cell.humidity}%`}                       color="#60a5fa" />
        </Section>

        <Section title="🌍 SOIL DATA" color="#f59e0b">
          <Row label="pH"          value={String(cell.ph)}                           color={cell.ph < 5.8 || cell.ph > 7.5 ? '#ef4444' : '#22c55e'} />
          <Row label="Nitrogen"    value={`${cell.nitrogen} kg/ha`}                  color="#f59e0b" />
          <Row label="Phosphorus"  value={`${cell.phosphorus} kg/ha`}                color="#a78bfa" />
          <Row label="Potassium"   value={`${cell.potassium} kg/ha`}                 color="#84cc16" />
        </Section>

        <Section title="💧 IRRIGATION" color="#38bdf8">
          <Row label="Status"   value={ac.irrigation_needed ? 'DEFICIT' : 'ADEQUATE'} color={ac.irrigation_needed ? '#ef4444' : '#22c55e'} />
          <Row label="Urgency"  value={ac.irrigation_urgency.toUpperCase()}           color={ac.irrigation_urgency === 'immediate' ? '#ef4444' : ac.irrigation_urgency === 'soon' ? '#f97316' : '#22c55e'} />
          <Row label="Deficit"  value={`${ac.irrigation_deficit_mm} mm`}             color="#38bdf8" />
        </Section>

        <Section title="🧪 NUTRIENTS" color="#a78bfa">
          <Row label="Nitrogen"    value={ac.nitrogen_status.toUpperCase()}   color={ac.nitrogen_status   === 'deficient' ? '#ef4444' : '#22c55e'} />
          <Row label="Phosphorus"  value={ac.phosphorus_status.toUpperCase()} color={ac.phosphorus_status === 'deficient' ? '#ef4444' : '#22c55e'} />
          <Row label="Potassium"   value={ac.potassium_status.toUpperCase()}  color={ac.potassium_status  === 'deficient' ? '#ef4444' : '#22c55e'} />
        </Section>

        <Section title="🦠 DISEASE" color={RISK_COLOR[ac.disease_risk]}>
          <Row label="Risk"  value={ac.disease_risk.toUpperCase()} color={RISK_COLOR[ac.disease_risk]} />
          <Row label="Type"  value={ac.disease_type}               color={ac.disease_risk !== 'none' ? '#ef4444' : '#22c55e'} />
        </Section>

        <Section title="📈 YIELD ESTIMATE" color="#22c55e">
          <Row label="Yield"      value={`${ac.yield_qtl_acre} qtl/acre`}  color="#22c55e" />
          <Row label="% of Max"   value={`${ac.yield_pct_of_max}%`}        color="#22c55e" />
          <Row label="Trend"      value={ac.yield_trend.toUpperCase()}     color={ac.yield_trend === 'improving' ? '#22c55e' : ac.yield_trend === 'degrading' ? '#ef4444' : '#f59e0b'} />
        </Section>

        <CropRecsBlock cell={cell} />
      </div>
    </div>
  )
}

function CropRecsBlock({ cell }) {
  const regionData = cellToRegionData(cell)
  const recs       = getCropRecommendations(regionData).slice(0, 4)
  const top        = recs[0]
  const topDef     = CROPS.find(c => c.name === top.name)
  const reason     = topDef ? explainRecommendation(topDef, regionData) : ''

  const scoreColor = (s) => s >= 60 ? '#22c55e' : s >= 35 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ background: '#22c55e08', border: '1px solid #22c55e20', borderRadius: 7, padding: '7px 10px', marginBottom: 5 }}>
      <div style={{ color: '#22c55e', fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 6 }}>🌾 CROP RECOMMENDATIONS</div>

      {/* Top pick */}
      <div style={{ background: '#22c55e14', border: '1px solid #22c55e35', borderRadius: 5, padding: '5px 7px', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <span style={{ fontSize: 12 }}>{top.emoji}</span>
          <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 900 }}>{top.name}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#22c55e', fontSize: 7, fontWeight: 900 }}>{Math.max(0, top.score)}pt</span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: 7, lineHeight: 1.5 }}>{reason}</div>
        {top.warning && (
          <div style={{ color: '#f97316', fontSize: 7, fontWeight: 800, marginTop: 3 }}>⚠ {top.warning}</div>
        )}
      </div>

      {/* Alternatives */}
      {recs.slice(1).map(r => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: 9 }}>{r.emoji}</span>
          <span style={{ color: '#94a3b8', fontSize: 7, fontWeight: 700, flex: 1 }}>{r.name}</span>
          <div style={{ width: 36, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, r.score))}%`, height: '100%', background: scoreColor(r.score), borderRadius: 2 }} />
          </div>
          <span style={{ color: scoreColor(r.score), fontSize: 7, fontWeight: 900, width: 22, textAlign: 'right' }}>{Math.max(0, r.score)}</span>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER SCENE  (rendered inside Canvas)
// ─────────────────────────────────────────────────────────────────────────────
function InnerScene({ satelliteUrl, heightmapUrl, viewMode, selectedL1, onCellSelect, onMicroHover, onMicroSelect, microHoveredId, microSelectedId, grid }) {
  const controlsRef = useRef()

  // Compute region world coords once whenever selectedL1 changes
  const region = useMemo(() => {
    if (!selectedL1) return null
    return {
      x: colX(selectedL1.col),
      z: rowZ(selectedL1.row),
      w: CW,
      h: CH,
    }
  }, [selectedL1])

  const subCells = useMemo(() => selectedL1 ? generateSubGrid(selectedL1) : [], [selectedL1])

  // Camera target for detail view: slight angle above the selected cell
  const cameraTarget = useMemo(() => {
    if (!region || viewMode !== 'detail') return null
    return {
      pos:  [region.x + region.w / 2, 4.5, region.z + region.h + 3.5],
      look: [region.x + region.w / 2, 0.5, region.z + region.h / 2],
    }
  }, [region, viewMode])

  // Field-view camera reset
  const fieldCameraTarget = useMemo(() => {
    if (viewMode !== 'field') return null
    return { pos: [0, 8, 12], look: [0, 0, 0] }
  }, [viewMode])

  const activeCamTarget = viewMode === 'detail' ? cameraTarget : fieldCameraTarget

  return (
    <>
      <color attach="background" args={['#030d1a']} />
      <fog attach="fog" args={['#030d1a', 20, 45]} />

      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 20, 5]} intensity={2.6} color="#ffffff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.1} shadow-camera-far={50} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <directionalLight position={[0, 8, 12]} intensity={1.3} color="#fff5e0" />
      <hemisphereLight args={['#c8deff', '#4a6a20', 0.7]} />

      {/* Ground base */}
      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#040f1e" roughness={1} />
      </mesh>

      {/* Terrain — full opacity in field view, faded in detail view */}
      <TerrainPlane
        satelliteUrl={satelliteUrl}
        heightmapUrl={heightmapUrl}
        opacity={viewMode === 'detail' ? 0.20 : 1.0}
      />

      {/* FIELD VIEW: full 10×10 NDVI grid */}
      {viewMode === 'field' && (
        <FieldGrid onCellClick={onCellSelect} grid={grid} />
      )}

      {/* DETAIL VIEW: mask + micro grid + layer stack */}
      {viewMode === 'detail' && region && (
        <>
          {/* Dark mask over surrounding terrain */}
          <RegionMask
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
          />

          {/* Layer 1 — NDVI surface */}
          <AnalysisLayer
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
            y={LAYER_Y.ndvi}
            cells={subCells}
            colorFn={sub => ndviColor(sub.ndvi)}
            opacity={0.35}
            label="NDVI"
            labelColor="#22c55e"
          />

          {/* Layer 2 — Moisture */}
          <AnalysisLayer
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
            y={LAYER_Y.moisture}
            cells={subCells}
            colorFn={sub => moistureColor(sub.moisture)}
            opacity={0.32}
            label="MOISTURE"
            labelColor="#38bdf8"
          />

          {/* Layer 3 — Nutrients */}
          <AnalysisLayer
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
            y={LAYER_Y.nutrients}
            cells={subCells}
            colorFn={sub => nutrientColor(sub)}
            opacity={0.30}
            label="NUTRIENTS"
            labelColor="#f59e0b"
          />

          {/* Layer 4 — Irrigation pipes */}
          <AnalysisLayer
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
            y={LAYER_Y.pipes}
            cells={subCells}
            colorFn={sub => pipeColor(sub)}
            opacity={0.28}
            label="IRRIGATION"
            labelColor="#a78bfa"
          />

          {/* Vertical connector lines linking layer corners */}
          <LayerConnectors
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
          />

          {/* Interactive 3×3 micro-grid (sits above NDVI layer) */}
          <MicroGrid
            regionX={region.x} regionZ={region.z}
            regionW={region.w} regionH={region.h}
            subCells={subCells}
            onHover={onMicroHover}
            onSelect={onMicroSelect}
            hoveredId={microHoveredId}
            selectedId={microSelectedId}
          />
        </>
      )}

      <CameraAnimator target={activeCamTarget} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={1.5}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function TerrainScene({ satelliteUrl, heightmapUrl }) {
  const [viewMode,       setViewMode]       = useState('field')   // 'field' | 'detail'
  const [selectedL1,     setSelectedL1]     = useState(null)      // AnalyzedCell (L1)
  const [microHovered,   setMicroHovered]   = useState(null)      // sub-cell object
  const [microSelected,  setMicroSelected]  = useState(null)      // sub-cell object

  // Use real pipeline grid if available, otherwise fall back to simulation
  const pipelineGrid = usePipelineStore(s => s.result?.grid)
  const activeGrid   = pipelineGrid ?? FIELD_GRID

  // Panel shows hovered > selected > L1 cell
  const panelCell = microHovered ?? microSelected ?? selectedL1

  const handleCellSelect = useCallback((ac) => {
    setSelectedL1(ac)
    setMicroHovered(null)
    setMicroSelected(null)
    setViewMode('detail')
    console.log('[TerrainScene] Drilled into:', ac.id, '| NDVI:', ac.ndvi, '| Yield:', ac.analysis.yield_qtl_acre, 'qtl/ac')
  }, [])

  const handleBack = useCallback(() => {
    setViewMode('field')
    setMicroHovered(null)
    setMicroSelected(null)
  }, [])

  const handleMicroHover  = useCallback((sub) => setMicroHovered(sub), [])
  const handleMicroSelect = useCallback((sub) => {
    setMicroSelected(sub)
    console.log('[TerrainScene] Micro-cell selected:', sub.id, '| NDVI:', sub.ndvi.toFixed(3), '| Moisture:', Math.round(sub.moisture * 100) + '%')
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#030d1a' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [2, 8, 12], fov: 55, near: 0.1, far: 200 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#030d1a' }}
      >
        <InnerScene
          satelliteUrl={satelliteUrl}
          heightmapUrl={heightmapUrl}
          viewMode={viewMode}
          selectedL1={selectedL1}
          onCellSelect={handleCellSelect}
          onMicroHover={handleMicroHover}
          onMicroSelect={handleMicroSelect}
          microHoveredId={microHovered?.id ?? null}
          microSelectedId={microSelected?.id ?? null}
          grid={activeGrid}
        />
      </Canvas>

      {/* ── HTML Overlays ── */}

      {/* Back to Field button */}
      {viewMode === 'detail' && (
        <button
          onClick={handleBack}
          style={{
            position: 'absolute',
            top: 16, left: 16,
            zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(3,13,26,0.90)',
            border: '1px solid rgba(56,189,248,0.35)',
            borderRadius: 10,
            padding: '8px 14px',
            color: '#38bdf8',
            fontSize: 11,
            fontWeight: 900,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            fontFamily: 'system-ui, sans-serif',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'border-color 0.15s',
          }}
        >
          ← Back to Field
        </button>
      )}

      {/* View mode badge */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: viewMode === 'detail' ? 160 : 16,
        zIndex: 30,
        fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(3,13,26,0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '7px 12px',
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: viewMode === 'detail' ? '#a78bfa' : '#38bdf8',
          boxShadow: `0 0 8px ${viewMode === 'detail' ? '#a78bfa' : '#38bdf8'}`,
        }} />
        <span style={{ color: viewMode === 'detail' ? '#a78bfa' : '#38bdf8', fontSize: 9, fontWeight: 900, letterSpacing: '0.12em' }}>
          {viewMode === 'field' ? '🌾 FIELD VIEW — 10×10 NDVI GRID' : `🔬 DETAIL VIEW — ${selectedL1?.id?.toUpperCase() ?? ''}`}
        </span>
        {viewMode === 'detail' && selectedL1 && (
          <span style={{
            background: '#f59e0b18', border: '1px solid #f59e0b40',
            borderRadius: 4, padding: '1px 6px',
            color: '#f59e0b', fontSize: 7, fontWeight: 900,
          }}>
            4 LAYERS
          </span>
        )}
      </div>

      {/* Breadcrumb in detail view */}
      {viewMode === 'detail' && selectedL1 && (
        <div style={{
          position: 'absolute',
          top: 52, left: 16,
          zIndex: 30,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(3,13,26,0.80)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '4px 10px',
          backdropFilter: 'blur(12px)',
        }}>
          <span style={{ color: '#475569', fontSize: 8 }}>🏠 Field</span>
          <span style={{ color: '#334155', fontSize: 8 }}>›</span>
          <span style={{ color: '#38bdf8', fontSize: 8, fontWeight: 800 }}>{selectedL1.id.toUpperCase()}</span>
          {(microHovered || microSelected) && (
            <>
              <span style={{ color: '#334155', fontSize: 8 }}>›</span>
              <span style={{ color: '#a78bfa', fontSize: 8, fontWeight: 800 }}>
                {(microHovered ?? microSelected).id.toUpperCase()}
              </span>
            </>
          )}
        </div>
      )}

      {/* Layer legend in detail view */}
      {viewMode === 'detail' && (
        <div style={{
          position: 'absolute',
          bottom: 24, left: 16,
          zIndex: 30,
          fontFamily: 'system-ui, sans-serif',
          display: 'flex', flexDirection: 'column', gap: 4,
          background: 'rgba(3,13,26,0.88)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: '8px 12px',
          backdropFilter: 'blur(14px)',
        }}>
          <div style={{ color: '#475569', fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 2 }}>LAYER STACK</div>
          {[
            { label: 'NDVI Surface',   color: '#22c55e', y: 'Y +1.80' },
            { label: 'Moisture',       color: '#38bdf8', y: 'Y +1.60' },
            { label: 'Nutrients',      color: '#f59e0b', y: 'Y +1.40' },
            { label: 'Irrigation',     color: '#a78bfa', y: 'Y +1.20' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 2, background: l.color, borderRadius: 2 }} />
              <span style={{ color: '#94a3b8', fontSize: 8, fontWeight: 700, flex: 1 }}>{l.label}</span>
              <span style={{ color: '#334155', fontSize: 7 }}>{l.y}</span>
            </div>
          ))}
        </div>
      )}

      {/* Analysis panel (right side) */}
      <AnalysisPanel
        cell={panelCell}
        onClose={() => { setMicroSelected(null); setMicroHovered(null) }}
      />

      {/* Bottom hint */}
      <div style={{
        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
        color: '#334155', fontSize: 10, fontFamily: 'system-ui',
        pointerEvents: 'none', letterSpacing: '0.04em', whiteSpace: 'nowrap',
      }}>
        {viewMode === 'field'
          ? 'Click any cell to drill into detail view · Drag to rotate · Scroll to zoom'
          : 'Hover or click micro-cells to analyse · Use Back to return to field view'}
      </div>
    </div>
  )
}
