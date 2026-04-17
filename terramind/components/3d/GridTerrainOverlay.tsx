'use client'

/**
 * GridTerrainOverlay.tsx  ── LAYER MANAGER SYSTEM
 *
 * One active layer at a time, anchored to terrain geometry.
 * Layers: ndvi | moisture | nutrients | satellite (health) | disease | yield
 *
 * FIELD VIEW  → full 10×10 grid colored by active layer, click any cell
 * Each cell anchors to terrain height via heightmap sampling
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  FIELD_GRID,
  ndviColor,
  type AnalyzedCell,
} from '@/lib/fieldDataEngine'
import type { ActiveLayer } from './FieldScene'

// ─────────────────────────────────────────────────────────────
// TERRAIN HEIGHT SAMPLER (Reads heightmap statically)
// ─────────────────────────────────────────────────────────────
let heightData: Uint8Array | null = null;
let heightMapResolving = false;
export function initGetTerrainHeight() {
  if (heightData || heightMapResolving || typeof document === 'undefined') return;
  heightMapResolving = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/textures/heightmap.png';
  img.onload = () => {
    const cvs = document.createElement('canvas');
    cvs.width = img.width; cvs.height = img.height;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      heightData = new Uint8Array(img.width * img.height);
      for (let i = 0; i < heightData.length; i++) {
        heightData[i] = data[i * 4];
      }
    }
  };
}

export function getTerrainHeight(x: number, z: number): number {
  if (!heightData) return 1.72; // fallback
  const px = Math.floor(Math.min(511, Math.max(0, ((x + 5) / 10) * 512)));
  const pz = Math.floor(Math.min(511, Math.max(0, ((z + 5) / 10) * 512)));
  const v = heightData[pz * 512 + px] / 255.0;
  return v * 1.5; // displacementScale
}

export function getTerrainNormal(x: number, z: number): THREE.Vector3 {
  const d = 0.1;
  const hL = getTerrainHeight(x - d, z);
  const hR = getTerrainHeight(x + d, z);
  const hD = getTerrainHeight(x, z - d);
  const hU = getTerrainHeight(x, z + d);
  return new THREE.Vector3(hL - hR, 2 * d, hD - hU).normalize();
}

// ─────────────────────────────────────────────────────────────
// LAYER CONFIG  — minimal offset so cells hug terrain surface
// ─────────────────────────────────────────────────────────────
const LAYER_OFFSET: Record<ActiveLayer, number> = {
  satellite: 0.008,
  ndvi:      0.008,
  soil:      0.008,
  disease:   0.008,
  yield:     0.008,
}

// Per-layer cell color function
function layerCellColor(ac: AnalyzedCell, layer: ActiveLayer): string {
  switch (layer) {
    case 'ndvi':
      return ndviColor(ac.ndvi)
    case 'soil': {
      // Warmer orange for deficient, cooler amber for adequate
      const n = Math.max(0, Math.min(1, (ac.nitrogen - 80) / 140))
      const r = Math.round(255)
      const g = Math.round(60 + n * 140)
      return `rgb(${r},${g},20)`
    }
    case 'disease': {
      const risk = ac.analysis.disease_risk === 'critical' ? 1
        : ac.analysis.disease_risk === 'high' ? 0.75
        : ac.analysis.disease_risk === 'medium' ? 0.45
        : 0.15
      return `hsl(0, ${Math.round(50 + risk * 50)}%, ${Math.round(18 + risk * 32)}%)`
    }
    case 'yield': {
      const y = ac.analysis.yield_qtl_acre ?? 40
      const t = Math.max(0, Math.min(1, (y - 25) / 30))
      // Brown (dry/low) → yellow-green → rich green (high yield)
      if (t < 0.33) return `rgb(${Math.round(140 - t * 60)},${Math.round(80 + t * 60)},${Math.round(20)})`
      if (t < 0.66) return `rgb(${Math.round(120 - t * 60)},${Math.round(160 + t * 40)},${Math.round(30)})`
      return `rgb(${Math.round(20 + (1-t)*60)},${Math.round(160 + t * 60)},${Math.round(30 + t * 20)})`
    }
    case 'satellite':
    default:
      return ndviColor(ac.ndvi)
  }
}

// Per-layer fill opacity — slightly higher base so cells read clearly
function layerFillOpacity(isActive: boolean, isHovered: boolean): number {
  if (isHovered) return 0.50
  if (isActive) return 0.22
  return 0.05
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const TW     = 10, TH = 10
const GRID_N = 10

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

/** Terrain bounds for any (row, col) in the 10×10 field grid */
function cellBounds(row: number, col: number) {
  const cw = TW / GRID_N
  const ch = TH / GRID_N
  return {
    x: -TW / 2 + col * cw,
    z: -TH / 2 + row * ch,
    w: cw, h: ch,
  }
}

