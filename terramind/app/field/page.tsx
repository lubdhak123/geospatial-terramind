'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Satellite, Leaf, Globe, Bug, TrendingUp,
  AlertTriangle, Droplets, FileText, ChevronRight,
  PenTool, SplitSquareHorizontal, Radio, Cpu,
  Zap, CreditCard, FlaskConical, X,
  MapPin, ChevronDown, Grid3X3,
} from 'lucide-react'
import { fetchSentinelData, type SentinelResult } from '@/lib/sentinel'
import { CROP_STAGES, type ActiveLayer, type WeatherConfig } from '@/components/3d/FieldScene'
import type { AnalyzedCell } from '@/lib/fieldDataEngine'
import { YIELD_ZONES } from '@/components/3d/CropInstances'
import { MODULE_QUADRANT_MAP, type QuadrantId } from '@/lib/quadrantStore'
import { usePipelineStore } from '@/lib/pipelineStore'

// ── 3D scene (SSR-safe) ──────────────────────────────────────────────────
const FieldScene = dynamic(() => import('@/components/3d/FieldScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#030d1a]">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-2 border-[#0d2540] border-t-[#2a6fdb] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Satellite size={18} className="text-[#2a6fdb]" />
          </div>
        </div>
        <p className="font-mono text-xs text-[#2a6fdb] tracking-[0.3em] uppercase">Initializing Terrain Engine</p>
        <p className="font-mono text-[10px] text-slate-600 tracking-widest">Loading Sentinel-2 Data…</p>
      </div>
    </div>
  ),
})

// ════════════════════════════════════════════════════════════════════════
// AI MODULE DATA
// ════════════════════════════════════════════════════════════════════════
export type ModuleId = 'health' | 'water' | 'soil' | 'irrigation' | 'oracle'

interface Insight { label: string; value: string; status: 'good'|'warning'|'critical'; detail: string }
interface AIModule {
  id: ModuleId; label: string; icon: React.ReactNode; color: string
  layer: ActiveLayer; status: 'critical'|'warning'|'good'|'info'
  headline: string; score: number; scoreLabel: string
  action: string; actionHi: string; saving: string
  insights: Insight[]; deepPage?: string
}

const MODULES: AIModule[] = [
  {
    id: 'health', label: 'Health', icon: <Leaf size={16} />, color: '#22c55e',
    layer: 'satellite', status: 'warning', headline: 'Field Health', score: 74, scoreLabel: 'Moderate',
    action: 'Apply blast fungicide in SW zone today', actionHi: 'SW क्षेत्र में आज ही ब्लास्ट दवाई डालें', saving: '₹8,400',
    insights: [
      { label: 'Disease Risk', value: 'Medium', status: 'warning', detail: 'Blast fungus detected in SW corner. Act within 48 hrs.' },
      { label: 'Crop Stage',   value: 'Heading', status: 'good',   detail: 'Rice at optimal heading stage. NDVI 0.78 — above average.' },
      { label: 'Yield Forecast', value: '48 qtl/ac', status: 'good', detail: '8% above district average. Keep current care routine.' },
    ],
  },
  {
    id: 'water', label: 'Water', icon: <Droplets size={16} />, color: '#3b82f6',
    layer: 'soil', status: 'critical', headline: 'Water Stress', score: 28, scoreLabel: 'Critical — NE Zone',
    deepPage: '/field/irrigation',
    action: 'Irrigate NE quadrant — 40mm needed now', actionHi: 'NE क्षेत्र में 40mm पानी दें — अभी जरूरी है', saving: '₹6,200',
    insights: [
      { label: 'Soil Moisture', value: '28%',    status: 'critical', detail: 'Below 35% threshold. NE corner needs water immediately.' },
      { label: 'Next Rain',     value: '6 days', status: 'warning',  detail: 'No rain forecast for 6 days. Manual irrigation essential.' },
      { label: 'Rest of Field', value: 'Good',   status: 'good',     detail: 'SW, NW, SE zones have adequate moisture levels.' },
    ],
  },
  {
    id: 'soil', label: 'Soil', icon: <Globe size={16} />, color: '#f59e0b',
    layer: 'soil', status: 'warning', headline: 'Soil Nutrients', score: 62, scoreLabel: 'Low Nitrogen',
    deepPage: '/field/soil',
    action: 'Apply 10 kg Urea per acre this week', actionHi: 'इस हफ्ते 10 किलो यूरिया प्रति एकड़ डालें', saving: '₹3,800',
    insights: [
      { label: 'Nitrogen',   value: '142 kg/ha', status: 'warning', detail: 'Below optimal 180 kg/ha. Yellowing visible in central strip.' },
      { label: 'Soil pH',    value: '6.4',        status: 'good',    detail: 'Ideal pH range for rice. No lime treatment needed.' },
      { label: 'Potassium',  value: '118 kg/ha', status: 'warning', detail: 'Slightly low. Plan DAP + MOP at panicle initiation.' },
    ],
  },
  {
    id: 'irrigation', label: 'Irrigation', icon: <Droplets size={16} />, color: '#0ea5e9',
    layer: 'satellite', status: 'good', headline: 'Irrigation Network', score: 81, scoreLabel: 'Mostly Operational',
    deepPage: '/field/irrigation',
    action: 'Check NE pipe valve — low pressure detected', actionHi: 'NE पाइप वाल्व जांचें — कम दबाव मिला है', saving: '₹2,100',
    insights: [
      { label: 'NE Pipe',      value: 'Low pressure', status: 'warning', detail: 'NE sector valve may be partially blocked. Check manually.' },
      { label: 'Coverage',     value: '81% field',    status: 'good',    detail: '81% of field is covered by drip network. Good coverage.' },
      { label: 'Next Schedule',value: 'Tomorrow',     status: 'good',    detail: 'Auto-schedule set for 6 AM tomorrow. 45 min runtime.' },
    ],
  },
  {
    id: 'oracle', label: 'Oracle', icon: <TrendingUp size={16} />, color: '#88d982',
    layer: 'satellite', status: 'info', headline: 'Harvest Oracle', score: 91, scoreLabel: 'Oct 18–24 Window',
    deepPage: '/market',
    action: 'Hold harvest 6 more days — mandi price peaks Oct 22', actionHi: 'फसल 6 दिन और रोकें — मंडी भाव 22 अक्टूबर को चरम पर', saving: '₹7,400',
    insights: [
      { label: 'Harvest Window', value: 'Oct 18–24',  status: 'good',    detail: 'NDVI scan of 847 nearby farms shows staggered harvest. Price dip if you harvest before Oct 18.' },
      { label: 'Mandi Forecast', value: '+15% peak',  status: 'good',    detail: 'Agmarknet price model predicts ₹22.4/kg on Oct 22 vs ₹19.5 today.' },
      { label: 'Storage Risk',   value: 'Low',        status: 'good',    detail: 'Current humidity 62% — safe for 10-day holding. No mold risk detected.' },
    ],
  },
]

