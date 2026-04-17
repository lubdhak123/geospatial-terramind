'use client'

import { Suspense, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Stars, Line } from '@react-three/drei'
import * as THREE from 'three'
import { TerrainMesh } from './TerrainMesh'
import { NDVIOverlay } from './NDVIOverlay'
import { WeatherSystem, type WeatherConfig } from './WeatherSystem'
export type { WeatherConfig }
import { CropInstances } from './CropInstances'
import { QuadrantOverlay } from './QuadrantOverlay'
import { GridTerrainOverlay } from './GridTerrainOverlay'
import { TerrainGridCamera } from './TerrainGridCamera'
import { IrrigationOverlay } from './IrrigationOverlay'
import { useIrrigationStore } from '@/lib/irrigationStore'
import { QUADRANT_DATA, type QuadrantId } from '@/lib/quadrantStore'
import { useHierarchyStore } from '@/lib/hierarchyStore'
import CellAnalysisPanel from '@/components/CellAnalysisPanel'

// ── Types ─────────────────────────────────────────────────────────────
export interface ZoneInfo {
  position: { x: number; z: number }
  type: 'healthy' | 'stressed' | 'moderate' | 'disease'
  title: string
  ndvi: number
  action: string
  actionHi: string
  impact: string
  impactHi: string
  confidence: number
}

export type ActiveLayer = 'satellite' | 'ndvi' | 'soil' | 'disease' | 'yield'

export interface FieldSceneProps {
  satelliteUrl:  string
  heightmapUrl:  string
  ndviUrl:       string
  activeLayer:   ActiveLayer
  cropMonth:     string
  weather:       WeatherConfig
  farmData: {
    name: string; location: string; crop: string
    health_score: number; ndvi_mean: number; disease_risk: string
    alerts: string[] | { title: string; body: string; saving: string; urgency: string }[]
  }
  disableIntro?: boolean
  onDroneModeChange?: (active: boolean) => void
  boundaryCoords?: [number, number][]
  center?: [number, number]
  focusedZonePos?: { x: number, z: number } | null
  // Quadrant system
  selectedQuadrant?: QuadrantId | null
  onQuadrantSelect?: (id: QuadrantId | null) => void
  // Irrigation overlay toggle
  showIrrigation?: boolean
}

// ── Crop stage data ────────────────────────────────────────────────────
export const CROP_STAGES: Record<string, { color: string; opacity: number; label: string }> = {
  Apr: { color: '#6b5240', opacity: 0.50, label: 'Sowing — Bare soil prepared'       },
  May: { color: '#8a9a4a', opacity: 0.35, label: 'Germination — Seedlings emerging'  },
  Jun: { color: '#5a8a3c', opacity: 0.20, label: 'Vegetative — Active growth'        },
  Jul: { color: '#3a7a2c', opacity: 0.15, label: 'Tillering — Crop establishing'     },
  Aug: { color: '#2a6a1c', opacity: 0.10, label: 'Heading — Peak green'              },
  Sep: { color: '#4a8a2c', opacity: 0.15, label: 'Flowering — Pollination stage'     },
  Oct: { color: '#c8a020', opacity: 0.30, label: 'Maturity — Golden harvest ready'   },
  Nov: { color: '#8a6030', opacity: 0.45, label: 'Harvested — Field cleared'         },
}

// ── Easing ────────────────────────────────────────────────────────────
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

// ── Zone detection with Hindi translations ────────────────────────────
function detectZone(point: THREE.Vector3): ZoneInfo {
  const { x, z } = point
  if (x > 1 && z < -1) return {
    position: { x, z },
    type: 'stressed',
    title: 'Water Stress Zone',
    ndvi: 0.28,
    action: 'Irrigate immediately. Soil moisture is below 30%.',
    actionHi: 'तुरंत सिंचाई करें। मिट्टी की नमी 30% से कम है।',
    impact: 'Prevents 15% yield loss',
    impactHi: '15% उपज की हानि रोकता है',
    confidence: 87,
  }
  if (x < -1 && z > 0) return {
    position: { x, z },
    type: 'disease',
    title: 'Blast Fungus Risk Zone',
    ndvi: 0.21,
    action: 'Apply Tricyclazole (0.6g/L) within 48 hours.',
    actionHi: '48 घंटों के भीतर ट्राईसाइक्लैज़ोल (0.6g/L) डालें।',
    impact: 'Protects surrounding 2 healthy acres',
    impactHi: 'आसपास के 2 स्वस्थ एकड़ की रक्षा करता है',
    confidence: 92,
  }
  if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) return {
    position: { x, z },
    type: 'healthy',
    title: 'Peak Health Zone',
    ndvi: 0.82,
    action: 'Optimal growth. Continue current irrigation.',
    actionHi: 'इष्टतम विकास। वर्तमान सिंचाई जारी रखें।',
    impact: 'Expected yield: 48 qtl/acre',
    impactHi: 'अपेक्षित उपज: 48 क्विंटल/एकड़',
    confidence: 95,
  }
  return {
    position: { x, z },
    type: 'moderate',
    title: 'Moderate Stress Zone',
    ndvi: 0.54,
    action: 'Apply 10kg Urea/acre to fix nutrient limits.',
    actionHi: 'पोषक तत्वों के लिए 10 किग्रा यूरिया/एकड़ डालें।',
    impact: '+2 qtl/acre potential gain',
    impactHi: '+2 क्विंटल/एकड़ लाभ',
    confidence: 78,
  }
}

