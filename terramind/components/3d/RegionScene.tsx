'use client'

import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainMesh } from './TerrainMesh'
import { IrrigationPipes } from './IrrigationPipes'
import { FIELD_GRID } from '@/lib/fieldDataEngine'

export interface RegionSceneProps {
  row: number
  col: number
  satelliteUrl: string
  heightmapUrl: string
  ndviUrl: string
  activeLayers: Record<string, boolean>
  selectedMicro?: { r: number, c: number } | null
  onSelectMicro?: (m: { r: number, c: number } | null) => void
}

type MicroCellData = {
  id: string
  r: number
  c: number
  x: number
  z: number
  ndvi: number
  moisture: number
  nitrogen: number
  yield: number
  disease: number
  irrigationUrgency: 'none' | 'schedule' | 'soon' | 'immediate'
}

const REGION_SIZE = 1
const MICRO_GRID = 3
const MICRO_SIZE = REGION_SIZE / MICRO_GRID
const DISPLACEMENT_SCALE = 1.5
const TERRAIN_SIZE = 10
const CELL_LIFT = 0.014

function getMicroVar(row: number, col: number, mr: number, mc: number, base: number, variance: number) {
  const seed = (row * 12.3) + (col * 45.6) + (mr * 7.8) + (mc * 9.1)
  const noise = Math.sin(seed * 43758.5453) * variance
  return base + noise
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function severityColor(score: number) {
  if (score >= 0.72) return '#ef4444'
  if (score >= 0.46) return '#f59e0b'
  return '#22c55e'
}

function waterColor(score: number) {
  if (score >= 0.7) return '#38bdf8'
  if (score >= 0.42) return '#60a5fa'
  return '#1d4ed8'
}

function sampleImageChannel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
) {
  const px = THREE.MathUtils.clamp(u, 0, 0.9999) * (width - 1)
  const py = THREE.MathUtils.clamp(v, 0, 0.9999) * (height - 1)
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const x1 = Math.min(x0 + 1, width - 1)
  const y1 = Math.min(y0 + 1, height - 1)
  const tx = px - x0
  const ty = py - y0

  const idx = (x: number, y: number) => (y * width + x) * 4
  const c00 = pixels[idx(x0, y0)] / 255
  const c10 = pixels[idx(x1, y0)] / 255
  const c01 = pixels[idx(x0, y1)] / 255
  const c11 = pixels[idx(x1, y1)] / 255

  const top = c00 * (1 - tx) + c10 * tx
  const bottom = c01 * (1 - tx) + c11 * tx
  return top * (1 - ty) + bottom * ty
}

