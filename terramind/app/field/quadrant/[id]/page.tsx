'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  ArrowLeft, Satellite, AlertTriangle, CheckCircle,
  ChevronRight, Cpu, MapPin, Droplets, Activity,
} from 'lucide-react'
import {
  QUADRANT_DATA, HEALTH_COLOR,
  type QuadrantId, type QuadrantData,
} from '@/lib/quadrantStore'
import { type WeatherConfig } from '@/components/3d/FieldScene'

// 3D scene SSR-safe — no quadrant overlay, camera locked to quadrant
const FieldScene = dynamic(() => import('@/components/3d/FieldScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center" style={{ background: '#030d1a' }}>
      <div className="h-12 w-12 rounded-full border-2 border-[#0d2540] border-t-[#2a6fdb] animate-spin" />
    </div>
  ),
})

// ── Mini health ring ─────────────────────────────────────────────────────
function HealthRing({ score, color }: { score: number; color: string }) {
  const r = 28, circ = 2 * Math.PI * r
  return (
    <svg width={66} height={66} viewBox="0 0 66 66">
      <circle cx={33} cy={33} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={33} cy={33} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 33 33)"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s ease' }} />
      <text x={33} y={38} textAnchor="middle" fill={color} fontSize={15} fontWeight={900}
        fontFamily="system-ui">{score}</text>
    </svg>
  )
}

// ── Severity config ──────────────────────────────────────────────────────
const SEV = {
  high:   { color: '#ef4444', bg: '#ef444412', label: 'HIGH' },
  medium: { color: '#f59e0b', bg: '#f59e0b12', label: 'MED'  },
  low:    { color: '#22c55e', bg: '#22c55e12', label: 'LOW'  },
}