// ── Farm constants ────────────────────────────────────────────────────────
const MOCK_FARM = {
  name: "Ravi Kumar's Farm",
  location: 'Thanjavur, Tamil Nadu',
  area: '2.4 acres',
  crop: 'Rice (Samba)',
  health_score: 74,
  ndvi_mean: 0.68,
  disease_risk: 'Medium' as string,
  soil_ph: 6.4,
  moisture: '42%',
  temperature: '31°C',
  alerts: [
    { title: 'Blast Fungus Risk',     body: 'Apply Tricyclazole within 48h.',    saving: '₹8,400', urgency: 'critical' as const },
    { title: 'Water Stress — NE Zone',body: 'Irrigate within 3 days.',           saving: '₹6,200', urgency: 'high' as const },
  ],
  satellite_url: '/textures/satellite.jpg',
  ndvi_url:      '/textures/ndvi.png',
  heightmap_url: '/textures/heightmap.png',
}

const MONTH_NDVI: Record<string, number> = {
  Apr: 0.15, May: 0.35, Jun: 0.55, Jul: 0.68,
  Aug: 0.78, Sep: 0.72, Oct: 0.45, Nov: 0.18,
}
const MONTHS = Object.keys(MONTH_NDVI)
const TOTAL_YIELD  = YIELD_ZONES.reduce((s, z) => s + z.yield, 0)
const YIELD_INCOME = ((TOTAL_YIELD * 2400) / 100000).toFixed(2)

// ── Status colors ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  good:     '#22c55e',
  info:     '#3b82f6',
}

// ════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════════

function HealthRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r
  const col = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  return (
    <svg width={54} height={54} viewBox="0 0 54 54">
      <circle cx={27} cy={27} r={r} fill="none" stroke="#0d2540" strokeWidth={4} />
      <circle cx={27} cy={27} r={r} fill="none" stroke={col} strokeWidth={4}
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 27 27)"
        style={{ filter: `drop-shadow(0 0 5px ${col})`, transition: 'stroke-dasharray 1s ease' }} />
      <text x={27} y={32} textAnchor="middle" fill={col} fontSize={13} fontWeight={800} fontFamily="system-ui">{score}</text>
    </svg>
  )
}

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 flex-1 rounded-full overflow-hidden bg-white/5">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg,${color}80,${color})`, boxShadow: `0 0 8px ${color}60` }} />
      </div>
      <span className="font-mono text-[11px] font-bold" style={{ color }}>{value}%</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MODULE CARD — 4 big pill buttons