function createTerrainHeightSampler(heightmapTex: THREE.Texture, displacementScale: number) {
  const source = heightmapTex.image as CanvasImageSource & { width?: number; height?: number } | undefined

  if (!source || !source.width || !source.height) {
    return {
      getTerrainHeight: (_x: number, _z: number) => 0,
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    return {
      getTerrainHeight: (_x: number, _z: number) => 0,
    }
  }

  ctx.drawImage(source, 0, 0, source.width, source.height)
  const pixels = ctx.getImageData(0, 0, source.width, source.height).data

  return {
    getTerrainHeight: (x: number, z: number) => {
      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE
      const v = 1 - (z + TERRAIN_SIZE / 2) / TERRAIN_SIZE
      return sampleImageChannel(pixels, source.width!, source.height!, u, v) * displacementScale
    },
  }
}

function buildTerrainCellGeometry(
  x0: number,
  z0: number,
  size: number,
  getTerrainHeight: (x: number, z: number) => number,
  segments = 8,
  lift = CELL_LIFT,
) {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let rz = 0; rz <= segments; rz++) {
    const vz = rz / segments
    const z = z0 + vz * size
    for (let rx = 0; rx <= segments; rx++) {
      const vx = rx / segments
      const x = x0 + vx * size
      positions.push(x, getTerrainHeight(x, z) + lift, z)
      uvs.push(vx, 1 - vz)
    }
  }

  for (let rz = 0; rz < segments; rz++) {
    for (let rx = 0; rx < segments; rx++) {
      const a = rz * (segments + 1) + rx
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function buildTerrainBorder(
  x0: number,
  z0: number,
  size: number,
  getTerrainHeight: (x: number, z: number) => number,
  lift = CELL_LIFT + 0.01,
  steps = 6,
) {
  const points: THREE.Vector3[] = []
  const pushEdge = (fromX: number, fromZ: number, toX: number, toZ: number, includeLast: boolean) => {
    for (let i = 0; i <= steps; i++) {
      if (!includeLast && i === steps) continue
      const t = i / steps
      const x = THREE.MathUtils.lerp(fromX, toX, t)
      const z = THREE.MathUtils.lerp(fromZ, toZ, t)
      points.push(new THREE.Vector3(x, getTerrainHeight(x, z) + lift, z))
    }
  }

  pushEdge(x0, z0, x0 + size, z0, false)
  pushEdge(x0 + size, z0, x0 + size, z0 + size, false)
  pushEdge(x0 + size, z0 + size, x0, z0 + size, false)
  pushEdge(x0, z0 + size, x0, z0, true)
  return points
}

function getCellSignals(cell: MicroCellData) {
  const healthRisk = clamp01((1 - cell.ndvi) * 0.55 + cell.disease * 0.45)
  const moistureRisk = clamp01(1 - cell.moisture)
  const nutrientRisk = clamp01((190 - cell.nitrogen) / 90)
  const irrigationRisk = cell.irrigationUrgency === 'immediate'
    ? 1
    : cell.irrigationUrgency === 'soon'
      ? 0.7
      : cell.irrigationUrgency === 'schedule'
        ? 0.42
        : 0.18

  return {
    health: { score: healthRisk, color: severityColor(healthRisk) },
    moisture: { score: cell.moisture, color: waterColor(cell.moisture) },
    nutrients: { score: nutrientRisk, color: severityColor(nutrientRisk) },
    irrigation: { score: irrigationRisk, color: irrigationRisk >= 0.7 ? '#38bdf8' : '#60a5fa' },
  }
}

function buildBeybladeTexture(cell: MicroCellData, activeLayers: Record<string, boolean>) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const center = 128
  const outer = 96
  const inner = 26
  const signals = getCellSignals(cell)

  const sectors = [
    { key: 'surface', start: -Math.PI / 2, end: 0, color: signals.health.color, strength: signals.health.score },
    { key: 'moisture', start: 0, end: Math.PI / 2, color: signals.moisture.color, strength: clamp01(1 - signals.moisture.score + 0.15) },
    { key: 'nutrients', start: Math.PI / 2, end: Math.PI, color: signals.nutrients.color, strength: signals.nutrients.score },
    { key: 'irrigation', start: Math.PI, end: Math.PI * 1.5, color: signals.irrigation.color, strength: signals.irrigation.score },
  ] as const

  ctx.clearRect(0, 0, 256, 256)
  ctx.fillStyle = 'rgba(6, 16, 15, 0.46)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 220, 220, 28)
  ctx.fill()

  sectors.forEach((sector) => {
    const emphasized = activeLayers[sector.key] ?? false
    const alpha = emphasized ? 0.78 : 0.28
    const fillOpacity = Math.round((0.18 + sector.strength * alpha) * 255).toString(16).padStart(2, '0')

    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.arc(center, center, outer, sector.start, sector.end)
    ctx.closePath()
    ctx.fillStyle = `${sector.color}${fillOpacity}`
    ctx.fill()
  })

  ctx.strokeStyle = 'rgba(8, 24, 22, 0.9)'
  ctx.lineWidth = 8
  for (let i = 0; i < 4; i++) {
    const angle = -Math.PI / 2 + i * (Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(center, center, inner, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(7, 18, 18, 0.92)'
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(18, 18, 220, 220, 28)
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(191, 202, 186, 0.18)'
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return { texture, accent: signals.health.color }
}

function TerrainPlaceholder() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10, 64, 64]} />
      <meshStandardMaterial color="#1a3a1a" roughness={0.92} metalness={0} />
    </mesh>
  )
}

function CameraRig({
  regionCenter,
  selectedMicro,
  microCells,
  controlsRef,
  getTerrainHeight,
}: {
  regionCenter: { x: number; z: number }
  selectedMicro?: { r: number; c: number } | null
  microCells: MicroCellData[]
  controlsRef: React.RefObject<any>
  getTerrainHeight: (x: number, z: number) => number
}) {
  const { camera } = useThree()
  const desiredPos = useRef(new THREE.Vector3(regionCenter.x + 0.34, 5.0, regionCenter.z + 3.25))
  const desiredTarget = useRef(new THREE.Vector3(regionCenter.x, 0.08, regionCenter.z))

  useFrame((_, delta) => {
    const selected = selectedMicro
      ? microCells.find((cell) => cell.r === selectedMicro.r && cell.c === selectedMicro.c)
      : null

    if (selected) {
      const groundY = getTerrainHeight(selected.x, selected.z)
      desiredTarget.current.set(selected.x, groundY + 0.1, selected.z)
      desiredPos.current.set(selected.x + 0.26, groundY + 4.4, selected.z + 2.8)
    } else {
      const groundY = getTerrainHeight(regionCenter.x, regionCenter.z)
      desiredTarget.current.set(regionCenter.x, groundY + 0.08, regionCenter.z)
      desiredPos.current.set(regionCenter.x + 0.34, groundY + 5.0, regionCenter.z + 3.25)
    }

    camera.position.lerp(desiredPos.current, delta * 2.8)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, delta * 3.2)
      controlsRef.current.update()
    } else {
      camera.lookAt(desiredTarget.current)
    }
  })

  return null
}