// ── NDVI bar ─────────────────────────────────────────────────────────────
function NDVIBar({ value }: { value: number }) {
  const color = value > 0.6 ? '#22c55e' : value > 0.4 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #22c55e 100%)`,
          transition: 'width 1s ease' }} />
      </div>
      <span style={{ color, fontSize: 13, fontWeight: 900, fontFamily: 'system-ui', minWidth: 36 }}>
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// ── AI Chat component ────────────────────────────────────────────────────
function AIChat({ q }: { q: QuadrantData }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const color = HEALTH_COLOR[q.healthLevel]

  const ask = useCallback(async () => {
    if (!question.trim() || loading) return
    setLoading(true)
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
      setAnswer('Could not connect. Check your internet.')
    } finally {
      setLoading(false)
    }
  }, [question, loading, q])

  const suggestions = [
    'How do I fix this problem?',
    'What will the yield be?',
    'When should I irrigate?',
    'Which fertilizer should I use?',
  ]

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: '#3b82f620', color: '#3b82f6' }}>
          <Cpu size={13} />
        </div>
        <div className="text-xs font-black text-white">Ask TerraMind AI</div>
        <div className="ml-auto text-[9px] font-bold text-slate-600 font-mono">Gemini 1.5 Flash</div>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {suggestions.map(s => (
          <button key={s} onClick={() => setQuestion(s)}
            className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all hover:opacity-100"
            style={{ background: `${color}12`, border: `1px solid ${color}25`, color: '#94a3b8', opacity: 0.8 }}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder="Ask anything about this quadrant…"
          className="flex-1 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <button onClick={ask} disabled={loading || !question.trim()}
          className="rounded-xl px-4 py-2 text-xs font-black text-white transition-all disabled:opacity-40"
          style={{ background: loading ? '#3b82f640' : `linear-gradient(135deg,#2a6fdb,#1a3f8a)`, boxShadow: '0 2px 10px #3b82f630' }}>
          {loading ? '…' : 'Ask'}
        </button>
      </div>

      {answer && (
        <div className="mt-3 rounded-xl p-3 text-xs leading-relaxed text-slate-300"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', whiteSpace: 'pre-wrap' }}>
          <span className="font-black text-blue-400">AI: </span>{answer}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function QuadrantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [textureUrls, setTextureUrls] = useState({
    satellite: '/textures/satellite.jpg',
    ndvi:      '/textures/ndvi.png',
    heightmap: '/textures/heightmap.png',
  })

  const qid = id.toUpperCase() as QuadrantId
  const q   = QUADRANT_DATA[qid]

  useEffect(() => {
    try {
      const raw = localStorage.getItem('farm_polygon')
      if (raw) {
        const p = JSON.parse(raw)
        if (p.satellite_url) setTextureUrls({ satellite: p.satellite_url, ndvi: p.ndvi_url ?? '/textures/ndvi.png', heightmap: p.heightmap_url ?? '/textures/heightmap.png' })
      }
    } catch {}
  }, [])

  if (!q) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: '#030d1a' }}>
        <div className="text-white text-sm">Unknown quadrant: {id}</div>
      </div>
    )
  }

  const color = HEALTH_COLOR[q.healthLevel]
  const actions = lang === 'hi' ? q.recommendedActionsHi : q.recommendedActions

  return (
    <main className="flex h-screen w-screen overflow-hidden text-white" style={{ background: '#030d1a' }}>

      {/* ══════════════════════════════════════════
          LEFT — 3D terrain (60% width)
      ══════════════════════════════════════════ */}
      <div className="relative flex-1 min-w-0">
        <FieldScene
          satelliteUrl={textureUrls.satellite}
          heightmapUrl={textureUrls.heightmap}
          ndviUrl={textureUrls.ndvi}
          activeLayer="satellite"
          cropMonth="Oct"
          weather={{ type: 'clear', intensity: 0 } as WeatherConfig}
          farmData={{ name: '', location: '', crop: '', health_score: q.healthScore, ndvi_mean: q.ndvi, disease_risk: '', alerts: [] }}
          disableIntro
          focusedZonePos={{ x: q.centerX, z: q.centerZ }}
        />

        {/* Quadrant highlight overlay */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: `radial-gradient(ellipse at ${q.centerX > 0 ? '65%' : '35%'} ${q.centerZ > 0 ? '60%' : '40%'}, ${color}08 0%, transparent 60%)`,
        }} />

        {/* Back button overlay */}
        <button onClick={() => router.push('/field')}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:text-white"
          style={{ background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <ArrowLeft size={13} /> Back to Field
        </button>

        {/* Quadrant ID badge */}
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl px-4 py-2"
          style={{ background: `${color}18`, border: `1px solid ${color}40`, backdropFilter: 'blur(12px)' }}>
          <span className="text-base">{q.emoji}</span>
          <span className="text-sm font-black" style={{ color }}>{q.label} Quadrant</span>
          <span className="text-[9px] font-bold text-slate-500 ml-1">DEEP ANALYSIS</span>
        </div>

        {/* Corner scan lines */}
        <div className="pointer-events-none absolute inset-0 z-10" style={{
          boxShadow: `inset 0 0 80px ${color}10`,
          border: `1px solid ${color}20`,
        }} />

        {/* Satellite metadata bar */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 rounded-xl px-3 py-2"
          style={{ background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}>
          <Satellite size={11} className="text-blue-400" />
          <span className="font-mono text-[9px] text-slate-500">Sentinel-2 · ISRIC SoilGrids · SAR Moisture</span>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span className="font-mono text-[9px] text-slate-600">Oct 2024</span>
        </div>

        {/* Navigate to other quadrants */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
          {(Object.keys(QUADRANT_DATA) as QuadrantId[]).filter(k => k !== qid).map(k => {
            const other = QUADRANT_DATA[k]
            const oc = HEALTH_COLOR[other.healthLevel]
            return (
              <button key={k} onClick={() => router.push(`/field/quadrant/${k.toLowerCase()}`)}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition-all hover:scale-105"
                style={{ background: `${oc}12`, border: `1px solid ${oc}30`, color: oc, backdropFilter: 'blur(8px)' }}>
                {other.emoji} {k}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — full data (40% width)
      ══════════════════════════════════════════ */}
      <div className="w-[420px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderLeft: `1px solid ${color}25`, background: 'rgba(3,13,26,0.97)' }}>

        {/* Header */}
        <div className="shrink-0 px-5 py-4" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
          <div className="flex items-center gap-4">
            <HealthRing score={q.healthScore} color={color} />
            <div className="flex-1">
              <div className="text-[10px] font-black tracking-widest mb-1" style={{ color }}>
                ● {q.healthLevel.toUpperCase()} · {q.aiConfidence}% CONFIDENCE
              </div>
              <h1 className="text-lg font-black text-white leading-tight">{q.topProblem}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">{q.label} Field Quadrant · Thanjavur, TN</p>
            </div>
            <div className="flex flex-col gap-1">
              {(['en', 'hi'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className="rounded-lg px-2.5 py-1 text-[10px] font-black transition-all"
                  style={lang === l
                    ? { background: `${color}20`, color, border: `1px solid ${color}40` }
                    : { background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {l === 'en' ? 'EN' : 'हिं'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: 'none' }}>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'NDVI', icon: <Activity size={11} />, content: <NDVIBar value={q.ndvi} />, color: q.ndvi > 0.6 ? '#22c55e' : q.ndvi > 0.4 ? '#f59e0b' : '#ef4444' },
              { label: 'MOISTURE', icon: <Droplets size={11} />, value: `${q.moisture}%`, color: q.moisture < 35 ? '#ef4444' : q.moisture < 50 ? '#f59e0b' : '#22c55e' },
              { label: 'AI CONF', icon: <Cpu size={11} />, value: `${q.aiConfidence}%`, color: '#3b82f6' },
            ].map((m, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: `${m.color}0a`, border: `1px solid ${m.color}20` }}>
                <div className="flex items-center gap-1 mb-2" style={{ color: m.color }}>
                  {m.icon}
                  <span className="text-[9px] font-black tracking-wider">{m.label}</span>
                </div>
                {m.content ?? (
                  <div className="text-sm font-black" style={{ color: m.color }}>{m.value}</div>
                )}
              </div>
            ))}
          </div>

          {/* Issues detected */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} className="text-red-400" />
              <span className="text-xs font-black text-white">Detected Issues</span>
              <span className="ml-auto text-[9px] font-bold text-slate-600">{q.issues.length} found</span>
            </div>
            <div className="space-y-2">
              {q.issues.map((issue, i) => {
                const s = SEV[issue.severity]
                return (
                  <div key={i} className="rounded-xl px-3 py-3 flex items-start gap-3"
                    style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[8px] font-black mt-0.5"
                      style={{ background: `${s.color}25`, color: s.color }}>
                      {s.label}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{issue.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{issue.detail}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommended actions */}
          <div className="rounded-2xl p-4" style={{ background: `${color}0a`, border: `1px solid ${color}25` }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={13} style={{ color }} />
              <span className="text-xs font-black text-white">Recommended Actions</span>
              <MapPin size={10} className="ml-auto text-slate-600" />
            </div>
            <div className="space-y-2.5">
              {actions.map((action, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black"
                    style={{ background: `${color}25`, color }}>
                    {i + 1}
                  </div>
                  <span className="text-xs text-slate-300 leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-2">Data Sources</div>
            <div className="flex flex-wrap gap-1.5">
              {['Sentinel-2 NDVI', 'ISRIC SoilGrids', 'SAR Moisture', 'Open-Meteo ET₀', 'ICAR Standards'].map(src => (
                <span key={src} className="rounded-full px-2.5 py-1 text-[9px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                  {src}
                </span>
              ))}
            </div>
          </div>

          {/* AI Chat */}
          <AIChat q={q} />

          {/* CTA */}
          <div className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Area at Risk</div>
              <div className="text-xl font-black mt-0.5" style={{ color }}>
                {q.issues.filter(i => i.severity === 'high').length > 0 ? '0.4–0.6 ac' : '< 0.2 ac'}
              </div>
            </div>
            <button onClick={() => router.push('/field')}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg,${color},${color}bb)`, boxShadow: `0 4px 14px ${color}35` }}>
              Back to Full Field <ChevronRight size={12} />
            </button>
          </div>

        </div>
      </div>
    </main>
  )
}