// ═══════════════════════════════════════════════
// FEATURE 1 — CINEMATIC INTRO CAMERA
// ═══════════════════════════════════════════════
function CinematicCamera({
  onComplete,
  skipRef,
}: {
  onComplete: () => void
  skipRef: React.RefObject<boolean>
}) {
  const { camera } = useThree()
  const elapsed    = useRef(0)
  const done       = useRef(false)
  const P0 = useMemo(() => new THREE.Vector3(0, 30, 25),  [])
  const P1 = useMemo(() => new THREE.Vector3(0, 10, 15),  [])
  const P2 = useMemo(() => new THREE.Vector3(0, 8, 12), [])

  useEffect(() => {
    camera.position.copy(P0)
    camera.lookAt(0, 0, 0)
  }, [camera, P0])

  useFrame((_, delta) => {
    if (done.current) return

    if (skipRef.current) {
      camera.position.copy(P2)
      camera.lookAt(0, 0, 0)
      done.current = true
      onComplete()
      return
    }

    elapsed.current += delta
    const t = elapsed.current

    if (t < 1.0) {
      camera.position.copy(P0)
    } else if (t < 2.5) {
      const p = easeInOutCubic((t - 1.0) / 1.5)
      camera.position.lerpVectors(P0, P1, p)
    } else if (t < 4.0) {
      const p = easeInOutCubic((t - 2.5) / 1.5)
      camera.position.lerpVectors(P1, P2, p)
    } else {
      camera.position.copy(P2)
      done.current = true
      onComplete()
      return
    }

    camera.lookAt(0, 0, 0)
  })

  return null
}

// ═══════════════════════════════════════════════
// FEATURE 6 — DRONE AUTO-ORBIT
// ═══════════════════════════════════════════════
function DroneOrbit({
  controlsRef,
  onDroneModeChange,
}: {
  controlsRef: React.RefObject<any>
  onDroneModeChange: (v: boolean) => void
}) {
  const { gl } = useThree()
  const lastInteraction = useRef(Date.now())
  const isDrone = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    const reset = () => { lastInteraction.current = Date.now() }
    el.addEventListener('mousemove', reset)
    el.addEventListener('mousedown', reset)
    el.addEventListener('touchstart', reset)
    el.addEventListener('wheel', reset)
    return () => {
      el.removeEventListener('mousemove', reset)
      el.removeEventListener('mousedown', reset)
      el.removeEventListener('touchstart', reset)
      el.removeEventListener('wheel', reset)
    }
  }, [gl])

  useFrame(() => {
    const idle = Date.now() - lastInteraction.current > 10_000
    if (idle !== isDrone.current) {
      isDrone.current = idle
      if (controlsRef.current) {
        controlsRef.current.autoRotate      = idle
        controlsRef.current.autoRotateSpeed = idle ? 0.8 : 0
      }
      onDroneModeChange(idle)
    }
  })

  return null
}

