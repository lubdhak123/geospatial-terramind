'use client'

import { useMemo, useEffect, useState, useRef, useLayoutEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainMesh } from './TerrainMesh'

export interface RegionSceneProps {
  row: number
  col: number
  satelliteUrl: string
  heightmapUrl: string
  ndviUrl: string
  activeLayers: Record<string, boolean>
  selectedMicro?: {r: number, c: number} | null
  onSelectMicro?: (m: {r: number, c: number} | null) => void
}

export function RegionScene(props: RegionSceneProps) {
  return (
    <Canvas camera={{ position: [0, 8, 12], fov: 45 }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 25, 15]} intensity={1.5} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.5} color="#abcdef" />
      <RegionSceneInner {...props} />
    </Canvas>
  )
}

function RegionSceneInner({ row, col, satelliteUrl, heightmapUrl, ndviUrl, activeLayers, selectedMicro, onSelectMicro }: RegionSceneProps) {
  const cTex = useTexture(ndviUrl)
  cTex.colorSpace = THREE.SRGBColorSpace
  const hTex = useTexture(heightmapUrl)
  hTex.colorSpace = THREE.NoColorSpace

  const [hoveredMicro, setHoveredMicro] = useState<{r: number, c: number} | null>(null)

  // 1. Generate EXACT 1x1 geometry bounded UV segment for analytical layers
  const tx = -5 + col + 0.5
  const tz = -5 + row + 0.5

  const regionGeometry = useMemo(() => {
    // 32 segments is perfectly adequate for a 1x1 chunk while keeping vertex counts low
    const geo = new THREE.PlaneGeometry(1, 1, 32, 32)
    const uvs = geo.attributes.uv
    const minU = col / 10
    const maxV = (10 - row) / 10 // Plane top is v=1
    const minV = maxV - 0.1
    for (let i = 0; i < uvs.count; i++) {
       const u = uvs.getX(i)
       const v = uvs.getY(i)
       uvs.setXY(i, minU + u * 0.1, minV + v * 0.1)
    }
    return geo
  }, [row, col])

  // 2. Ultra-lightweight Dimmer Mask (10x10 pixels)
  const dimTex = useMemo(() => {
    const cvs = document.createElement('canvas')
    cvs.width = 10; cvs.height = 10;
    const ctx = cvs.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0,0,10,10)
    ctx.fillStyle = '#000000'
    ctx.fillRect(col, row, 1, 1)
    const tex = new THREE.CanvasTexture(cvs)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    return tex
  }, [row, col])

  // 3. Ultra-lightweight Micro Grid Highlight Mask (300x300 pixels mapped only to 1x1 region)
  const [gridTex, gridCtx] = useMemo(() => {
    const cvs = document.createElement('canvas')
    cvs.width = 300; cvs.height = 300;
    const ctx = cvs.getContext('2d')!
    const tex = new THREE.CanvasTexture(cvs)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    return [tex, ctx]
  }, [])

  useLayoutEffect(() => {
    if (!gridCtx) return
    gridCtx.clearRect(0, 0, 300, 300)
    const cw = 100

    if (selectedMicro) {
        gridCtx.fillStyle = 'rgba(0, 0, 0, 0.4)'
        gridCtx.fillRect(0, 0, 300, 300)
        gridCtx.clearRect(selectedMicro.c * cw, selectedMicro.r * cw, cw, cw)
        gridCtx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        gridCtx.fillRect(selectedMicro.c * cw, selectedMicro.r * cw, cw, cw)
    }

    if (hoveredMicro && (!selectedMicro || hoveredMicro.r !== selectedMicro.r || hoveredMicro.c !== selectedMicro.c)) {
      gridCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      gridCtx.fillRect(hoveredMicro.c * cw, hoveredMicro.r * cw, cw, cw)
    }

    gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    gridCtx.lineWidth = 2.0
    for (let i = 0; i <= 3; i++) {
        const p = i * cw
        gridCtx.beginPath(); gridCtx.moveTo(p, 0); gridCtx.lineTo(p, 300); gridCtx.stroke();
        gridCtx.beginPath(); gridCtx.moveTo(0, p); gridCtx.lineTo(300, p); gridCtx.stroke();
    }
    gridTex.needsUpdate = true
  }, [hoveredMicro?.r, hoveredMicro?.c, selectedMicro?.r, selectedMicro?.c, gridCtx, gridTex])

  // Removed aggressive dispose to support React Strict Mode

  const DSP = 1.5

  const meshMoist = useRef<THREE.Mesh>(null)
  const matMoist = useRef<THREE.MeshStandardMaterial>(null)
  const meshNutri = useRef<THREE.Mesh>(null)
  const meshRoots = useRef<THREE.Mesh>(null)
  const matRoots = useRef<THREE.MeshStandardMaterial>(null)
  const meshIrrig = useRef<THREE.Mesh>(null)
  const matIrrig = useRef<THREE.MeshStandardMaterial>(null)
  const meshDrain = useRef<THREE.Mesh>(null)
  
  const controlsRef = useRef<any>(null)
  const targetCamPos = useRef(new THREE.Vector3(0, 8, 12))
  const targetFocus = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (selectedMicro) {
       const stx = -5 + col + (selectedMicro.c + 0.5) * (1/3)
       const stz = -5 + row + (selectedMicro.r + 0.5) * (1/3)
       targetFocus.current.set(stx, 0, stz)
       targetCamPos.current.set(stx, 3.5, stz + 3.0) 
    } else {
       targetFocus.current.set(tx, 0, tz)
       targetCamPos.current.set(tx, 7.0, tz + 5.0) 
    }
  }, [selectedMicro, row, col, tx, tz])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    
    if (controlsRef.current) {
        controlsRef.current.target.lerp(targetFocus.current, delta * 3)
        controlsRef.current.update()
    }
    state.camera.position.lerp(targetCamPos.current, delta * 2.5)

    if (matMoist.current) matMoist.current.opacity = 0.6 + Math.sin(t * 1.5) * 0.1
    if (matIrrig.current) matIrrig.current.opacity = 0.3 + Math.max(0, Math.sin(t * 5)) * 0.5
    if (matRoots.current) matRoots.current.opacity = 0.4 + Math.sin(t * 0.5) * 0.05

    const lerpGroup = (mesh: any, active: boolean, targetY: number) => {
        if (!mesh.current) return;
        const targetPosY = active ? targetY : targetY - 0.5;
        mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, targetPosY, delta * 8)
        if (!active) mesh.current.visible = Math.abs(mesh.current.position.y - (targetY - 0.5)) > 0.05
        else mesh.current.visible = true
    }
    
    lerpGroup(meshMoist, activeLayers.moisture, -0.15)
    lerpGroup(meshNutri, activeLayers.nutrients, -0.30)
    lerpGroup(meshRoots, activeLayers.roots, -0.45)
    lerpGroup(meshIrrig, activeLayers.irrigation, -0.6)
    lerpGroup(meshDrain, activeLayers.drainage, -0.75)
  })

  // Full 10x10 base bounds needed for Dimmer overlay matching 1:1 with Terrain
  const baseTerrainGeometry = useMemo(() => new THREE.PlaneGeometry(10, 10, 64, 64), [])

  return (
      <group>
        <OrbitControls ref={controlsRef} makeDefault minDistance={0.5} maxDistance={25} maxPolarAngle={Math.PI / 2 - 0.02} />

        <TerrainMesh 
           satelliteUrl={satelliteUrl} heightmapUrl={heightmapUrl} displacementScale={DSP} 
        />

        {/* Global Field Dimmer spanning the full 10x10 terrain, dynamically punching out the selected Region location! */}
        <mesh geometry={baseTerrainGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
           <meshStandardMaterial 
             color="#000000" transparent opacity={0.65} depthWrite={false}
             alphaMap={dimTex} alphaTest={0.01}
             displacementMap={hTex} displacementScale={DSP}
           />
        </mesh>

        {/* Surface 1x1 Overlay strictly containing exact UV and position offsets to mimic cropping */}
        {activeLayers.surface && (
          <mesh 
            geometry={regionGeometry} 
            rotation={[-Math.PI / 2, 0, 0]} position={[tx, 0.015, tz]}
            onPointerMove={(e) => {
                e.stopPropagation();
                if (!e.uv) return;
                // Since this mesh's UV is intrinsically scaled mathematically above, e.uv still returns its mapped global bounds values!
                // To convert absolute mapped UV back to 0-1 for the 1x1 Region mesh locally:
                const localU = (e.uv.x - col/10) * 10
                const localV = (e.uv.y - (9-row)/10) * 10
                
                if (localU >= 0 && localU <= 1 && localV >= 0 && localV <= 1) {
                  const mr = Math.floor((1 - localV) * 3)
                  const mc = Math.floor(localU * 3)
                  if (mr >= 0 && mr < 3 && mc >= 0 && mc < 3) {
                     if (hoveredMicro?.r !== mr || hoveredMicro?.c !== mc) setHoveredMicro({ r: mr, c: mc });
                     document.body.style.cursor = 'pointer'
                  }
                }
            }}
            onPointerLeave={() => {
                setHoveredMicro(null);
                document.body.style.cursor = 'default'
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (hoveredMicro) {
                    if (selectedMicro?.r === hoveredMicro.r && selectedMicro?.c === hoveredMicro.c) {
                        onSelectMicro?.(null)
                    } else {
                        onSelectMicro?.(hoveredMicro)
                    }
                }
            }}
          >
            <meshStandardMaterial map={cTex} displacementMap={hTex} displacementScale={DSP} depthWrite={true} />
          </mesh>
        )}

        {/* Visual 1x1 Highlighter Grid Layer */}
        {activeLayers.surface && (
          <mesh geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, 0.02, tz]}>
             <meshStandardMaterial map={gridTex} transparent opacity={1} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
          </mesh>
        )}

        {/* Subsurface Analytical Stack (1x1 Mapped directly underneath Region) */}
        <mesh ref={meshMoist} geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, -0.15, tz]}>
          <meshStandardMaterial ref={matMoist} color="#1d4ed8" transparent opacity={0.6} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
        </mesh>
        <mesh ref={meshNutri} geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, -0.3, tz]}>
          <meshStandardMaterial color="#78350f" transparent opacity={0.7} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
        </mesh>
        <mesh ref={meshRoots} geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, -0.45, tz]}>
          <meshStandardMaterial ref={matRoots} color="#c2410c" transparent opacity={0.4} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
        </mesh>
        <mesh ref={meshIrrig} geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, -0.6, tz]}>
          <meshStandardMaterial ref={matIrrig} color="#0ea5e9" wireframe transparent opacity={0.3} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
        </mesh>
        <mesh ref={meshDrain} geometry={regionGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[tx, -0.75, tz]}>
          <meshStandardMaterial color="#475569" transparent opacity={0.5} depthWrite={false} displacementMap={hTex} displacementScale={DSP} />
        </mesh>
      </group>
  )
}