// ════════════════════════════════════════════════════════════════════════
function ModuleCard({ mod, active, onClick }: { mod: AIModule; active: boolean; onClick: () => void }) {
  const sc = STATUS_COLORS[mod.status]
  return (
    <button onClick={onClick}
      className="relative flex items-center gap-3 rounded-2xl px-5 py-3 shrink-0 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={active
        ? { background: `${mod.color}15`, border: `1.5px solid ${mod.color}60`, boxShadow: `0 0 28px ${mod.color}25, inset 0 1px 0 ${mod.color}25` }
        : { background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)' }
      }>
      {/* Active layer indicator bar at top */}
      {active && (
        <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${mod.color}, transparent)` }} />
      )}
      <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
        style={active
          ? { background: `${mod.color}25`, color: mod.color, boxShadow: `0 0 12px ${mod.color}30` }
          : { background: 'rgba(255,255,255,0.05)', color: '#475569' }
        }>
        {mod.icon}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs font-black tracking-wide transition-colors leading-tight"
          style={{ color: active ? mod.color : '#94a3b8' }}>
          {mod.label}
        </span>
        <span className="text-[9px] font-medium mt-0.5 transition-colors"
          style={{ color: active ? `${mod.color}99` : '#334155' }}>
          {mod.scoreLabel}
        </span>
      </div>
      <div className="ml-auto flex flex-col items-center gap-1">
        <div className="h-2 w-2 rounded-full shrink-0"
          style={{ background: sc, boxShadow: `0 0 6px ${sc}` }} />
        {active && (
          <span className="text-[7px] font-black tracking-widest uppercase"
            style={{ color: `${mod.color}80` }}>
            LIVE
          </span>
        )}
      </div>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════
// INSIGHT PANEL — clean 3-insight + 1 action design
// ════════════════════════════════════════════════════════════════════════
function InsightPanel({ mod, onClose }: { mod: AIModule; onClose: () => void }) {
  const router = useRouter()
  const [lang, setLang] = useState<'en'|'hi'>('en')
  const sc = STATUS_COLORS[mod.status]
  const scoreColor = mod.score >= 70 ? '#22c55e' : mod.score >= 45 ? '#f59e0b' : '#ef4444'
  const r = 26, circ = 2 * Math.PI * r

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(3,13,26,0.0)' }}>

      {/* ── Big status card ── */}
      <div className="shrink-0 rounded-2xl p-4 mb-3"
        style={{ background: `${mod.color}0d`, border: `1px solid ${mod.color}28` }}>
        <div className="flex items-center gap-4">
          <svg width={62} height={62} viewBox="0 0 62 62">
            <circle cx={31} cy={31} r={r} fill="none" stroke="#0d2540" strokeWidth={4} />
            <circle cx={31} cy={31} r={r} fill="none" stroke={scoreColor} strokeWidth={4}
              strokeDasharray={`${(mod.score/100)*circ} ${circ}`} strokeLinecap="round"
              transform="rotate(-90 31 31)"
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor})`, transition: 'stroke-dasharray 1s ease' }} />
            <text x={31} y={36} textAnchor="middle" fill={scoreColor} fontSize={14} fontWeight={900} fontFamily="system-ui">{mod.score}</text>
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-black tracking-widest uppercase mb-0.5" style={{ color: sc }}>● {mod.status.toUpperCase()}</div>
            <div className="text-base font-black text-white leading-tight">{mod.headline}</div>
            <div className="text-xs mt-0.5 font-semibold" style={{ color: scoreColor }}>{mod.scoreLabel}</div>
          </div>
          <div className="flex gap-1 shrink-0">
            {(['en','hi'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="rounded-lg px-2 py-1 text-[9px] font-black transition-all"
                style={lang === l
                  ? { background: `${mod.color}25`, color: mod.color, border: `1px solid ${mod.color}50` }
                  : { background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }
                }>{l === 'en' ? 'EN' : 'हिं'}</button>
            ))}
            <button onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3 Insights ── */}
      <div className="shrink-0 flex flex-col gap-2 mb-3">
        {mod.insights.map(ins => {
          const ic = STATUS_COLORS[ins.status]
          return (
            <div key={ins.label} className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: `${ic}09`, border: `1px solid ${ic}22` }}>
              <div className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: ic, boxShadow: `0 0 5px ${ic}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-black text-white">{ins.label}</span>
                  <span className="text-xs font-black" style={{ color: ic }}>{ins.value}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{ins.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 1 Clear Action ── */}
      <div className="shrink-0 rounded-2xl p-4 mt-auto"
        style={{ background: `${mod.color}12`, border: `1px solid ${mod.color}40`, boxShadow: `0 0 20px ${mod.color}10` }}>
        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">⚡ Recommended Action</div>
        <p className="text-sm font-black text-white leading-snug mb-3">
          {lang === 'hi' ? mod.actionHi : mod.action}
        </p>
        <div className="flex items-center gap-2">
          <div className="text-lg font-black" style={{ color: '#22c55e', textShadow: '0 0 10px #22c55e50' }}>{mod.saving}</div>
          <div className="text-[9px] text-slate-500 font-bold">POTENTIAL SAVING</div>
          <button
            onClick={() => mod.deepPage ? router.push(mod.deepPage) : undefined}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg,${mod.color},${mod.color}cc)`, boxShadow: `0 4px 14px ${mod.color}40` }}>
            Act Now <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// CELL DETAIL PANEL — shown in right panel when a grid cell is selected
// ════════════════════════════════════════════════════════════════════════

const RISK_COLOR: Record<string, string> = {
  none: '#22c55e', low: '#84cc16', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
}
const NUTRIENT_COLOR: Record<string, string> = {
  deficient: '#ef4444', low: '#f97316', medium: '#f59e0b', high: '#22c55e', excess: '#a78bfa',
}

// ── Crop rotation recommendation — deterministic, no ML
function getCropRotation(ac: AnalyzedCell): { crop: string; reason: string } | null {
  const n = ac.analysis.nitrogen_status
  const p = ac.analysis.phosphorus_status
  const prev = 'Rice' // current crop for this farm

  if (prev === 'Rice' && (n === 'deficient' || n === 'low')) {
    return { crop: 'Pulses (Green Gram)', reason: 'Restores nitrogen after rice cycle. Cheap, fast, improves soil.' }
  }
  if (prev === 'Rice' && ac.moisture < 0.35) {
    return { crop: 'Sorghum (Jowar)', reason: 'Drought-tolerant. Thrives in low-moisture soil after rice.' }
  }
  if ((p === 'deficient' || p === 'low') && ac.ph < 6.5) {
    return { crop: 'Groundnut', reason: 'Fixes phosphorus and suits slightly acidic soil.' }
  }
  if (ac.ndvi < 0.45 && n === 'medium') {
    return { crop: 'Sunflower', reason: 'Deep-root crop breaks compaction; good for stressed zones.' }
  }
  return null
}