// ═══════════════════════════════════════════════
// FEATURE 4 — VOICE ZONE POPUP
// ═══════════════════════════════════════════════
function ZonePopup({ zone, onClose }: { zone: ZoneInfo; onClose: () => void }) {
  const [lang,    setLang]    = useState<'en' | 'hi'>('en')
  const [speaking, setSpeaking] = useState(false)

  const speak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utt   = new SpeechSynthesisUtterance()
    utt.text    = lang === 'hi' ? `${zone.actionHi}. ${zone.impactHi}` : `${zone.action}. ${zone.impact}`
    utt.lang    = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utt.rate    = 0.85
    utt.pitch   = 1.0
    utt.onend   = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
    setSpeaking(true)
  }, [speaking, lang, zone])

  useEffect(() => {
    return () => { window.speechSynthesis.cancel() }
  }, [])

  const colors = {
    healthy:  { bg: '#0A2514', border: '#16A34A', dot: '#22C55E', label: 'HEALTHY'      },
    stressed: { bg: '#25140A', border: '#EA580C', dot: '#F97316', label: 'STRESSED'     },
    moderate: { bg: '#25200A', border: '#CA8A04', dot: '#EAB308', label: 'MODERATE'     },
    disease:  { bg: '#2A0505', border: '#EE4444', dot: '#FF5555', label: 'DISEASE RISK' },
  }
  const c = colors[zone.type]

  return (
    <Html center distanceFactor={10} position={[zone.position.x, 0.4, zone.position.z]} zIndexRange={[100, 0]}>
      <div style={{
        position: 'relative',
        background: `linear-gradient(145deg, ${c.bg}fa, #0a0a0ae0)`,
        border: `1px solid ${c.border}66`,
        borderRadius: 16,
        padding: '24px', width: 340,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: `0 8px 32px #00000088, 0 0 16px ${c.border}33`,
        backdropFilter: 'blur(12px)',
        pointerEvents: 'all',
        transform: 'translateY(-20px)',
      }}>
        {/* Connector Pin */}
        <div style={{
          position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
          width: 2, height: 20, background: `linear-gradient(to bottom, ${c.border}, transparent)`,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, boxShadow: `0 0 10px ${c.dot}` }} />
          <span style={{ color: c.dot, fontSize: 13, fontWeight: 700, letterSpacing: 1.2 }}>{c.label}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.3px' }}>
          {zone.title}
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#ffffff08', padding: '10px 12px', borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>NDVI SCORE</div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 6 }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{zone.ndvi.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#ffffff08', padding: '10px 12px', borderRadius: 8 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>AI CONFIDENCE</div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 6 }}>
              <span style={{ color: '#60a5fa', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{zone.confidence}%</span>
            </div>
          </div>
        </div>

        {/* Recommendation Area */}
        <div style={{ 
          background: 'linear-gradient(to right, #1e293b, #0f172a)',
          borderLeft: `4px solid ${c.border}`, borderRadius: 8, padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>RECOMMENDED ACTION</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  background: lang === l ? '#334155' : 'transparent',
                  border: 'none', color: lang === l ? '#fff' : '#94a3b8',
                  borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer', fontWeight: 600
                }}>
                  {l === 'en' ? 'EN' : 'हिं'}
                </button>
              ))}
              <button onClick={speak} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', marginLeft: 4 }}>
                {speaking ? '⏹' : '🔊'}
              </button>
            </div>
          </div>
          <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 12 }}>
            {lang === 'hi' ? zone.actionHi : zone.action}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0f172a', padding: '6px 10px', borderRadius: 6, border: '1px solid #334155' }}>
             <span style={{ color: '#94a3b8', fontSize: 11 }}>Impact:</span>
             <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 600 }}>{lang === 'hi' ? zone.impactHi : zone.impact}</span>
          </div>
        </div>
      </div>
    </Html>
  )
}

// ═══════════════════════════════════════════════
// FEATURE 9 — DISEASE SPREAD RINGS
// ═══════════════════════════════════════════════
function SpreadRing({ position, delay }: { position: [number, number, number]; delay: number }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = ((clock.getElapsedTime() + delay) % 3) / 3
    ref.current.scale.setScalar(0.5 + t * 2.5)
    ;(ref.current.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - t)
  })

  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1.0, 64]} />
      <meshStandardMaterial
        color="#ef4444" transparent opacity={0.6}
        side={THREE.DoubleSide} depthWrite={false}
      />
    </mesh>
  )
}

function DiseaseMarker({ position }: { position: [number, number, number] }) {
  const sphereRef = useRef<THREE.Mesh>(null!)
  const ringRef   = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (sphereRef.current) sphereRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.2)
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 4 + 1) * 0.4)
      ;(ringRef.current.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 4) * 0.2
    }
  })

  return (
    <group position={position}>
      {/* Pulsing sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>

      {/* Inner ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.20, 32]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.5} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Feature 9: 3 expanding spread rings */}
      <SpreadRing position={[0, 0, 0]} delay={0} />
      <SpreadRing position={[0, 0, 0]} delay={1} />
      <SpreadRing position={[0, 0, 0]} delay={2} />

      {/* 7-day spread zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[1.3, 1.5, 64]} />
        <meshStandardMaterial
          color="#ef4444" transparent opacity={0.12}
          side={THREE.DoubleSide} depthWrite={false}
        />
      </mesh>

      {/* Warning label */}
      <Html position={[1.6, 0.3, 0]} center distanceFactor={10}>
        <div style={{
          background: '#3d0a0a', border: '1px solid #dc262644',
          borderRadius: 6, padding: '3px 7px',
          color: '#fca5a5', fontSize: 9, whiteSpace: 'nowrap',
          fontFamily: 'system-ui', pointerEvents: 'none',
        }}>
          ⚠ Spreads in 7 days if untreated
        </div>
      </Html>
    </group>
  )
}