function MicroCellTile({
  cell,
  geometry,
  borderPoints,
  activeLayers,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onSelect,
}: {
  cell: MicroCellData
  geometry: THREE.BufferGeometry
  borderPoints: THREE.Vector3[]
  activeLayers: Record<string, boolean>
  isHovered: boolean
  isSelected: boolean
  onHover: () => void
  onLeave: () => void
  onSelect: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)

  const { texture, accent } = useMemo(() => buildBeybladeTexture(cell, activeLayers), [cell, activeLayers])

  useFrame(({ clock }, delta) => {
    if (!meshRef.current || !materialRef.current || !glowRef.current) return

    const targetY = isSelected ? 0.022 : isHovered ? 0.012 : 0
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, delta * 9)
    materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
      materialRef.current.emissiveIntensity,
      isSelected ? 0.32 : isHovered ? 0.16 : 0.05,
      delta * 8,
    )

    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
    const pulse = isSelected ? 0.16 + Math.sin(clock.elapsedTime * 3.5) * 0.04 : isHovered ? 0.09 : 0.02
    glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, pulse, delta * 10)
    glowRef.current.position.y = meshRef.current.position.y + 0.004
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        renderOrder={6}
        onPointerEnter={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
          onHover()
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default'
          onLeave()
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <meshStandardMaterial
          ref={materialRef}
          color="#f8fafc"
          map={texture}
          transparent
          opacity={isSelected ? 0.96 : isHovered ? 0.88 : 0.82}
          depthWrite={false}
          roughness={0.78}
          metalness={0}
          emissive={accent}
          emissiveIntensity={0.05}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <mesh
        ref={glowRef}
        geometry={geometry}
        position={[0, 0.004, 0]}
        scale={[1.03, 1.03, 1.03]}
        renderOrder={5}
      >
        <meshBasicMaterial color={accent} transparent opacity={0.02} depthWrite={false} />
      </mesh>

      <Line
        points={borderPoints}
        color={accent}
        lineWidth={isSelected ? 2.2 : isHovered ? 1.6 : 1.1}
        transparent
        opacity={isSelected ? 1 : isHovered ? 0.85 : 0.55}
        depthWrite={false}
      />
    </group>
  )
}

