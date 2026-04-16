'use client'

import { useRef } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export interface NDVIOverlayProps {
  ndviUrl: string
  heightmapUrl: string
  displacementScale?: number
  visible: boolean
  opacity?: number
  width?: number
  height?: number
}

export function NDVIOverlay({
  ndviUrl,
  heightmapUrl,
  displacementScale = 1.5,
  visible,
  opacity = 0.6,
  width = 10,
  height = 10,
}: NDVIOverlayProps) {
  const [ndviTex, heightmapTex] = useTexture([ndviUrl, heightmapUrl])

  ndviTex.wrapS = ndviTex.wrapT = THREE.ClampToEdgeWrapping
  ndviTex.minFilter = THREE.LinearFilter
  ndviTex.magFilter = THREE.LinearFilter

  heightmapTex.wrapS = heightmapTex.wrapT = THREE.ClampToEdgeWrapping
  heightmapTex.minFilter = THREE.LinearFilter
  heightmapTex.magFilter = THREE.LinearFilter
  heightmapTex.colorSpace = THREE.NoColorSpace

  if (!visible) return null

  return (
    <mesh
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={[width, height, 256, 256]} />
      <meshStandardMaterial
        map={ndviTex}
        displacementMap={heightmapTex}
        displacementScale={displacementScale}
        transparent={true}
        opacity={opacity}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  )
}
