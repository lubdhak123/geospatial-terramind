'use client'

/**
 * QuadrantOverlay.tsx
 * 3D quadrant visualization — divider lines, health-colored borders,
 * clickable meshes with hover labels. Clicking navigates to /field/quadrant/[id].
 * Lives entirely inside the R3F Canvas.
 */

import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  QUADRANT_DATA, HEALTH_COLOR,
  type QuadrantId, type QuadrantData,
} from '@/lib/quadrantStore'

// ── Mini health ring (SVG inside Html) ──────────────────────────────────
export function QuadrantHealthRing({ score, color }: { score: number; color: string }) {
  const r = 18, circ = 2 * Math.PI * r
  return (
    <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3.5} />
      <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={22} y={26} textAnchor="middle" fill={color} fontSize={11} fontWeight={800}
        fontFamily="system-ui, sans-serif">{score}</text>
    </svg>
  )
}

// ── Severity dot color ───────────────────────────────────────────────────
const SEV_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

// ── Quadrant Html Panel (glassmorphic overlay) ───────────────────────────
export function QuadrantPanel({
  q,
  onBack,
}: {
  q: QuadrantData
  onBack: () => void
}) {
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const color = HEALTH_COLOR[q.healthLevel]

  const askAI = useCallback(async () => {
    if (!question.trim() || aiLoading) return
    setAiLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/analyze-quadrant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrantId: q.id, question, quadrantData: q }),
      })
      const data = await res.json()
      setAnswer(data.answer ?? 'No response.')
    } catch {
      setAnswer('Network error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }, [question, aiLoading, q])

  const actions = lang === 'hi' ? q.recommendedActionsHi : q.recommendedActions

  return (
    <div
      onPointerDown={e => e.stopPropagation()}
      style={{
        width: 320,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'rgba(3,13,26,0.94)',
        border: `1px solid ${color}40`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 24px ${color}18`,
        backdropFilter: 'blur(24px)',
        pointerEvents: 'all',
        userSelect: 'none',
        transform: 'translateY(-20px)',
      }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: `linear-gradient(135deg, ${color}18, transparent)`,
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '4px 9px', color: '#94a3b8',
          fontSize: 11, cursor: 'pointer', fontWeight: 700,
        }}>← Back</button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>{q.emoji}</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, letterSpacing: '-0.3px' }}>
              {q.label} Quadrant
            </span>
          </div>
          <div style={{ color, fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', marginTop: 1 }}>
            ● {q.healthLevel.toUpperCase()} · {q.topProblem.toUpperCase()}
          </div>
        </div>

        <QuadrantHealthRing score={q.healthScore} color={color} />
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ maxHeight: 440, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Metrics row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6, padding: '10px 12px 6px',
        }}>
          {[
            { label: 'NDVI',     value: q.ndvi.toFixed(2),  color: q.ndvi > 0.6 ? '#22c55e' : q.ndvi > 0.4 ? '#f59e0b' : '#ef4444' },
            { label: 'Moisture', value: `${q.moisture}%`,   color: q.moisture < 35 ? '#ef4444' : q.moisture < 50 ? '#f59e0b' : '#22c55e' },
            { label: 'AI Conf',  value: `${q.aiConfidence}%`, color: '#3b82f6' },
          ].map(m => (
            <div key={m.label} style={{
              background: `${m.color}0d`, border: `1px solid ${m.color}25`,
              borderRadius: 10, padding: '7px 8px', textAlign: 'center',
            }}>
              <div style={{ color: '#64748b', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 2 }}>
                {m.label}
              </div>
              <div style={{ color: m.color, fontSize: 13, fontWeight: 900 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Issues list */}
        <div style={{ padding: '4px 12px 8px' }}>
          <div style={{ color: '#475569', fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 6 }}>
            DETECTED ISSUES
          </div>
          {q.issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 8px', marginBottom: 4, borderRadius: 8,
              background: `${SEV_COLOR[issue.severity]}08`,
              border: `1px solid ${SEV_COLOR[issue.severity]}18`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                background: SEV_COLOR[issue.severity],
                boxShadow: `0 0 5px ${SEV_COLOR[issue.severity]}`,
              }} />
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700 }}>{issue.label}</div>
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>{issue.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recommended actions */}
        <div style={{
          margin: '0 12px 8px', padding: '10px 12px',
          background: `${color}0a`, border: `1px solid ${color}25`, borderRadius: 10,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
          }}>
            <div style={{ color, fontSize: 8, fontWeight: 800, letterSpacing: '0.12em' }}>
              ⚡ RECOMMENDED ACTIONS
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  background: lang === l ? `${color}25` : 'transparent',
                  border: lang === l ? `1px solid ${color}40` : '1px solid transparent',
                  color: lang === l ? color : '#475569',
                  borderRadius: 5, padding: '2px 7px', fontSize: 9,
                  cursor: 'pointer', fontWeight: 700,
                }}>
                  {l === 'en' ? 'EN' : 'हिं'}
                </button>
              ))}
            </div>
          </div>
          {actions.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 7, alignItems: 'flex-start',
              marginBottom: i < actions.length - 1 ? 6 : 0,
            }}>
              <span style={{ color, fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.4 }}>{a}</span>
            </div>
          ))}
        </div>

        {/* AI Chat */}
        <div style={{ margin: '0 12px 12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
          <div style={{ color: '#3b82f6', fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>
            🤖 ASK AI ABOUT THIS QUADRANT
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') askAI() }}
              placeholder="e.g. How do I fix this?"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '7px 10px', color: '#e2e8f0', fontSize: 11, outline: 'none',
              }}
            />
            <button onClick={askAI} disabled={aiLoading || !question.trim()} style={{
              background: aiLoading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#2a6fdb,#1a3f8a)',
              border: 'none', borderRadius: 8, padding: '7px 13px', color: '#fff',
              fontSize: 11, fontWeight: 800, cursor: aiLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px #3b82f630',
            }}>
              {aiLoading ? '…' : 'Ask'}
            </button>
          </div>

          {answer && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 8, color: '#cbd5e1', fontSize: 11, lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>
              <span style={{ color: '#60a5fa', fontWeight: 800 }}>AI: </span>{answer}
            </div>
          )}
        </div>
      </div>

      {/* Connector pin */}
      <div style={{
        position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
        width: 2, height: 18,
        background: `linear-gradient(to bottom, ${color}80, transparent)`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Per-quadrant glow border (closed loop of 5 points) ───────────────────
const QUAD_CORNERS: Record<QuadrantId, THREE.Vector3[]> = {
  NE: [
    new THREE.Vector3(0.04, 0.1, -0.04),
    new THREE.Vector3(5,    0.1, -0.04),
    new THREE.Vector3(5,    0.1, -5),
    new THREE.Vector3(0.04, 0.1, -5),
    new THREE.Vector3(0.04, 0.1, -0.04),
  ],
  NW: [
    new THREE.Vector3(-0.04, 0.1, -0.04),
    new THREE.Vector3(-5,    0.1, -0.04),
    new THREE.Vector3(-5,    0.1, -5),
    new THREE.Vector3(-0.04, 0.1, -5),
    new THREE.Vector3(-0.04, 0.1, -0.04),
  ],
  SE: [
    new THREE.Vector3(0.04, 0.1,  0.04),
    new THREE.Vector3(5,    0.1,  0.04),
    new THREE.Vector3(5,    0.1,  5),
    new THREE.Vector3(0.04, 0.1,  5),
    new THREE.Vector3(0.04, 0.1,  0.04),
  ],
  SW: [
    new THREE.Vector3(-0.04, 0.1,  0.04),
    new THREE.Vector3(-5,    0.1,  0.04),
    new THREE.Vector3(-5,    0.1,  5),
    new THREE.Vector3(-0.04, 0.1,  5),
    new THREE.Vector3(-0.04, 0.1,  0.04),
  ],
}

// ── Division cross lines ─────────────────────────────────────────────────
const DIV_V_POINTS = [new THREE.Vector3(0, 0.09, -5), new THREE.Vector3(0, 0.09, 5)]
const DIV_H_POINTS = [new THREE.Vector3(-5, 0.09, 0), new THREE.Vector3(5, 0.09, 0)]

// ── Corner accent marks ──────────────────────────────────────────────────
function CornerMark({ x, z, color }: { x: number; z: number; color: string }) {
  const L = 0.6, Y = 0.11
  const sx = x > 0 ? 1 : -1
  const sz = z > 0 ? 1 : -1
  return (
    <>
      <Line points={[new THREE.Vector3(x, Y, z), new THREE.Vector3(x + sx * L, Y, z)]}
        color={color} lineWidth={2} transparent opacity={0.9} />
      <Line points={[new THREE.Vector3(x, Y, z), new THREE.Vector3(x, Y, z + sz * L)]}
        color={color} lineWidth={2} transparent opacity={0.9} />
    </>
  )
}

// ── Quadrant label tag ───────────────────────────────────────────────────
function QuadrantLabel({
  q, selected, hovered,
}: {
  q: QuadrantData; selected: boolean; hovered: boolean
}) {
  const color = HEALTH_COLOR[q.healthLevel]
  const visible = selected || hovered
  return (
    <Html
      position={[q.centerX, 0.5, q.centerZ]}
      center
      distanceFactor={12}
      zIndexRange={[50, 0]}
      style={{ pointerEvents: 'none', opacity: visible ? 1 : 0.7, transition: 'opacity 0.3s' }}
    >
      <div style={{
        fontFamily: 'system-ui, sans-serif',
        background: selected ? `${color}22` : 'rgba(3,13,26,0.75)',
        border: `1px solid ${color}${selected ? '60' : '35'}`,
        borderRadius: 10, padding: '5px 10px',
        backdropFilter: 'blur(12px)',
        boxShadow: selected ? `0 0 18px ${color}30` : 'none',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
        transform: `scale(${selected ? 1.08 : hovered ? 1.04 : 1})`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10 }}>{q.emoji}</span>
          <span style={{ color, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }}>
            {q.direction}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 9 }}>·</span>
          <span style={{ color: '#cbd5e1', fontSize: 9, fontWeight: 700 }}>{q.topProblem}</span>
        </div>
        {(selected || hovered) && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 3,
            color: '#64748b', fontSize: 8, fontWeight: 700,
          }}>
            <span style={{ color }}>Health {q.healthScore}/100</span>
            <span>NDVI {q.ndvi.toFixed(2)}</span>
            <span>H₂O {q.moisture}%</span>
          </div>
        )}
        {!selected && (
          <div style={{ color: '#475569', fontSize: 8, textAlign: 'center', marginTop: 2 }}>
            Click for full report →
          </div>
        )}
      </div>
    </Html>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════
export function QuadrantOverlay({
  selectedQuadrant,
  onQuadrantClick,
}: {
  selectedQuadrant: QuadrantId | null
  onQuadrantClick: (id: QuadrantId) => void
  onBackToOverview?: () => void
}) {
  const [hoveredId, setHoveredId] = useState<QuadrantId | null>(null)

  // Animate division line opacity
  const divOpacity = useRef(0.4)
  const divLineRef1 = useRef<any>(null)
  const divLineRef2 = useRef<any>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    divOpacity.current = 0.3 + Math.sin(t * 0.8) * 0.12
    if (divLineRef1.current?.material) divLineRef1.current.material.opacity = divOpacity.current
    if (divLineRef2.current?.material) divLineRef2.current.material.opacity = divOpacity.current
  })

  const quads = Object.values(QUADRANT_DATA)

  return (
    <group>
      {/* ── Division cross lines ── */}
      <Line ref={divLineRef1} points={DIV_V_POINTS} color="#2a6fdb" lineWidth={1.5}
        transparent opacity={0.4} depthWrite={false} />
      <Line ref={divLineRef2} points={DIV_H_POINTS} color="#2a6fdb" lineWidth={1.5}
        transparent opacity={0.4} depthWrite={false} />

      {/* Center dot */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#2a6fdb" transparent opacity={0.7} />
      </mesh>

      {quads.map(q => {
        const color = HEALTH_COLOR[q.healthLevel]
        const isSelected = selectedQuadrant === q.id
        const isHovered  = hoveredId === q.id

        return (
          <group key={q.id}>
            {/* Clickable quad mesh — subtle health tint */}
            <mesh
              position={[q.centerX, 0.07, q.centerZ]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={2}
              onClick={(e) => { e.stopPropagation(); onQuadrantClick(q.id) }}
              onPointerEnter={(e) => { e.stopPropagation(); setHoveredId(q.id) }}
              onPointerLeave={() => setHoveredId(null)}
            >
              <planeGeometry args={[4.9, 4.9]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.16 : isHovered ? 0.09 : 0.04}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Glowing border */}
            <Line
              points={QUAD_CORNERS[q.id]}
              color={color}
              lineWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.2}
              transparent
              opacity={isSelected ? 0.95 : isHovered ? 0.7 : 0.35}
              depthWrite={false}
            />

            {/* Corner accents on selected */}
            {isSelected && (
              <>
                <CornerMark x={q.centerX > 0 ? 0.04 : -0.04} z={q.centerZ > 0 ? 0.04 : -0.04} color={color} />
                <CornerMark x={q.centerX > 0 ? 5 : -5}       z={q.centerZ > 0 ? 0.04 : -0.04} color={color} />
                <CornerMark x={q.centerX > 0 ? 0.04 : -0.04} z={q.centerZ > 0 ? 5 : -5}       color={color} />
                <CornerMark x={q.centerX > 0 ? 5 : -5}       z={q.centerZ > 0 ? 5 : -5}       color={color} />
              </>
            )}

            {/* Floating label — only when no quadrant is selected */}
            {!selectedQuadrant && (
              <QuadrantLabel q={q} selected={isSelected} hovered={isHovered} />
            )}
          </group>
        )
      })}
    </group>
  )
}