// ─────────────────────────────────────────────────────────────
// FIELD CELL  (terrain-anchored, layer-aware)
// ─────────────────────────────────────────────────────────────
function FieldCell({
  ac, row, col,
  isHovered, isSelected, activeLayer,
  onClick, onHover, onLeave,
}: {
  ac: AnalyzedCell | null
  row: number; col: number
  isHovered: boolean
  isSelected: boolean
  activeLayer: ActiveLayer
  onClick: () => void
  onHover: () => void
  onLeave: () => void
}) {
  const meshRef   = useRef<THREE.Mesh>(null!)
  const groupRef  = useRef<THREE.Group>(null!)
  const { x, z, w, h } = useMemo(() => cellBounds(row, col), [row, col])
  const cx = x + w / 2,  cz = z + h / 2

  const color = ac ? layerCellColor(ac, activeLayer) : '#475569'
  const elevationOffset = LAYER_OFFSET[activeLayer] ?? 0.02

  // Smooth opacity lerp toward target
  const targetOp = isSelected ? 0.60 : isHovered ? layerFillOpacity(true, true) : layerFillOpacity(true, false)
  useFrame(({ clock }) => {
    if (!meshRef.current || !groupRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    // Eased opacity transition — feels premium, no sudden jump
    mat.opacity += (targetOp - mat.opacity) * 0.08
    // Terrain anchoring
    const th = getTerrainHeight(cx, cz)
    const tn = getTerrainNormal(cx, cz)
    groupRef.current.position.set(cx, th + elevationOffset, cz)
    groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tn)
  })

  const w2 = w / 2, h2 = h / 2
  const border = useMemo(() => [
    new THREE.Vector3(-w2, 0.002, -h2),
    new THREE.Vector3( w2, 0.002, -h2),
    new THREE.Vector3( w2, 0.002,  h2),
    new THREE.Vector3(-w2, 0.002,  h2),
    new THREE.Vector3(-w2, 0.002, -h2),
  ], [w2, h2])

  // Glow pulse for selected cell — gentler frequency feels less jarring
  const glowRef = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const mat = glowRef.current.material as THREE.MeshBasicMaterial
    const t = clock.getElapsedTime()
    // Slow breathe (2.5Hz) for selection; faint shimmer for hover
    const pulse = isSelected
      ? 0.12 + Math.sin(t * 2.5) * 0.07
      : isHovered ? 0.06 + Math.sin(t * 4) * 0.03
      : 0
    mat.opacity += (pulse - mat.opacity) * 0.10
  })

  return (
    <group ref={groupRef} position={[cx, 1.72, cz]}>
      {/* Fill plane */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover() }}
        onPointerLeave={onLeave}
      >
        <planeGeometry args={[w * 0.96, h * 0.96]} />
        <meshBasicMaterial
          color={color}
          transparent opacity={0.07}
          depthWrite={false} depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Selection glow ring */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
        <planeGeometry args={[w * 0.96, h * 0.96]} />
        <meshBasicMaterial
          color={color}
          transparent opacity={0}
          depthWrite={false} depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid border line */}
      <Line
        points={border} color={color}
        lineWidth={isSelected ? 2.5 : isHovered ? 1.8 : 0.4}
        transparent opacity={isSelected ? 1.0 : isHovered ? 0.85 : 0.12}
        depthWrite={false}
      />

      {/* Hover tooltip */}
      {isHovered && ac && (
        <Html
          position={[0, 0.42, 0]}
          center distanceFactor={10}
          zIndexRange={[60, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: 'system-ui',
            background: `linear-gradient(135deg, ${color}22, rgba(3,13,26,0.96))`,
            border: `1px solid ${color}60`,
            borderRadius: 10, padding: '7px 11px',
            backdropFilter: 'blur(14px)',
            whiteSpace: 'nowrap', minWidth: 170,
            boxShadow: `0 4px 20px ${color}25`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ color, fontSize: 9, fontWeight: 900, letterSpacing: '0.06em' }}>ZONE {row + 1}–{col + 1}</span>
              <span style={{ color: '#334155', fontSize: 8, marginLeft: 'auto' }}>
                {activeLayer.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 8px', marginBottom: 5 }}>
              {[
                { l: 'Yield',   v: `${ac.analysis.yield_qtl_acre}q/ac`, c: '#a78bfa' },
                { l: 'Water',   v: `${Math.round(ac.moisture * 100)}%`,  c: '#38bdf8' },
                { l: 'Health',  v: ac.ndvi.toFixed(2),                   c: '#22c55e' },
              ].map(m => (
                <div key={m.l} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#475569', fontSize: 6.5, fontWeight: 700 }}>{m.l}</span>
                  <span style={{ color: m.c, fontSize: 10, fontWeight: 900 }}>{m.v}</span>
                </div>
              ))}
            </div>
            {ac.analysis.action_required && (
              <div style={{ color: '#fbbf24', fontSize: 7.5, fontWeight: 800, marginBottom: 4 }}>
                ⚡ {ac.analysis.primary_alert}
              </div>
            )}
            <div style={{ color: '#38bdf8', fontSize: 7.5, fontWeight: 800 }}>
              → Click for detail analysis
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT — GridTerrainOverlay
// ─────────────────────────────────────────────────────────────
export function GridTerrainOverlay({
  activeLayer = 'satellite',
  onCellSelect,
}: {
  activeLayer?: ActiveLayer
  onCellSelect?: (ac: AnalyzedCell, row: number, col: number) => void
}) {
  useEffect(() => {
    initGetTerrainHeight();
  }, []);

  const [hoveredId,  setHoveredId]  = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fieldData = useMemo(
    () => FIELD_GRID.map((row, ri) => row.map((ac, ci) => ({ ac, ri, ci }))),
    [],
  )

  const handleFieldClick = useCallback((ac: AnalyzedCell | null, row: number, col: number) => {
    const id = `${row}_${col}`
    setSelectedId(prev => prev === id ? null : id)
    if (ac && onCellSelect) onCellSelect(ac, row, col)
  }, [onCellSelect])

  return (
    <group>
      {fieldData.map(row =>
        row.map(({ ac, ri, ci }) => {
          const id = `${ri}_${ci}`
          return (
            <FieldCell
              key={`fc_${ri}_${ci}`}
              ac={ac} row={ri} col={ci}
              activeLayer={activeLayer}
              isHovered={hoveredId === id}
              isSelected={selectedId === id}
              onClick={() => handleFieldClick(ac, ri, ci)}
              onHover={() => setHoveredId(id)}
              onLeave={() => setHoveredId(null)}
            />
          )
        })
      )}
    </group>
  )
}