function CellDetailPanel({
  ac, row, col, activeLayer, onClose,
}: {
  ac: AnalyzedCell; row: number; col: number; activeLayer: ActiveLayer; onClose: () => void
}) {
  const riskColor  = RISK_COLOR[ac.analysis.overall_risk] ?? '#f59e0b'
  const healthColor = ac.analysis.health_status === 'healthy' ? '#22c55e'
    : ac.analysis.health_status === 'moderate' ? '#f59e0b'
    : ac.analysis.health_status === 'degraded'  ? '#f97316'
    : '#ef4444'

  const layerValue = (() => {
    switch (activeLayer) {
      case 'ndvi':      return { label: 'NDVI', value: ac.ndvi.toFixed(3), color: '#22c55e' }
      case 'soil':      return { label: 'Nitrogen', value: `${Math.round(ac.nitrogen)} kg/ha`, color: '#f59e0b' }
      case 'disease':   return { label: 'Disease Risk', value: ac.analysis.disease_risk.toUpperCase(), color: RISK_COLOR[ac.analysis.disease_risk] }
      case 'yield':     return { label: 'Yield Est.', value: `${ac.analysis.yield_qtl_acre} qtl/ac`, color: '#a78bfa' }
      default:          return { label: 'NDVI', value: ac.ndvi.toFixed(3), color: '#22c55e' }
    }
  })()

  const rotation = getCropRotation(ac)
  const yieldColor = ac.analysis.yield_qtl_acre >= 48 ? '#22c55e'
    : ac.analysis.yield_qtl_acre >= 38 ? '#a78bfa'
    : ac.analysis.yield_qtl_acre >= 28 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-2.5"
      style={{ transition: 'opacity 0.25s ease' }}>

      {/* ── Header strip */}
      <div className="shrink-0 flex items-center justify-between px-1 pt-1">
        <div>
          <div className="text-[9px] font-black tracking-widest uppercase" style={{ color: riskColor }}>
            ● {ac.analysis.health_status.toUpperCase()} · ZONE {row + 1}–{col + 1}
          </div>
          <div className="text-xs font-semibold text-slate-400 mt-0.5">{activeLayer.toUpperCase()} VIEW · {ac.id.toUpperCase()}</div>
        </div>
        <button onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <X size={12} />
        </button>
      </div>

      {/* ── 1. YIELD — most important ── */}
      <div className="shrink-0 rounded-2xl p-4" style={{ background: `${yieldColor}0e`, border: `1px solid ${yieldColor}35` }}>
        <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Expected Harvest</div>
        <div className="flex items-end gap-2 mb-1">
          <span className="text-3xl font-black leading-none" style={{ color: yieldColor }}>{ac.analysis.yield_qtl_acre}</span>
          <span className="text-sm font-bold text-slate-400 mb-0.5">quintals / acre</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span style={{ color: '#64748b' }}>{ac.analysis.yield_pct_of_max}% of maximum</span>
          <span className="font-bold" style={{ color: ac.analysis.yield_trend === 'improving' ? '#22c55e' : ac.analysis.yield_trend === 'degrading' ? '#ef4444' : '#94a3b8' }}>
            ↗ {ac.analysis.yield_trend}
          </span>
        </div>
        {/* Simple yield bar */}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${ac.analysis.yield_pct_of_max}%`, background: `linear-gradient(90deg, ${yieldColor}80, ${yieldColor})` }} />
        </div>
      </div>

      {/* ── 2. MOISTURE ── */}
      <div className="shrink-0 rounded-xl px-4 py-3" style={{ background: '#38bdf808', border: '1px solid #38bdf825' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-white">Water in Soil</span>
          <span className="text-sm font-black" style={{ color: ac.moisture < 0.35 ? '#ef4444' : ac.moisture > 0.70 ? '#38bdf8' : '#22c55e' }}>
            {Math.round(ac.moisture * 100)}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${ac.moisture * 100}%`, background: ac.moisture < 0.35 ? 'linear-gradient(90deg,#ef444480,#ef4444)' : 'linear-gradient(90deg,#38bdf880,#38bdf8)' }} />
        </div>
        <div className="text-[9px] text-slate-500 mt-1">
          {ac.moisture < 0.35 ? '⚠ Needs watering soon' : ac.moisture > 0.70 ? 'Well watered' : 'Moisture is adequate'}
        </div>
      </div>

      {/* ── 3. NITROGEN / NUTRIENTS ── */}
      <div className="shrink-0 rounded-xl px-4 py-3" style={{ background: `${NUTRIENT_COLOR[ac.analysis.nitrogen_status]}09`, border: `1px solid ${NUTRIENT_COLOR[ac.analysis.nitrogen_status]}22` }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-white">Soil Nutrients</span>
          <span className="text-[10px] font-black" style={{ color: NUTRIENT_COLOR[ac.analysis.nitrogen_status] }}>
            N: {ac.analysis.nitrogen_status}
          </span>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span>Nitrogen: <span className="font-bold text-white">{Math.round(ac.nitrogen)} kg/ha</span></span>
          <span style={{ color: NUTRIENT_COLOR[ac.analysis.phosphorus_status] }}>P: {ac.analysis.phosphorus_status}</span>
          <span style={{ color: NUTRIENT_COLOR[ac.analysis.potassium_status] }}>K: {ac.analysis.potassium_status}</span>
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5">pH {ac.ph.toFixed(1)} · {ac.soil_texture.replace('_', ' ')}</div>
      </div>

      {/* ── 4. CROP ROTATION RECOMMENDATION ── */}
      {rotation && (
        <div className="shrink-0 rounded-xl px-4 py-3" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)' }}>
          <div className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>Next Season Suggestion</div>
          <div className="text-sm font-black text-white mb-0.5">{rotation.crop}</div>
          <div className="text-[10px] text-slate-400 leading-snug">{rotation.reason}</div>
        </div>
      )}

      {/* ── Disease risk ── */}
      {ac.analysis.disease_risk !== 'none' && (
        <div className="shrink-0 rounded-xl px-4 py-3" style={{ background: `${RISK_COLOR[ac.analysis.disease_risk]}09`, border: `1px solid ${RISK_COLOR[ac.analysis.disease_risk]}22` }}>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: RISK_COLOR[ac.analysis.disease_risk] }} />
            <span className="text-[10px] font-black text-white">Disease Risk</span>
            <span className="text-[10px] font-black ml-auto" style={{ color: RISK_COLOR[ac.analysis.disease_risk] }}>
              {ac.analysis.disease_risk.toUpperCase()}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">{ac.analysis.disease_type}{ac.analysis.disease_drivers.length ? ` — ${ac.analysis.disease_drivers[0]}` : ''}</p>
        </div>
      )}

      {/* ── Primary alert ── */}
      {ac.analysis.action_required && (
        <div className="shrink-0 rounded-2xl p-4 mt-auto" style={{ background: `${riskColor}12`, border: `1px solid ${riskColor}40`, boxShadow: `0 0 20px ${riskColor}10` }}>
          <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">⚡ Action Needed</div>
          <p className="text-sm font-black text-white leading-snug mb-2">{ac.analysis.primary_alert}</p>
          {ac.analysis.stressors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ac.analysis.stressors.slice(0, 3).map(s => (
                <span key={s} className="rounded-full px-2 py-0.5 text-[8px] font-bold"
                  style={{ background: `${riskColor}15`, border: `1px solid ${riskColor}30`, color: riskColor }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function FieldPage() {
  const router = useRouter()

  // Real pipeline result (set by /draw page after /api/analyze-field)
  const pipelineResult = usePipelineStore(s => s.result)

  const [activeModule, setActiveModule]       = useState<AIModule>(MODULES[0]) // health default
  const [sentinelData, setSentinelData]       = useState<SentinelResult | null>(null)
  const [sentinelLoading, setSentinelLoading] = useState(false)
  const [monthIdx, setMonthIdx]               = useState(4)
  const [compareMode, setCompareMode]         = useState(false)
  const [splitPos, setSplitPos]               = useState(50)
  const [compareDragging, setCompareDragging] = useState(false)
  const [weather, setWeather]                 = useState<WeatherConfig>({ type: 'rain', intensity: 0.6 })
  const [pdfLoading, setPdfLoading]           = useState(false)
  const [droneMode, setDroneMode]             = useState(false)
  const [panelOpen, setPanelOpen]             = useState(true)
  const [polygon, setPolygon]                 = useState<{center:[number,number];area_acres:number;coordinates?:[number,number][][]} | null>(null)
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantId | null>(null)
  const [showIrrigation, setShowIrrigation]   = useState(false)
  const [priceData, setPriceData] = useState<{ price: number; yield_qtl_acre: number } | null>(null)
  const [selectedCell, setSelectedCell]       = useState<{ ac: AnalyzedCell; row: number; col: number } | null>(null)

  const compareRef  = useRef<HTMLDivElement>(null)
  const cropMonth   = MONTHS[monthIdx]
  const currentNDVI = MONTH_NDVI[cropMonth]
  // Distinguish between real metadata and a usable live visual texture
  const hasLiveMetadata = sentinelData?.is_live || pipelineResult?.is_live
  const hasLiveVisual   = sentinelData?.visual_is_live || pipelineResult?.is_live

  // Active layer driven by selected module
  const activeLayer = activeModule.layer

  // Auto-enable irrigation overlay if navigated from irrigation page
  useEffect(() => {
    try {
      if (sessionStorage.getItem('tm-show-irrigation') === '1') {
        setShowIrrigation(true)
        sessionStorage.removeItem('tm-show-irrigation')
      }
    } catch {}
  }, [])

  useEffect(() => {
    let lat = 10.787, lng = 79.139
    try {
      const raw = localStorage.getItem('farm_polygon')
      if (raw) { const p = JSON.parse(raw); setPolygon(p); if (p.center) { lat=p.center[0]; lng=p.center[1] } }
    } catch {}

    setSentinelLoading(true)
    fetchSentinelData(lat, lng).then(d => { setSentinelData(d); setSentinelLoading(false) })

    // Call aryansh's price model via the predict API
    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ndvi: 0.68, temperature: 31, rainfall: 85 }),
    }).then(r => r.json()).then(d => {
      if (d.price) setPriceData(d)
    }).catch(() => {})

    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,weathercode&forecast_days=3`)
      .then(r => r.json()).then(d => {
        const rain = d.daily?.precipitation_sum?.[1] ?? 0
        const code = d.daily?.weathercode?.[1] ?? 0
        if (rain > 5)      setWeather({ type: 'rain',    intensity: Math.min(rain/20,1) })
        else if (rain > 0) setWeather({ type: 'drizzle', intensity: 0.4 })
        else if (code < 3) setWeather({ type: 'drought', intensity: 0.5 })
        else               setWeather({ type: 'clear',   intensity: 0 })
      }).catch(() => {})
  }, []) // eslint-disable-line

  const textureUrls = {
    satellite: sentinelData?.satellite_url ?? MOCK_FARM.satellite_url,
    ndvi:      sentinelData?.ndvi_url      ?? MOCK_FARM.ndvi_url,
    heightmap: sentinelData?.heightmap_url ?? MOCK_FARM.heightmap_url,
  }
  const displayLat = polygon ? polygon.center[0].toFixed(4) : '10.7870'
  const displayLng = polygon ? polygon.center[1].toFixed(4) : '79.1390'
  const displayLoc = polygon ? `${polygon.center[0].toFixed(3)}°N ${polygon.center[1].toFixed(3)}°E` : MOCK_FARM.location
  const displayArea = polygon ? `${polygon.area_acres} ac` : MOCK_FARM.area

  // Real stats from pipeline (override MOCK_FARM when available)
  const liveNdvi     = pipelineResult?.stats.avg_ndvi     ?? MOCK_FARM.ndvi_mean
  const liveYield    = pipelineResult?.stats.avg_yield    != null
                         ? `${pipelineResult.stats.avg_yield.toFixed(1)}q`
                         : `${TOTAL_YIELD}q`
  const liveMoisture = pipelineResult?.base.moisture_mean != null
                         ? `${Math.round(pipelineResult.base.moisture_mean * 100)}%`
                         : MOCK_FARM.moisture
  const liveHealth   = pipelineResult?.stats.critical_cells != null
                         ? Math.max(0, Math.round(100 - pipelineResult.stats.critical_cells * 5 - pipelineResult.stats.dry_cells * 2))
                         : MOCK_FARM.health_score
  // Real analyzed grid passed to TerrainScene (null = use built-in FIELD_GRID simulation)
  const realGrid     = pipelineResult?.grid ?? null

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!compareDragging || !compareRef.current) return
    const rect = compareRef.current.getBoundingClientRect()
    setSplitPos(Math.max(8, Math.min(92, ((e.clientX-rect.left)/rect.width)*100)))
  }, [compareDragging])

  const selectModule = (mod: AIModule) => {
    setActiveModule(mod)
    setCompareMode(false)
    setPanelOpen(true)
    setSelectedQuadrant(null)
    setSelectedCell(null)
  }

  const handleCellSelect = useCallback((ac: AnalyzedCell, row: number, col: number) => {
    const gridId = `${row}-${col}`
    console.log("Clicked grid:", gridId)
    setSelectedCell({ ac, row, col })
    setPanelOpen(true)
    router.push(`/field/region/${gridId}`)
  }, [router])

  // ── PDF ───────────────────────────────────────────────────────────────
  const generatePDF = useCallback(async () => {
    setPdfLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p','mm','a4')
      pdf.setFillColor(8,15,30);   pdf.rect(0,0,210,297,'F')
      pdf.setFillColor(15,30,55);  pdf.rect(0,0,210,42,'F')
      pdf.setFillColor(42,111,219);pdf.rect(0,0,4,42,'F')
      pdf.setFontSize(20); pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold')
      pdf.text('TerraMind Farm Intelligence Report',14,17)
      pdf.setFontSize(8.5); pdf.setTextColor(148,163,184); pdf.setFont('helvetica','normal')
      pdf.text('AI Precision Agriculture · Sentinel-2 + Gemini 1.5 Flash',14,25)
      pdf.text(`${new Date().toLocaleDateString('en-IN',{dateStyle:'full'})} · ${displayLoc}`,14,32)
      pdf.setFontSize(36); pdf.setTextColor(34,197,94); pdf.setFont('helvetica','bold')
      pdf.text(`${MOCK_FARM.health_score}`,168,28)
      pdf.setFontSize(8); pdf.setTextColor(100,116,139); pdf.setFont('helvetica','normal')
      pdf.text('/100 Health',165,35)

      pdf.setFontSize(11); pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold')
      pdf.text('AI Module Insights',14,55)

      MODULES.forEach((m, i) => {
        const y = 64 + i * 28
        if (y > 270) return
        pdf.setFillColor(20,35,60); pdf.rect(14,y-5,182,24,'F')
        pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255)
        pdf.text(`${m.label}: ${m.headline}`,18,y+2)
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(148,163,184)
        const rec = m.action.substring(0,110)
        pdf.text(rec,18,y+9)
        pdf.setTextColor(34,197,94); pdf.setFont('helvetica','bold'); pdf.setFontSize(8)
        pdf.text(`Saving: ${m.saving}`,18,y+16)
        pdf.text(`Score: ${m.score}/100`,70,y+16)
      })

      pdf.setFillColor(8,15,30); pdf.rect(0,289,210,8,'F')
      pdf.setFontSize(7); pdf.setTextColor(51,65,85)
      pdf.text('TerraMind AI · Precision Agriculture for Every Indian Farmer',14,295)
      pdf.save(`TerraMind_${MOCK_FARM.name.replace(/\s/g,'_')}_${Date.now()}.pdf`)
    } finally { setPdfLoading(false) }
  }, [displayLoc])

  // ─────────────────────────────────────────────────────────────────────
  const weatherLabel = weather.type==='rain' ? '🌧 Rain Tomorrow' : weather.type==='drizzle' ? '🌦 Drizzle' : weather.type==='drought' ? '☀️ Drought Risk' : '⛅ Clear'
  const criticalCount = MODULES.filter(m => m.status === 'critical').length
  const warningCount  = MODULES.filter(m => m.status === 'warning').length

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden text-white" style={{ background: '#030d1a' }}>

      {/* ══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <header className="relative z-30 flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ background:'rgba(18,20,18,0.97)', borderBottom:'1px solid rgba(64,73,61,0.6)', backdropFilter:'blur(20px)', minHeight: 48 }}>

        <button onClick={() => router.push('/')} className="flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:bg-white/5" style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft size={14} className="text-slate-400" />
        </button>

        <button
          onClick={() => router.push('/grid')}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-white transition-all"
          style={{ border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)' }}
        >
          <Grid3X3 size={11} />
          Grid View
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg" style={{ background:'linear-gradient(135deg,#2a6fdb,#1a3f8a)', boxShadow:'0 0 14px #2a6fdb35' }}>
            <Leaf size={13} className="text-white" />
            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow:'0 0 5px #22c55e' }} />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight leading-none">Terra<span style={{ color:'#2a6fdb' }}>Mind</span></div>
            <div className="text-[9px] text-slate-600 font-mono leading-none mt-0.5">{MOCK_FARM.name.toUpperCase()}</div>
          </div>
        </div>

        {/* ── Irrigation overlay toggle — always visible ── */}
        <button onClick={() => setShowIrrigation(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
          style={showIrrigation
            ? { background:'#0ea5e920', border:'1px solid #0ea5e960', color:'#38bdf8', boxShadow:'0 0 10px #0ea5e925' }
            : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.10)', color:'#64748b' }
          }>
          <Droplets size={12} />
          Irrigation
        </button>

        {/* Satellite status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div className={`h-1.5 w-1.5 rounded-full ${sentinelLoading ? 'bg-amber-400 animate-pulse' : hasLiveVisual ? 'bg-emerald-400' : hasLiveMetadata ? 'bg-blue-400' : 'bg-slate-600'}`} style={hasLiveVisual ? { boxShadow:'0 0 5px #22c55e' } : hasLiveMetadata ? { boxShadow:'0 0 5px #60a5fa' } : {}} />
            <span className="font-mono text-[9px] text-slate-400">
              {sentinelLoading
                ? 'SCANNING…'
                : pipelineResult?.is_live
                  ? `LIVE·${pipelineResult.capture_date}·${realGrid?.[0]?.length ?? 0}×${realGrid?.length ?? 0}`
                  : hasLiveVisual
                    ? `SAT·${sentinelData?.capture_date}`
                    : hasLiveMetadata
                      ? `META·${sentinelData?.capture_date}`
                      : 'DEMO'}
            </span>
          </div>

        {/* Weather */}
        <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] text-slate-400">{weatherLabel}</span>
        </div>

        {/* Location */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <MapPin size={9} className="text-blue-400" />
          <span className="font-mono text-[9px] text-slate-400">{displayLat}°N {displayLng}°E</span>
        </div>

        <div className="flex-1" />

        {/* Drone badge */}
        {droneMode && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg animate-pulse" style={{ background:'#3b82f618', border:'1px solid #3b82f640' }}>
            <Radio size={9} className="text-blue-400" />
            <span className="text-[9px] text-blue-400 font-bold tracking-widest">DRONE</span>
          </div>
        )}

        {/* Alert badges */}
        {criticalCount > 0 && (
          <button onClick={() => selectModule(MODULES.find(m => m.status==='critical')!)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{ background:'#ef444418', border:'1px solid #ef444440', color:'#ef4444', boxShadow:'0 0 12px #ef444415' }}>
            <AlertTriangle size={11} /> {criticalCount} CRITICAL
          </button>
        )}
        {warningCount > 0 && (
          <button onClick={() => selectModule(MODULES.find(m => m.status==='warning')!)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{ background:'#f59e0b18', border:'1px solid #f59e0b40', color:'#f59e0b' }}>
            <AlertTriangle size={11} /> {warningCount} WARNING
          </button>
        )}

        {/* Layer toggle — compare only */}
        <button onClick={() => setCompareMode(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
          style={compareMode
            ? { background:'#ec489918', border:'1px solid #ec489950', color:'#ec4899' }
            : { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'#475569' }
          }>
          <SplitSquareHorizontal size={12} />
          <span className="hidden sm:inline">Compare</span>
        </button>

        <button onClick={() => router.push('/draw')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 transition-all hover:text-white"
          style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <PenTool size={11} /><span className="hidden sm:inline">Redraw</span>
        </button>
      </header>

      {/* ══════════════════════════════════════════════════
          MAIN BODY  (3D + right panel)
      ══════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1">

        {/* ── 3D Canvas ── */}
        <div ref={compareRef} className="relative flex-1 min-w-0"
          onMouseMove={handleMouseMove}
          onMouseUp={() => setCompareDragging(false)}
          onMouseLeave={() => setCompareDragging(false)}>

          {/* Main scene */}
          <div className="absolute inset-0" style={{ clipPath: compareMode ? `inset(0 ${100-splitPos}% 0 0)` : undefined }}>
              <FieldScene
                satelliteUrl={textureUrls.satellite}
                heightmapUrl={textureUrls.heightmap}
                ndviUrl={textureUrls.ndvi}
                activeLayer={compareMode ? 'ndvi' : activeLayer}
                cropMonth={cropMonth}
                weather={weather}
                farmData={{ ...MOCK_FARM, alerts: MOCK_FARM.alerts.map(a => a.title) }}
                onDroneModeChange={setDroneMode}
                focusedZonePos={null}
                selectedQuadrant={compareMode ? null : selectedQuadrant}
                onQuadrantSelect={(id) => {
                  if (id !== null) {
                    router.push(`/field/quadrant/${id.toLowerCase()}`)
                  } else {
                    setSelectedQuadrant(null)
                    setPanelOpen(true)
                  }
                }}
                showIrrigation={showIrrigation}
                onCellSelect={compareMode ? undefined : handleCellSelect}
              />
          </div>

          {/* Compare right scene */}
          {compareMode && (
            <>
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}>
                <FieldScene
                  satelliteUrl={textureUrls.satellite}
                  heightmapUrl={textureUrls.heightmap}
                  ndviUrl="/textures/ndvi_last_month.png"
                  activeLayer="ndvi"
                  cropMonth={cropMonth}
                  weather={{ type:'clear', intensity:0 }}
                  farmData={{ ...MOCK_FARM, alerts: MOCK_FARM.alerts.map(a => a.title) }}
                  disableIntro
                />
              </div>
              <div className="pointer-events-none absolute top-4 left-4 z-20">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400"
                  style={{ background:'rgba(0,0,0,0.7)', border:'1px solid #22c55e40', backdropFilter:'blur(12px)' }}>
                  <div className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow:'0 0 5px #22c55e' }} /> TODAY
                </div>
              </div>
              <div className="pointer-events-none absolute top-4 right-4 z-20">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-orange-400"
                  style={{ background:'rgba(0,0,0,0.7)', border:'1px solid #f9731640', backdropFilter:'blur(12px)' }}>
                  30 DAYS AGO <div className="h-2 w-2 rounded-full bg-orange-400" style={{ boxShadow:'0 0 5px #f97316' }} />
                </div>
              </div>
              <div className="absolute top-0 bottom-0 z-20 flex items-center justify-center"
                style={{ left:`${splitPos}%`, width:3, background:'rgba(255,255,255,0.7)', cursor:'col-resize', transform:'translateX(-50%)' }}
                onMouseDown={() => setCompareDragging(true)}>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold shadow-2xl">⟺</div>
              </div>
            </>
          )}

          {/* Active module layer badge */}
          {!compareMode && (
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
                style={{ background:`${activeModule.color}12`, border:`1px solid ${activeModule.color}35`, color:activeModule.color, backdropFilter:'blur(12px)', boxShadow:`0 0 16px ${activeModule.color}12` }}>
                {activeModule.icon}
                {activeModule.label.toUpperCase()} · {activeLayer.toUpperCase()} VIEW
              </div>
              {selectedCell && (
                <button
                  onClick={() => { setPanelOpen(true) }}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-black transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background:'rgba(3,13,26,0.88)', border:`1px solid ${activeModule.color}50`, color: activeModule.color, backdropFilter:'blur(12px)' }}>
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: activeModule.color }} />
                  ZONE {selectedCell.row + 1}–{selectedCell.col + 1} · NDVI {selectedCell.ac.ndvi.toFixed(2)} · {selectedCell.ac.analysis.yield_qtl_acre}q/ac
                </button>
              )}
            </div>
          )}

          {/* Coordinate HUD */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[9px] text-slate-700">
            {displayLat}°N · {displayLng}°E · {displayArea} · {MOCK_FARM.crop}
          </div>

          {/* Crop stage badge */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 rounded-xl px-3 py-1 font-mono text-[9px]"
              style={{ background:'rgba(3,13,26,0.8)', border:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(10px)' }}>
              <span className="text-slate-500">STAGE</span>
              <span className="text-blue-400 font-bold">{cropMonth}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">{CROP_STAGES[cropMonth]?.label}</span>
            </div>
          </div>

          {/* Collapse panel btn */}
          <button onClick={() => setPanelOpen(v => !v)}
            className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all"
            style={{ background:'rgba(3,13,26,0.85)', border:'1px solid rgba(255,255,255,0.1)', color:'#64748b', backdropFilter:'blur(8px)' }}>
            <ChevronDown size={11} className={`transition-transform ${panelOpen ? '' : 'rotate-180'}`} />
            <span className="hidden sm:inline">{panelOpen ? 'Hide Panel' : 'Show Panel'}</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════
            RIGHT PANEL — Module Insight
        ══════════════════════════════════════════════════ */}
        {panelOpen && (
          <div className="hidden lg:flex shrink-0 flex-col w-[340px]"
            style={{ borderLeft:'1px solid rgba(64,73,61,0.5)', background:'rgba(18,20,18,0.75)', backdropFilter:'blur(20px)' }}>

            {/* Tab strip — cell vs module */}
            {selectedCell && (
              <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-0">
                <button
                  onClick={() => setSelectedCell(null)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-black transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}
                >
                  ← Module View
                </button>
                <div className="text-[9px] font-black tracking-widest uppercase" style={{ color: activeModule.color }}>
                  CELL {selectedCell.row + 1}–{selectedCell.col + 1}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 p-4" style={{ transition: 'opacity 0.2s ease' }}>
              {selectedCell ? (
                <CellDetailPanel
                  ac={selectedCell.ac}
                  row={selectedCell.row}
                  col={selectedCell.col}
                  activeLayer={activeLayer}
                  onClose={() => setSelectedCell(null)}
                />
              ) : (
                <InsightPanel mod={activeModule} onClose={() => setPanelOpen(false)} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODULE STRIP + BOTTOM DASHBOARD
      ══════════════════════════════════════════════════ */}
      <footer className="relative z-30 shrink-0 flex flex-col"
        style={{ background:'rgba(18,20,18,0.98)', borderTop:'1px solid rgba(64,73,61,0.6)', backdropFilter:'blur(20px)' }}>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg,transparent,#88d98240 50%,transparent)' }} />

        {/* ── Loan Eligibility Card ── */}
        <div className="mx-6 mt-4 mb-1 rounded-2xl px-5 py-4 flex items-center gap-6 flex-wrap"
          style={{ background: 'rgba(255,177,199,0.06)', border: '1px solid rgba(255,177,199,0.2)' }}>
          {/* Icon + title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,177,199,0.12)' }}>
              <span className="material-symbols-outlined" style={{ color: '#ffb1c7', fontSize: 20 }}>credit_score</span>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#ffb1c7' }}>Farmer Loan Eligibility</div>
              <div className="text-sm font-black text-white leading-tight">Check Credit Score</div>
            </div>
          </div>

          {/* Field signals used as credit signals */}
          <div className="flex items-center gap-5 flex-wrap flex-1">
            {[
              { label: 'Field Health', value: `${liveHealth}/100`, color: liveHealth >= 70 ? '#22c55e' : '#f59e0b' },
              { label: 'NDVI', value: liveNdvi.toFixed(2), color: '#22c55e' },
              { label: 'Yield Est.', value: liveYield, color: '#88d982' },
              { label: 'Moisture', value: liveMoisture, color: '#3b82f6' },
              { label: 'Harvest Price', value: priceData ? `₹${priceData.price.toFixed(1)}/kg` : '₹22.4/kg', color: '#ffb1c7' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</span>
                <span className="text-sm font-black" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a href="http://localhost:5173/solutions" target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#ffb1c7,#e05c80)', color: '#1a0008', boxShadow: '0 4px 14px rgba(255,177,199,0.3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            Apply for Loan
          </a>
        </div>

        {/* ── Module strip ── */}
        <div className="flex items-center gap-3 overflow-x-auto px-6 py-4 scrollbar-hide">
          {MODULES.map(mod => (
            <ModuleCard key={mod.id} mod={mod} active={activeModule.id === mod.id} onClick={() => selectModule(mod)} />
          ))}

          {/* Spacer push right */}
          <div className="flex-1" />

          {/* Quick Stats instead of old complex stats bar */}
          <div className="flex items-center gap-8 mr-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Crop Stage</span>
              <span className="text-sm font-black text-white">{CROP_STAGES[cropMonth]?.label?.split('—')[0].trim() ?? 'Heading'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Avg NDVI</span>
              <span className="text-sm font-black text-emerald-400">{liveNdvi.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Moisture</span>
              <span className="text-sm font-black text-blue-400">{liveMoisture}</span>
            </div>
            {priceData && (
              <button onClick={() => selectModule(MODULES.find(m => m.id === 'oracle')!)}
                className="flex flex-col items-end transition-all hover:scale-105"
                title="Harvest Oracle — click for detail">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#88d982' }}>Oracle</span>
                <span className="text-sm font-black" style={{ color: '#88d982' }}>₹{priceData.price.toFixed(1)}/kg</span>
              </button>
            )}
            <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-end transition-all hover:scale-105"
              title="Farmer Credit Scoring">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ffb1c7' }}>Credit</span>
              <span className="text-sm font-black" style={{ color: '#ffb1c7' }}>Score Loan</span>
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .tm-slider::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#2a6fdb; border:2px solid #fff; box-shadow:0 0 8px #2a6fdb; cursor:pointer; }
        .tm-slider::-moz-range-thumb { width:11px; height:11px; border-radius:50%; background:#2a6fdb; border:2px solid #fff; cursor:pointer; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:3px; }
      `}</style>
    </main>
  )
}