// ═══════════════════════════════════════════════
// SATELLITE SCAN RING — atmospheric effect
// ═══════════════════════════════════════════════
function SatelliteScanRing() {
  const scanRef  = useRef<THREE.Mesh>(null!)
  const glowRef  = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Slowly rotate scan ring
    if (scanRef.current)  scanRef.current.rotation.z  = t * 0.15
    // Pulse the outer glow
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.08 + Math.sin(t * 1.2) * 0.04
    }
  })

  return (
    <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer atmosphere ring */}
      <mesh ref={glowRef}>
        <ringGeometry args={[7.2, 9.5, 64]} />
        <meshStandardMaterial color="#1a6fdb" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Mid scan ring */}
      <mesh ref={scanRef}>
        <ringGeometry args={[6.8, 7.0, 64]} />
        <meshStandardMaterial color="#2a8fff" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide}
          emissive="#1a6fdb" emissiveIntensity={0.5}
        />
      </mesh>
      {/* Inner bright border around terrain */}
      <mesh>
        <ringGeometry args={[5.6, 5.8, 64]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide}
          emissive="#2a6fdb" emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════
// FEATURE 3 — CROP STAGE OVERLAY (inside Canvas)
// ═══════════════════════════════════════════════
function CropStageOverlay({ month }: { month: string }) {
  const ref         = useRef<THREE.Mesh>(null!)
  const targetOpacity = useRef(CROP_STAGES[month]?.opacity ?? 0)
  const targetColor   = useRef(new THREE.Color(CROP_STAGES[month]?.color ?? '#000'))

  useEffect(() => {
    targetOpacity.current = CROP_STAGES[month]?.opacity ?? 0
    targetColor.current.set(CROP_STAGES[month]?.color ?? '#000')
  }, [month])

  useFrame(() => {
    if (!ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity += (targetOpacity.current - mat.opacity) * 0.06
    mat.color.lerp(targetColor.current, 0.06)
  })

  return (
    <mesh ref={ref} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardMaterial
        color={CROP_STAGES[month]?.color ?? '#000'}
        transparent opacity={CROP_STAGES[month]?.opacity ?? 0}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Boundary Line Overlay ──────────────────────────────────────────────
function BoundaryLine({ coords, center }: { coords?: [number, number][], center?: [number, number] }) {
  if (!coords || !center || coords.length < 3) return null

  // Map GeoJSON [lng, lat] back to 10x10 [-5, 5] grid
  // Note: coords are [lng, lat]. center is [lat, lng].
  const points = coords.map(c => {
    const x = ((c[0] - center[1]) / 0.01) * 5
    const z = -((c[1] - center[0]) / 0.01) * 5
    return new THREE.Vector3(x, 0.05, z)
  })

  // Close the loop
  points.push(points[0].clone())

  return (
    <group position={[0, 0, 0]}>
      <Line
        points={points}
        color="#38bdf8"
        lineWidth={3}
        transparent
        opacity={0.8}
      />
    </group>
  )
}

// ═══════════════════════════════════════════════
// INNER SCENE (everything inside the Canvas)
// ═══════════════════════════════════════════════
interface SceneProps {
  satelliteUrl:   string
  heightmapUrl:   string
  ndviUrl:        string
  activeLayer:    ActiveLayer
  cropMonth:      string
  weather:        WeatherConfig
  introPlaying:   boolean
  skipIntroRef:   React.RefObject<boolean>
  onIntroComplete: () => void
  onZoneClick:    (zone: ZoneInfo) => void
  onZoneHover:    (zone: ZoneInfo) => void
  onZoneLeave:    () => void
  onDroneMode:    (v: boolean) => void
  boundaryCoords?: [number, number][]
  center?: [number, number]
  selectedQuadrant?: QuadrantId | null
  onQuadrantSelect?: (id: QuadrantId | null) => void
  showIrrigation?: boolean
}

// ═══════════════════════════════════════════════
// CAMERA ANIMATOR — quadrant fly-in + gentle module focus
// ═══════════════════════════════════════════════
function CameraAnimator({
  controlsRef,
  focusedZonePos,
  quadrantFlyTarget,
  onFlyComplete,
}: {
  controlsRef: React.RefObject<any>
  focusedZonePos?: { x: number; z: number } | null
  quadrantFlyTarget: { pos: [number,number,number]; lookAt: [number,number,number] } | null
  onFlyComplete?: () => void
}) {
  const { camera } = useThree()

  // Time-based fly state — all refs, no state (runs every frame)
  const fly = useRef({
    active:      false,
    elapsed:     0,
    duration:    1.3,
    startPos:    new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPos:      new THREE.Vector3(),
    endTarget:   new THREE.Vector3(),
  })

  const prevTarget = useRef<{ pos: [number,number,number]; lookAt: [number,number,number] } | null>(null)
  const overviewPos    = useMemo(() => new THREE.Vector3(0, 8, 12), [])
  const overviewLookAt = useMemo(() => new THREE.Vector3(0, 0, 0),  [])

  // Start a fly animation whenever quadrantFlyTarget changes
  useEffect(() => {
    if (!controlsRef.current) return

    const changed =
      quadrantFlyTarget !== prevTarget.current &&
      JSON.stringify(quadrantFlyTarget) !== JSON.stringify(prevTarget.current)

    if (!changed) return
    prevTarget.current = quadrantFlyTarget

    const f = fly.current
    f.startPos.copy(camera.position)
    f.startTarget.copy(controlsRef.current.target)

    if (quadrantFlyTarget) {
      f.endPos.set(...quadrantFlyTarget.pos)
      f.endTarget.set(...quadrantFlyTarget.lookAt)
    } else {
      f.endPos.copy(overviewPos)
      f.endTarget.copy(overviewLookAt)
    }

    f.elapsed  = 0
    f.active   = true

    // Disable OrbitControls so it doesn't fight the animation
    controlsRef.current.enabled = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quadrantFlyTarget])

  useFrame((_, delta) => {
    if (!controlsRef.current) return
    const f = fly.current

    if (f.active) {
      f.elapsed += delta
      const t = Math.min(f.elapsed / f.duration, 1)
      const e = easeInOutQuart(t)

      camera.position.lerpVectors(f.startPos, f.endPos, e)
      controlsRef.current.target.lerpVectors(f.startTarget, f.endTarget, e)
      controlsRef.current.update()

      if (t >= 1) {
        f.active = false
        controlsRef.current.enabled = true
        onFlyComplete?.()
      }
      return
    }

    // Gentle module-level focus (when no quadrant is selected)
    if (focusedZonePos) {
      const tPos = new THREE.Vector3(
        focusedZonePos.x + 1.2, 2.5, focusedZonePos.z + 3.5
      )
      const tLook = new THREE.Vector3(focusedZonePos.x, 0, focusedZonePos.z)
      camera.position.lerp(tPos,  delta * 2)
      controlsRef.current.target.lerp(tLook, delta * 2)
      controlsRef.current.update()
    }
  })

  return null
}

function Scene({
  satelliteUrl, heightmapUrl, ndviUrl, activeLayer,
  cropMonth, weather = { type: 'clear', intensity: 0 }, introPlaying, skipIntroRef,
  onIntroComplete, onZoneClick, onZoneHover, onZoneLeave, onDroneMode,
  boundaryCoords, center, focusedZonePos, selectedQuadrant, onQuadrantSelect,
  showIrrigation = false,
}: SceneProps & {
  focusedZonePos?: { x: number, z: number } | null
  selectedQuadrant?: QuadrantId | null
  onQuadrantSelect?: (id: QuadrantId | null) => void
  showIrrigation?: boolean
}) {
  const controlsRef = useRef<any>(null)

  // Derive quadrant fly target from selected quadrant
  const quadrantFlyTarget = useMemo(() => {
    if (!selectedQuadrant) return null
    const q = QUADRANT_DATA[selectedQuadrant]
    return { pos: q.cameraPos, lookAt: q.cameraTarget }
  }, [selectedQuadrant])

  const handleClick = useCallback((point: THREE.Vector3) => {
    onZoneClick(detectZone(point))
  }, [onZoneClick])

  const handleHover = useCallback((point: THREE.Vector3) => {
    onZoneHover(detectZone(point))
  }, [onZoneHover])

  return (
    <>
      <color attach="background" args={['#030d1a']} />
      <fog attach="fog" args={['#030d1a', 18, 42]} />
      <Stars radius={80} depth={60} count={3500} factor={3} fade speed={0.3} />

      {introPlaying && <CinematicCamera onComplete={onIntroComplete} skipRef={skipIntroRef} />}
      {!introPlaying && (
        <CameraAnimator
          controlsRef={controlsRef}
          focusedZonePos={selectedQuadrant ? null : focusedZonePos}
          quadrantFlyTarget={quadrantFlyTarget}
        />
      )}
      
      <DroneOrbit controlsRef={controlsRef} onDroneModeChange={onDroneMode} />

      <ambientLight intensity={1.2} />
      <directionalLight
        position={[5, 20, 5]} intensity={2.8} color="#ffffff" castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1} shadow-camera-far={50}
        shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <directionalLight position={[0, 8, 12]} intensity={1.4} color="#fff5e0" />
      <directionalLight position={[-6, 6, -8]} intensity={0.9} color="#e8f0ff" />
      <hemisphereLight args={['#c8deff', '#4a6a20', 0.7]} />

      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#040f1e" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -0.10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.5, 14, 64]} />
        <meshStandardMaterial color="#0d2a50" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <gridHelper args={[40, 40, '#0a2040', '#061428']} position={[0, -0.11, 0]} />

      {/* Terrain */}
      <TerrainMesh
        satelliteUrl={satelliteUrl} heightmapUrl={heightmapUrl}
        displacementScale={1.5} width={10} height={10} segments={256}
        onClick={handleClick}
        onHover={handleHover}
        onHoverEnd={onZoneLeave}
      />

      {/* NDVI Overlay */}
      <NDVIOverlay ndviUrl={ndviUrl} heightmapUrl={heightmapUrl} visible={activeLayer === 'ndvi'} opacity={0.6} width={10} height={10} />

      {/* Feature 3: crop-stage colour overlay */}
      <CropStageOverlay month={cropMonth} />

      {/* Soil overlay */}
      {activeLayer === 'soil' && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#8b5e3c" transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}

      {/* Feature 9: disease markers with spread rings */}
      {activeLayer === 'disease' && (
        <>
          <DiseaseMarker position={[-3.5, 0.15, 2.2]} />
          <DiseaseMarker position={[-2.8, 0.10, 2.8]} />
          <DiseaseMarker position={[ 3.2, 0.12, -2.5]} />
        </>
      )}

      {/* Feature 8: yield crop cylinders */}
      <CropInstances visible={activeLayer === 'yield'} boundaryCoords={boundaryCoords} center={center} />

      {/* Feature 7: weather particles */}
      <WeatherSystem type={weather.type} intensity={weather.intensity} />

      {/* Satellite scan atmosphere rings */}
      <SatelliteScanRing />

      {/* Quadrant overlay — dividers, borders, click meshes, panels */}
      {onQuadrantSelect && (
        <QuadrantOverlay
          selectedQuadrant={selectedQuadrant ?? null}
          onQuadrantClick={(id) => onQuadrantSelect(id)}
          onBackToOverview={() => onQuadrantSelect(null)}
        />
      )}

      {/* Grid × Terrain integration — uses hierarchyStore */}
      <GridTerrainOverlay />
      <TerrainGridCamera controlsRef={controlsRef} />

      {/* Underground irrigation network — uses irrigationStore */}
      {showIrrigation && <IrrigationOverlay />}

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enabled={!introPlaying}
        enablePan enableZoom enableRotate
        minDistance={1.5} maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        dampingFactor={0.08}
        enableDamping
      />

      <BoundaryLine coords={boundaryCoords} center={center} />
    </>
  )
}

// ═══════════════════════════════════════════════
// FEATURE 1 — CINEMATIC INTRO OVERLAY (HTML)
// ═══════════════════════════════════════════════
function IntroOverlay({ visible, onSkip }: { visible: boolean; onSkip: () => void }) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => setOpacity(1))
    } else {
      setOpacity(0)
    }
  }, [visible])

  if (!visible && opacity === 0) return null

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #0a1628 0%, #000814 100%)',
      opacity, transition: visible ? 'opacity 0.6s ease' : 'opacity 0.8s ease',
      pointerEvents: visible ? 'all' : 'none',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .intro-title { animation: fadeUp 1s ease 0.3s both; }
        .intro-sub   { animation: fadeUp 1s ease 0.8s both; }
        .intro-dots  { animation: fadeUp 1s ease 1.2s both; }
      `}</style>

      <div className="intro-title" style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize: 56, fontWeight: 900,
        letterSpacing: '-2px',
        background: 'linear-gradient(135deg, #ffffff, #60a5fa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 12,
      }}>
        TerraMind
      </div>
      <div className="intro-sub" style={{
        color: '#94a3b8', fontFamily: 'system-ui, sans-serif',
        fontSize: 16, letterSpacing: '0.05em',
      }}>
        Analyzing your field from space…
      </div>
      <div className="intro-dots" style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#2a6fdb',
            animation: `fadeUp 0.6s ease ${1.5 + i * 0.2}s both`,
            opacity: 0.6,
          }} />
        ))}
      </div>

      {/* Skip button */}
      <button onClick={onSkip} style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        color: '#94a3b8', borderRadius: 8, padding: '6px 14px',
        fontSize: 12, cursor: 'pointer', fontFamily: 'system-ui',
        letterSpacing: '0.04em',
      }}>
        Skip Intro ›
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════
// GRID DRILL HUD — back/reset buttons for 3D grid navigation
// ═══════════════════════════════════════════════
function GridDrillHUD() {
  const { drillPath, drillOut, resetToLevel1 } = useHierarchyStore()
  const level = drillPath.length === 0 ? 1 : drillPath.length === 1 ? 2 : 3

  if (drillPath.length === 0) return null

  const levelMeta: Record<number, { label: string; icon: string; color: string }> = {
    1: { label: 'Field', icon: '🌾', color: '#38bdf8' },
    2: { label: 'Zone',  icon: '🔬', color: '#a78bfa' },
    3: { label: 'Micro', icon: '⚗️',  color: '#f59e0b' },
  }
  const m = levelMeta[level]

  return (
    <div style={{
      position: 'absolute', top: 80, left: 16, zIndex: 20,
      display: 'flex', flexDirection: 'column', gap: 6,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Level badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: `${m.color}18`, border: `1px solid ${m.color}44`,
        borderRadius: 10, padding: '6px 12px',
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: 12 }}>{m.icon}</span>
        <span style={{ color: m.color, fontSize: 10, fontWeight: 900, letterSpacing: '0.12em' }}>
          {m.label.toUpperCase()} GRID
        </span>
        <span style={{ color: '#475569', fontSize: 9 }}>· Level {level}</span>
      </div>

      {/* Breadcrumb path */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px',
        background: 'rgba(3,13,26,0.8)', borderRadius: 8,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ color: '#475569', fontSize: 8 }}>🏠 Field</span>
        {drillPath.map((entry, i) => (
          <span key={entry.cell.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: '#334155', fontSize: 8 }}>›</span>
            <span style={{
              color: i === drillPath.length - 1 ? m.color : '#64748b',
              fontSize: 8, fontWeight: 700,
            }}>
              {entry.cell.boundLabel}
            </span>
          </span>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={drillOut}
          style={{
            background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 10px', color: '#94a3b8',
            fontSize: 10, fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.05em',
            backdropFilter: 'blur(12px)',
          }}
        >
          ← Back
        </button>
        <button
          onClick={resetToLevel1}
          style={{
            background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 10px', color: '#64748b',
            fontSize: 10, fontWeight: 800, cursor: 'pointer',
            letterSpacing: '0.05em',
            backdropFilter: 'blur(12px)',
          }}
        >
          ↺ Field View
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// IRRIGATION OVERLAY HUD — toggle controls
// ═══════════════════════════════════════════════
function IrrigationHUD() {
  const {
    network,
    showPipes, setShowPipes,
    showMoistureOverlay, setShowMoistureOverlay,
    showFlowParticles, setShowFlowParticles,
    selectedCell, setSelectedCell,
    selectedPipe, setSelectedPipe,
  } = useIrrigationStore()

  return (
    <div style={{
      position: 'absolute', top: 80, right: 16, zIndex: 20,
      display: 'flex', flexDirection: 'column', gap: 5,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Network summary badge */}
      <div style={{
        background: 'rgba(3,13,26,0.90)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: 10, padding: '6px 10px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ color: '#38bdf8', fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 4 }}>
          💧 IRRIGATION
        </div>
        {[
          { color: '#22c55e', label: 'Coverage', value: `${network.coveragePct}%` },
          { color: '#ef4444', label: 'Blocked',  value: `${network.blockedPipes} pipes` },
          { color: '#f59e0b', label: 'Dry zones', value: `${network.dryCells} cells` },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 1 }}>
            <span style={{ color: '#475569', fontSize: 8 }}>{r.label}</span>
            <span style={{ color: r.color, fontSize: 8, fontWeight: 900 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Toggle buttons */}
      {[
        { label: '🔧 Pipes',     value: showPipes,            set: setShowPipes,           color: '#38bdf8' },
        { label: '💧 Moisture',  value: showMoistureOverlay,  set: setShowMoistureOverlay, color: '#a78bfa' },
        { label: '✦ Flow',       value: showFlowParticles,    set: setShowFlowParticles,   color: '#22c55e' },
      ].map(b => (
        <button key={b.label} onClick={() => b.set(!b.value)} style={{
          background: b.value ? `${b.color}18` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${b.value ? b.color + '50' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 8, padding: '5px 10px',
          color: b.value ? b.color : '#475569',
          fontSize: 9, fontWeight: 800, cursor: 'pointer',
          textAlign: 'left', backdropFilter: 'blur(10px)',
          transition: 'all 0.15s ease',
        }}>
          {b.label}
        </button>
      ))}

      {/* Clear selection */}
      {(selectedCell || selectedPipe) && (
        <button onClick={() => { setSelectedCell(null); setSelectedPipe(null) }} style={{
          background: '#ef444410', border: '1px solid #ef444440',
          borderRadius: 8, padding: '5px 10px',
          color: '#ef4444', fontSize: 9, fontWeight: 800, cursor: 'pointer',
          backdropFilter: 'blur(10px)',
        }}>
          ✕ Clear selection
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════
export default function FieldScene({
  satelliteUrl, heightmapUrl, ndviUrl,
  activeLayer, cropMonth, weather = { type: 'clear', intensity: 0 },
  farmData: _fd,
  disableIntro = false,
  onDroneModeChange,
  boundaryCoords,
  center,
  focusedZonePos,
  selectedQuadrant,
  onQuadrantSelect,
  showIrrigation = false,
}: FieldSceneProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null)
  const [introPlaying,  setIntroPlaying]  = useState(false)
  const [droneMode,     setDroneMode]     = useState(false)
  const skipIntroRef = useRef(false)

  // Feature 1: play intro once per session
  useEffect(() => {
    if (disableIntro) return
    if (!sessionStorage.getItem('tm-intro-seen')) {
      setIntroPlaying(true)
    }
  }, [disableIntro])

  const completeIntro = useCallback(() => {
    setIntroPlaying(false)
    sessionStorage.setItem('tm-intro-seen', '1')
  }, [])

  const handleSkipIntro = useCallback(() => {
    skipIntroRef.current = true
  }, [])

  const handleDroneMode = useCallback((v: boolean) => {
    setDroneMode(v)
    onDroneModeChange?.(v)
  }, [onDroneModeChange])

  const handleZoneHover = useCallback((zone: ZoneInfo) => {
    setSelectedZone(prev => {
      if (
        prev &&
        prev.type === zone.type &&
        Math.abs(prev.position.x - zone.position.x) < 0.12 &&
        Math.abs(prev.position.z - zone.position.z) < 0.12
      ) {
        return prev
      }
      return zone
    })
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#030d1a' }}>
      {/* Feature 1: intro overlay */}
      <IntroOverlay visible={introPlaying} onSkip={handleSkipIntro} />

      <Canvas
        camera={{ position: [2, 6, 10], fov: 55, near: 0.1, far: 200 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#030d1a' }}
      >
        <Suspense fallback={null}>
          <Scene
            satelliteUrl={satelliteUrl}
            heightmapUrl={heightmapUrl}
            ndviUrl={ndviUrl}
            activeLayer={activeLayer}
            cropMonth={cropMonth}
            weather={weather}
            introPlaying={introPlaying}
            skipIntroRef={skipIntroRef}
            onIntroComplete={completeIntro}
            onZoneClick={setSelectedZone}
            onZoneHover={handleZoneHover}
            onZoneLeave={() => setSelectedZone(null)}
            onDroneMode={handleDroneMode}
            boundaryCoords={boundaryCoords}
            center={center}
            focusedZonePos={selectedQuadrant ? null : focusedZonePos || (selectedZone ? { x: selectedZone.position.x, z: selectedZone.position.z } : null)}
            selectedQuadrant={selectedQuadrant}
            onQuadrantSelect={onQuadrantSelect}
            showIrrigation={showIrrigation}
          />
          {selectedZone && (
            <ZonePopup zone={selectedZone} onClose={() => setSelectedZone(null)} />
          )}
        </Suspense>
      </Canvas>

      {/* Feature 6: drone mode indicator */}
      <div style={{
        position: 'absolute', bottom: 32, left: 16,
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: droneMode ? 1 : 0,
        transition: 'opacity 1.5s ease',
        pointerEvents: 'none',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 6px #60a5fa' }} />
        <span style={{ color: '#475569', fontFamily: 'system-ui', fontSize: 10, letterSpacing: '0.08em' }}>
          DRONE MODE
        </span>
      </div>

      {/* Grid drill navigation HUD */}
      <GridDrillHUD />

      {/* Irrigation overlay controls HUD */}
      {showIrrigation && <IrrigationHUD />}

      {/* Cell analysis panel — shows live engine data for selected grid cell */}
      <CellAnalysisPanel />

      {/* Click hint */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        color: '#475569', fontSize: 11, fontFamily: 'system-ui',
        pointerEvents: 'none', letterSpacing: '0.04em',
      }}>
        Click terrain to analyze zone · Drag to rotate · Scroll to zoom
      </div>
    </div>
  )
}
