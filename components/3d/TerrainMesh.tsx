'use client'

import { useRef } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export interface TerrainMeshProps {
  satelliteUrl: string
  heightmapUrl: string
  displacementScale?: number
  width?: number
  height?: number
  segments?: number
  onClick?: (point: THREE.Vector3) => void
  onHover?: (point: THREE.Vector3) => void
  onHoverEnd?: () => void
}

export function TerrainMesh({
  satelliteUrl,
  heightmapUrl,
  displacementScale = 1.5,
  width = 10,
  height = 10,
  segments = 256,
  onClick,
  onHover,
  onHoverEnd,
}: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const [satelliteTex, heightmapTex] = useTexture([satelliteUrl, heightmapUrl])

  // Satellite texture settings
  satelliteTex.wrapS = satelliteTex.wrapT = THREE.ClampToEdgeWrapping
  satelliteTex.minFilter = THREE.LinearMipmapLinearFilter
  satelliteTex.magFilter = THREE.LinearFilter
  satelliteTex.anisotropy = 16
  satelliteTex.colorSpace = THREE.SRGBColorSpace

  // FIX 1: Heightmap must use NoColorSpace so raw luminance drives displacement
  heightmapTex.wrapS = heightmapTex.wrapT = THREE.ClampToEdgeWrapping
  heightmapTex.minFilter = THREE.LinearFilter
  heightmapTex.magFilter = THREE.LinearFilter
  heightmapTex.colorSpace = THREE.NoColorSpace

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
      onClick={(e) => {
        // Don't stopPropagation — let GridTerrainOverlay cell planes (at y=1.7)
        // intercept first via renderOrder. Terrain click fires only if no cell consumed it.
        if (onClick) onClick(e.point)
      }}
      onPointerMove={(e) => {
        if (onHover) onHover(e.point)
      }}
      onPointerOut={() => {
        if (onHoverEnd) onHoverEnd()
      }}
    >
      <planeGeometry args={[width, height, segments, segments]} />
      <meshStandardMaterial
        color="#324522" // Fallback color base so invalid tiles aren't pitch black
        map={satelliteTex}
        displacementMap={heightmapTex}
        displacementScale={displacementScale}
        roughness={0.85}
        metalness={0.0}
        envMapIntensity={0.0}
      />
    </mesh>
  )
}