function RegionSceneInner({
  row,
  col,
  satelliteUrl,
  heightmapUrl,
  activeLayers,
  selectedMicro,
  onSelectMicro,
}: RegionSceneProps) {
  const cellData = FIELD_GRID[row]?.[col]
  const heightmapTex = useTexture(heightmapUrl)
  heightmapTex.colorSpace = THREE.NoColorSpace
  heightmapTex.wrapS = heightmapTex.wrapT = THREE.ClampToEdgeWrapping
  heightmapTex.minFilter = THREE.LinearFilter
  heightmapTex.magFilter = THREE.LinearFilter

  const [hoveredMicro, setHoveredMicro] = useState<{ r: number; c: number } | null>(null)
  const controlsRef = useRef<any>(null)

  const tx = -5 + col + 0.5
  const tz = -5 + row + 0.5

  const dimTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 10, 10)
    ctx.fillStyle = '#000000'
    ctx.fillRect(col, row, 1, 1)
    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    return tex
  }, [col, row])

  const baseTerrainGeometry = useMemo(() => new THREE.PlaneGeometry(10, 10, 64, 64), [])
  const { getTerrainHeight } = useMemo(
    () => createTerrainHeightSampler(heightmapTex, DISPLACEMENT_SCALE),
    [heightmapTex],
  )

  const microCells = useMemo(() => {
    const urgency = cellData?.analysis.irrigation_urgency ?? 'none'
    const cells: MicroCellData[] = []

    for (let r = 0; r < MICRO_GRID; r++) {
      for (let c = 0; c < MICRO_GRID; c++) {
        const x = tx - 0.5 + (c + 0.5) * MICRO_SIZE
        const z = tz - 0.5 + (r + 0.5) * MICRO_SIZE
        const ndvi = clamp01(getMicroVar(row, col, r, c, cellData?.ndvi ?? 0.62, 0.05))
        const moisture = clamp01(getMicroVar(row, col, r, c, cellData?.moisture ?? 0.52, 0.08))
        const nitrogen = Math.max(90, getMicroVar(row, col, r, c, cellData?.nitrogen ?? 160, 16))
        const yieldValue = Math.max(18, getMicroVar(row, col, r, c, cellData?.analysis.yield_qtl_acre ?? 35, 2.2))
        const disease = clamp01((1 - ndvi) * 0.62 + (1 - moisture) * 0.18 + Math.max(0, (140 - nitrogen) / 160) * 0.2)

        cells.push({
          id: `${row}-${col}-${r}-${c}`,
          r,
          c,
          x,
          z,
          ndvi,
          moisture,
          nitrogen,
          yield: yieldValue,
          disease,
          irrigationUrgency: urgency,
        })
      }
    }

    return cells
  }, [cellData, col, row, tx, tz])

  const subcellMeshes = useMemo(() => {
    const map = new Map<string, { geometry: THREE.BufferGeometry; border: THREE.Vector3[] }>()
    for (let r = 0; r < MICRO_GRID; r++) {
      for (let c = 0; c < MICRO_GRID; c++) {
        const x0 = tx - 0.5 + c * MICRO_SIZE
        const z0 = tz - 0.5 + r * MICRO_SIZE
        map.set(`${r}-${c}`, {
          geometry: buildTerrainCellGeometry(x0, z0, MICRO_SIZE, getTerrainHeight),
          border: buildTerrainBorder(x0, z0, MICRO_SIZE, getTerrainHeight),
        })
      }
    }
    return map
  }, [getTerrainHeight, tx, tz])

  return (
    <group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={2.6}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.52}
        enablePan={false}
      />

      <CameraRig
        regionCenter={{ x: tx, z: tz }}
        selectedMicro={selectedMicro}
        microCells={microCells}
        controlsRef={controlsRef}
        getTerrainHeight={getTerrainHeight}
      />

      <TerrainMesh
        satelliteUrl={satelliteUrl}
        heightmapUrl={heightmapUrl}
        displacementScale={DISPLACEMENT_SCALE}
        width={10}
        height={10}
        segments={128}
      />

      <mesh geometry={baseTerrainGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.62}
          depthWrite={false}
          alphaMap={dimTex}
          alphaTest={0.01}
          displacementMap={heightmapTex}
          displacementScale={DISPLACEMENT_SCALE}
        />
      </mesh>

      {microCells.map((cell) => (
        <MicroCellTile
          key={cell.id}
          cell={cell}
          geometry={subcellMeshes.get(`${cell.r}-${cell.c}`)!.geometry}
          borderPoints={subcellMeshes.get(`${cell.r}-${cell.c}`)!.border}
          activeLayers={activeLayers}
          isHovered={hoveredMicro?.r === cell.r && hoveredMicro?.c === cell.c}
          isSelected={selectedMicro?.r === cell.r && selectedMicro?.c === cell.c}
          onHover={() => setHoveredMicro({ r: cell.r, c: cell.c })}
          onLeave={() => setHoveredMicro((prev) => (prev?.r === cell.r && prev?.c === cell.c ? null : prev))}
          onSelect={() => {
            if (selectedMicro?.r === cell.r && selectedMicro?.c === cell.c) {
              onSelectMicro?.(null)
            } else {
              onSelectMicro?.({ r: cell.r, c: cell.c })
            }
          }}
        />
      ))}

      {cellData && (
        <IrrigationPipes
          cx={tx}
          cz={tz}
          moisture={cellData.moisture}
          irrigationUrgency={cellData.analysis.irrigation_urgency}
          visible={activeLayers.irrigation}
          selectedMicro={selectedMicro ?? null}
          getTerrainHeight={getTerrainHeight}
        />
      )}
    </group>
  )
}

function SceneLoadingFallback({ row, col }: { row: number; col: number }) {
  const tx = -5 + col + 0.5
  const tz = -5 + row + 0.5
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.36 + Math.sin(clock.elapsedTime * 2.2) * 0.12
  })

  return (
    <group>
      <TerrainPlaceholder />
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[tx, 0.025, tz]}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshStandardMaterial color="#22c55e" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function RegionScene(props: RegionSceneProps) {
  const { row, col } = props
  const tx = -5 + col + 0.5
  const tz = -5 + row + 0.5

  return (
    <Canvas
      camera={{
        position: [tx + 0.34, 5.0, tz + 3.25],
        fov: 42,
        near: 0.1,
        far: 200,
      }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
      shadows
    >
      <color attach="background" args={['#030d1a']} />
      <fog attach="fog" args={['#030d1a', 18, 42]} />

      <ambientLight intensity={1.15} />
      <directionalLight
        position={[5, 20, 5]}
        intensity={2.6}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[0, 8, 12]} intensity={1.2} color="#fff5e0" />
      <directionalLight position={[-6, 6, -8]} intensity={0.8} color="#dbeafe" />
      <hemisphereLight args={['#c8deff', '#4a6a20', 0.65]} />

      <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#040f1e" roughness={1} metalness={0} />
      </mesh>

      <Suspense fallback={<SceneLoadingFallback row={row} col={col} />}>
        <RegionSceneInner {...props} />
      </Suspense>
    </Canvas>
  )
}
