'use client'

/**
 * TerrainGridCamera.tsx
 * Animates camera to the specific terrain region when the grid is drilled into.
 * Reads drillPath from hierarchyStore and smoothly flies to the sub-region.
 */

import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  useHierarchyStore,
  type HierarchyCell,
} from '@/lib/hierarchyStore'

// ── Constants ────────────────────────────────────────────────────────────
const TERRAIN_WIDTH  = 10
const TERRAIN_HEIGHT = 10

function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

// ── Compute 3D view bounds from drill path (same logic as overlay) ─────
function computeViewBounds(drillPath: { cell: HierarchyCell; gridSize: number }[]) {
  let x = -TERRAIN_WIDTH  / 2
  let z = -TERRAIN_HEIGHT / 2
  let w = TERRAIN_WIDTH
  let h = TERRAIN_HEIGHT

  for (const entry of drillPath) {
    const cell = entry.cell
    const gs   = entry.gridSize
    const cw   = w / gs
    const ch   = h / gs
    x += cell.col * cw
    z += cell.row * ch
    w = cw
    h = ch
  }

  return { x, z, w, h }
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════
export function TerrainGridCamera({
  controlsRef,
  enabled = true,
}: {
  controlsRef: React.RefObject<any>
  enabled?: boolean
}) {
  const { camera } = useThree()
  const { drillPath } = useHierarchyStore()

  // Fly animation refs
  const fly = useRef({
    active:      false,
    elapsed:     0,
    duration:    1.2,
    startPos:    new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPos:      new THREE.Vector3(),
    endTarget:   new THREE.Vector3(),
  })

  const prevPathLen = useRef(drillPath.length)

  // Compute target camera position for current drill depth
  const cameraTarget = useMemo(() => {
    const bounds = computeViewBounds(drillPath)
    const cx = bounds.x + bounds.w / 2
    const cz = bounds.z + bounds.h / 2
    const regionSize = Math.max(bounds.w, bounds.h)

    // Camera height and distance scale with region size
    const camY      = Math.max(2.5, regionSize * 0.8)
    const camZOff   = Math.max(1.5, regionSize * 0.5)

    // Grid planes sit at y=1.7 — look at that height so sub-cells are centered in view
    const gridY = drillPath.length > 0 ? 1.7 : 0
    return {
      pos:    new THREE.Vector3(cx + regionSize * 0.15, camY, cz + camZOff),
      lookAt: new THREE.Vector3(cx, gridY, cz),
    }
  }, [drillPath])

  // Start fly animation when drillPath changes
  useEffect(() => {
    if (!enabled || !controlsRef.current) return

    // Only animate if the depth actually changed
    if (drillPath.length === prevPathLen.current) return
    prevPathLen.current = drillPath.length

    const f = fly.current
    f.startPos.copy(camera.position)
    f.startTarget.copy(controlsRef.current.target)
    f.endPos.copy(cameraTarget.pos)
    f.endTarget.copy(cameraTarget.lookAt)
    f.elapsed  = 0
    f.duration = 1.2
    f.active   = true

    // Disable OrbitControls during animation
    controlsRef.current.enabled = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillPath, cameraTarget, enabled])

  useFrame((_, delta) => {
    if (!controlsRef.current || !enabled) return

    const f = fly.current
    if (!f.active) return

    f.elapsed += delta
    const t = Math.min(f.elapsed / f.duration, 1)
    const e = easeInOutQuart(t)

    camera.position.lerpVectors(f.startPos, f.endPos, e)
    controlsRef.current.target.lerpVectors(f.startTarget, f.endTarget, e)
    controlsRef.current.update()

    if (t >= 1) {
      f.active = false
      controlsRef.current.enabled = true
    }
  })

  return null
}
