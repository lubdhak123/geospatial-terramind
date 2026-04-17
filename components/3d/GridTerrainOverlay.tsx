'use client'

/**
 * GridTerrainOverlay.tsx  ── CLEAN 2-LEVEL SYSTEM
 *
 * FIELD VIEW  → full 10×10 NDVI-colored grid, click any cell
 * DETAIL VIEW → clicked region isolated, 3×3 micro-grid with
 *               stacked subsurface layers (NDVI / Moisture / Nutrients / Pipes)
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  FIELD_GRID,
  ndviColor,
  RISK_COLOR as ENGINE_RISK_COLOR,
  useFieldStore,
  type AnalyzedCell,
} from '@/lib/fieldDataEngine'
import { useHierarchyStore } from '@/lib/hierarchyStore'
import { useRouter } from 'next/navigation'

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
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const TY     = 1.72   // plane height above terrain base
const TW     = 10, TH = 10
const GRID_N = 10     // 10×10 field
const MICRO_N = 3     // 3×3 micro grid inside selected cell

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

/** Deterministic seeded noise [0, 1) */
function seed(a: number, b: number, c: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 93.3 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

// ─────────────────────────────────────────────────────────────
// FIELD CELL  (Level 1 — thin colored tile)
// ─────────────────────────────────────────────────────────────
function FieldCell({
  ac, row, col,
  isHovered, onClick, onHover, onLeave,
}: {
  ac: AnalyzedCell | null
  row: number; col: number
  isHovered: boolean
  onClick: () => void; onHover: () => void; onLeave: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { x, z, w, h } = useMemo(() => cellBounds(row, col), [row, col])
  const cx = x + w / 2,  cz = z + h / 2
  const color = ac ? ndviColor(ac.ndvi) : '#475569'

  const targetOp = isHovered ? 0.38 : 0.07
  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity += (targetOp - mat.opacity) * 0.1
    // Dynamic height and tilt (in case heightData loads asynchronously)
    const h = getTerrainHeight(cx, cz)
    const n = getTerrainNormal(cx, cz)
    meshRef.current.parent!.position.set(cx, h + 0.02, cz)
    meshRef.current.parent!.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  })

  // Local bounds for border relative to cell center
  const w2 = w / 2, h2 = h / 2
  const border = useMemo(() => [
    new THREE.Vector3(-w2, 0.01, -h2),
    new THREE.Vector3(w2,  0.01, -h2),
    new THREE.Vector3(w2,  0.01, h2),
    new THREE.Vector3(-w2, 0.01, h2),
    new THREE.Vector3(-w2, 0.01, -h2),
  ], [w2, h2])

  return (
    <group position={[cx, 1.72, cz]}>
      {/* Fill */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={4}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={(e) => { e.stopPropagation(); onHover() }}
        onPointerLeave={onLeave}
      >
        <planeGeometry args={[w * 0.97, h * 0.97]} />
        <meshBasicMaterial
          color={color}
          transparent opacity={0.07}
          depthWrite={false} depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border */}
      <Line
        points={border} color={color}
        lineWidth={isHovered ? 1.8 : 0.7}
        transparent opacity={isHovered ? 0.88 : 0.30}
        depthWrite={false}
      />

      {/* Hover tooltip */}
      {isHovered && ac && (
        <Html
          position={[0, 0.36, 0]}
          center distanceFactor={10}
          zIndexRange={[60, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: 'system-ui',
            background: `linear-gradient(135deg, ${color}22, rgba(3,13,26,0.95))`,
            border: `1px solid ${color}55`,
            borderRadius: 10, padding: '6px 10px',
            backdropFilter: 'blur(12px)',
            whiteSpace: 'nowrap', minWidth: 160,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ color, fontSize: 9, fontWeight: 900 }}>Zone {row + 1}-{col + 1}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px', marginBottom: 4 }}>
              {[
                { l: 'NDVI',  v: ac.ndvi.toFixed(2),                  c: color     },
                { l: 'H₂O',   v: `${Math.round(ac.moisture * 100)}%`, c: '#38bdf8' },
                { l: 'Yield', v: `${ac.analysis.yield_qtl_acre}q`,     c: '#a78bfa' },
              ].map(m => (
                <div key={m.l} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#475569', fontSize: 6.5 }}>{m.l}</span>
                  <span style={{ color: m.c, fontSize: 9, fontWeight: 900 }}>{m.v}</span>
                </div>
              ))}
            </div>
            {ac.analysis.action_required && (
              <div style={{ color, fontSize: 7, fontWeight: 800, marginBottom: 3 }}>
                ⚡ {ac.analysis.primary_alert}
              </div>
            )}
            <div style={{ color: '#38bdf8', fontSize: 7, fontWeight: 800 }}>
              → Click to open detail analysis
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT — GridTerrainOverlay (no props needed)
// ─────────────────────────────────────────────────────────────
export function GridTerrainOverlay() {
  useEffect(() => {
    initGetTerrainHeight();
  }, []);

  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // ── Pre-compute field data
  const fieldData = useMemo(
    () => FIELD_GRID.map((row, ri) => row.map((ac, ci) => ({ ac, ri, ci }))),
    [],
  )

  // ── Navigate to Region
  const handleFieldClick = useCallback((ac: AnalyzedCell | null, row: number, col: number) => {
    router.push(`/field/region/${row}-${col}`)
  }, [router])

  return (
    <group>
      {fieldData.map(row =>
        row.map(({ ac, ri, ci }) => (
          <FieldCell
            key={`fc_${ri}_${ci}`}
            ac={ac} row={ri} col={ci}
            isHovered={hoveredId === `${ri}_${ci}`}
            onClick={() => handleFieldClick(ac, ri, ci)}
            onHover={() => setHoveredId(`${ri}_${ci}`)}
            onLeave={() => setHoveredId(null)}
          />
        ))
      )}
    </group>
  )
}
