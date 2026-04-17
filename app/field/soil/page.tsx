'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Globe, AlertTriangle, ChevronRight, Cpu, FileText, Leaf, Zap } from 'lucide-react'
import { analyzeSoilHealth, type SoilHealthResult, type SoilGridCell, type DegradationZone } from '@/lib/soil'

// ── Status configs ────────────────────────────────────────────────────────
const CELL_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  healthy:  { color: '#22c55e', bg: '#22c55e18', label: 'HEALTHY'  },
  moderate: { color: '#f59e0b', bg: '#f59e0b18', label: 'MODERATE' },
  degraded: { color: '#f97316', bg: '#f9731618', label: 'DEGRADED' },
  critical: { color: '#ef4444', bg: '#ef444418', label: 'CRITICAL' },
}

const DEG_TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  compaction:         { label: 'Compaction',         color: '#f59e0b', icon: '🔩' },
  erosion:            { label: 'Erosion',             color: '#f97316', icon: '🌊' },
  salinization:       { label: 'Salinization',        color: '#ef4444', icon: '🧂' },
  waterlogging:       { label: 'Waterlogging',        color: '#8b5cf6', icon: '💧' },
  nutrient_depletion: { label: 'Nutrient Depletion',  color: '#f59e0b', icon: '🌿' },
  acidification:      { label: 'Acidification',       color: '#3b82f6', icon: '⚗️' },
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent:      '#ef4444',
  recommended: '#f59e0b',
  optional:    '#22c55e',
}

// ── Components ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, color = '#f59e0b' }: { title: string; sub: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-6 w-1 rounded-full" style={{ background: color }} />
      <div>
        <h2 className="text-sm font-black text-white">{title}</h2>
        <p className="text-[10px] text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

function StatPill({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl px-4 py-3 gap-0.5"
      style={{ background: `${color}0c`, border: `1px solid ${color}25` }}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-sm font-black" style={{ color }}>{value}</span>
      {sub && <span className="text-[8px] text-slate-600">{sub}</span>}
    </div>
  )
}

// ── Soil Grid Cell ────────────────────────────────────────────────────────
function SoilCell({ cell, onClick, selected }: { cell: SoilGridCell; onClick: () => void; selected: boolean }) {
  const cfg = CELL_STATUS[cell.status]
  return (
    <button onClick={onClick}
      className="rounded-xl p-2.5 flex flex-col gap-1 transition-all hover:scale-[1.04] text-left"
      style={{
        background: selected ? `${cfg.color}25` : cfg.bg,
        border: `${selected ? '2px' : '1px'} solid ${cfg.color}${selected ? '70' : '30'}`,
        boxShadow: selected ? `0 0 16px ${cfg.color}30` : 'none',
      }}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="text-[7px] font-mono text-slate-600">{cell.id}</span>
      </div>
      <div className="text-base font-black leading-none" style={{ color: cfg.color }}>
        {cell.fertility_score}
      </div>
      <div className="text-[8px] text-slate-500">pH {cell.ph} · N{cell.nitrogen_kg_ha}</div>
      {/* SOC bar */}
      <div className="h-1 rounded-full overflow-hidden bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${(cell.organic_carbon_pct / 3) * 100}%`, background: `linear-gradient(90deg,${cfg.color}60,${cfg.color})` }} />
      </div>
    </button>
  )
}

// ── Cell Detail Panel ─────────────────────────────────────────────────────
function CellDetail({ cell }: { cell: SoilGridCell }) {
  const cfg = CELL_STATUS[cell.status]
  const texture_colors: Record<string, string> = {
    clay: '#f59e0b', clay_loam: '#f97316', loamy: '#22c55e',
    silty: '#3b82f6', sandy: '#fbbf24',
  }

  const nutrients = [
    { label: 'Nitrogen (N)',    value: cell.nitrogen_kg_ha,    unit: 'kg/ha', optimal: 180, color: '#22c55e' },
    { label: 'Phosphorus (P)',  value: cell.phosphorus_kg_ha,  unit: 'kg/ha', optimal: 25,  color: '#3b82f6' },
    { label: 'Potassium (K)',   value: cell.potassium_kg_ha,   unit: 'kg/ha', optimal: 140, color: '#a78bfa' },
    { label: 'Organic Carbon',  value: cell.organic_carbon_pct, unit: '%',    optimal: 2.0, color: '#f59e0b' },
  ]

  return (
    <div className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{ background: 'rgba(3,13,26,0.9)', border: `1px solid ${cfg.color}30`, backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <span className="text-[9px] font-black tracking-widest" style={{ color: cfg.color }}>● {cfg.label}</span>
          <div className="text-sm font-black text-white mt-0.5">Grid Cell {cell.id}</div>
          <div className="text-[10px] text-slate-500">{cell.lat.toFixed(5)}°N {cell.lng.toFixed(5)}°E · 0-30cm depth</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: cfg.color }}>{cell.fertility_score}</div>
          <div className="text-[9px] text-slate-500">Fertility Score</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {/* Nutrient bars */}
        <div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nutrient Profile</div>
          <div className="space-y-2.5">
            {nutrients.map(n => (
              <div key={n.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-slate-400">{n.label}</span>
                  <span className="text-[10px] font-bold font-mono" style={{ color: n.color }}>
                    {n.value}{n.unit}
                    <span className="text-slate-600 font-normal"> / {n.optimal}{n.unit}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (Number(n.value) / n.optimal) * 100)}%`, background: n.color, opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Physical properties */}
        <div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Physical Properties</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: 'Texture',      v: cell.texture_class.replace('_',' '),  c: texture_colors[cell.texture_class] },
              { l: 'pH',           v: `${cell.ph}`,                         c: cell.ph < 6.2 ? '#ef4444' : cell.ph > 7.5 ? '#f59e0b' : '#22c55e' },
              { l: 'Clay %',       v: `${cell.clay_pct}%`,                  c: '#f59e0b' },
              { l: 'Bulk Density', v: `${cell.bulk_density.toFixed(2)} g/cm³`, c: cell.bulk_density > 1.45 ? '#ef4444' : '#22c55e' },
              { l: 'CEC',          v: `${cell.cec.toFixed(1)} meq`,         c: '#3b82f6' },
              { l: 'Salinity EC',  v: `${cell.salinity_ec} dS/m`,           c: cell.salinity_ec > 0.6 ? '#f59e0b' : '#22c55e' },
            ].map(p => (
              <div key={p.l} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[8px] text-slate-600 uppercase tracking-wider font-bold">{p.l}</div>
                <div className="text-xs font-black mt-0.5 capitalize" style={{ color: p.c }}>{p.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        <div className="flex gap-2">
          {[
            { l: 'Compaction', v: cell.compaction_risk },
            { l: 'Erosion',    v: cell.erosion_risk },
          ].map(r => {
            const rc = r.v === 'low' ? '#22c55e' : r.v === 'medium' ? '#f59e0b' : r.v === 'high' ? '#f97316' : '#ef4444'
            return (
              <div key={r.l} className="flex-1 rounded-xl p-2.5 text-center"
                style={{ background: `${rc}0c`, border: `1px solid ${rc}25` }}>
                <div className="text-[8px] text-slate-600 uppercase tracking-wider font-bold">{r.l} Risk</div>
                <div className="text-xs font-black capitalize mt-0.5" style={{ color: rc }}>{r.v}</div>
              </div>
            )
          })}
        </div>

        {/* Deficiencies */}
        {cell.deficiencies.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
            <div className="text-[9px] font-bold text-amber-400 mb-2">⚠ Deficiencies Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {cell.deficiencies.map(d => (
                <span key={d} className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                  style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}>{d}</span>
              ))}
            </div>
          </div>
        )}

        <div className="text-[9px] text-slate-600 flex items-center gap-1">
          <span className="text-blue-400">●</span> Source: {cell.data_source}
        </div>
      </div>
    </div>
  )
}

// ── Degradation Zone Card ─────────────────────────────────────────────────
function DegradationCard({ zone }: { zone: DegradationZone }) {
  const [open, setOpen] = useState(false)
  const typeCfg = DEG_TYPE_LABEL[zone.type]
  const sevColor = zone.severity === 'critical' ? '#ef4444' : zone.severity === 'high' ? '#f97316' : zone.severity === 'medium' ? '#f59e0b' : '#22c55e'

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}25` }}>
      <button className="w-full flex items-start gap-3 px-4 py-3.5 text-left" onClick={() => setOpen(v => !v)}>
        <div className="text-xl shrink-0 mt-0.5">{typeCfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black tracking-widest" style={{ color: sevColor }}>
              ● {zone.severity.toUpperCase()}
            </span>
            <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5"
              style={{ background: `${typeCfg.color}15`, color: typeCfg.color }}>
              {typeCfg.label}
            </span>
          </div>
          <h3 className="text-xs font-black text-white">{typeCfg.label} — {zone.area_acres} acres</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">−{zone.yield_impact_pct}% yield · {zone.trend}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-black text-red-400">−{zone.yield_impact_pct}% yield</div>
          <div className="text-[9px] text-emerald-400">{zone.remediation_cost} fix</div>
          <div className="text-[8px] text-slate-600 mt-0.5">{zone.time_to_recover}</div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04]">
          <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Root Cause</div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{zone.cause}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: `${sevColor}0a`, border: `1px solid ${sevColor}20` }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: sevColor }}>
              ⚡ Remediation Plan
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{zone.remediation}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-[9px] text-emerald-400 font-bold">Cost: {zone.remediation_cost}</span>
              <span className="text-[9px] text-blue-400 font-bold">Recovery: {zone.time_to_recover}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function SoilPage() {
  const router = useRouter()
  const [data, setData]           = useState<SoilHealthResult | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedCell, setSelectedCell] = useState<SoilGridCell | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'grid' | 'degradation' | 'amendments'>('overview')
  const [lang, setLang]           = useState<'en' | 'hi'>('en')

  useEffect(() => {
    let lat = 10.787, lng = 79.139
    try {
      const raw = localStorage.getItem('farm_polygon')
      if (raw) { const p = JSON.parse(raw); if (p.center) { lat=p.center[0]; lng=p.center[1] } }
    } catch {}
    analyzeSoilHealth(lat, lng).then(d => {
      setData(d)
      setLoading(false)
      setSelectedCell(d.grid.find(c => c.status !== 'healthy') ?? d.grid[0])
    })
  }, [])

  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: '#030d1a' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-[#0d2540] border-t-[#f59e0b] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Globe size={20} className="text-[#f59e0b]" />
          </div>
        </div>
        <p className="font-mono text-xs text-[#f59e0b] tracking-[0.3em]">ANALYZING SOIL HEALTH</p>
        <p className="font-mono text-[10px] text-slate-600">ISRIC SoilGrids + Sentinel-2 SWIR…</p>
      </div>
    </div>
  )

  if (!data) return null
  const fa = data.field_avg

  const TABS = [
    { id: 'overview',     label: 'Overview',      color: '#f59e0b' },
    { id: 'grid',         label: 'Soil Grid',      color: '#22c55e' },
    { id: 'degradation',  label: 'Degradation',   color: '#ef4444' },
    { id: 'amendments',   label: 'Amendments',    color: '#a78bfa' },
  ] as const

  const criticalDeg = data.degradation_zones.filter(z => z.severity === 'critical' || z.severity === 'high')

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden text-white" style={{ background: '#030d1a' }}>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3"
        style={{ background: 'rgba(3,13,26,0.95)', borderBottom: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => router.push('/field')}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft size={15} className="text-slate-400" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 0 16px #f59e0b30' }}>
            <Globe size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Soil Intelligence</h1>
            <p className="text-[10px] text-slate-500">ISRIC SoilGrids · Sentinel-2 SWIR · Red-Edge</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
          <span className="font-mono text-[9px] text-slate-400">SoilGrids {data.soilgrids_date} · S2 {data.sentinel_date}</span>
        </div>

        <div className="flex-1" />

        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['en','hi'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="rounded-md px-3 py-1 text-[10px] font-black transition-all"
              style={lang===l ? { background:'#f59e0b20', color:'#f59e0b', border:'1px solid #f59e0b40' } : { color:'#475569', border:'1px solid transparent' }}>
              {l === 'en' ? 'EN' : 'हिं'}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white"
          style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 14px #f59e0b30' }}>
          <FileText size={13} /> Export
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className="shrink-0 flex items-center gap-1 px-5 pt-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all"
            style={activeTab===t.id
              ? { background:`${t.color}15`, color:t.color, borderBottom:`2px solid ${t.color}`, marginBottom:-1 }
              : { color:'#475569', borderBottom:'2px solid transparent', marginBottom:-1 }
            }>
            {t.label}
            {t.id === 'degradation' && criticalDeg.length > 0 && (
              <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background:'#ef444420', color:'#ef4444' }}>{criticalDeg.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0" style={{ scrollbarWidth: 'none' }}>

          {/* ══════ OVERVIEW ══════ */}
          {activeTab === 'overview' && (
            <>
              {/* Soil Health Index */}
              <div className="rounded-2xl p-5 flex items-center gap-6"
                style={{ background: 'linear-gradient(135deg,#d9770608,#b4530908)', border: '1px solid #f59e0b20' }}>
                {/* Big score */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-20 h-20">
                    <svg width={80} height={80} viewBox="0 0 80 80">
                      <circle cx={40} cy={40} r={34} fill="none" stroke="#0d2540" strokeWidth={6} />
                      <circle cx={40} cy={40} r={34} fill="none" stroke="#f59e0b" strokeWidth={6}
                        strokeDasharray={`${(fa.soil_health_index/100)*213.6} 213.6`} strokeLinecap="round"
                        transform="rotate(-90 40 40)" style={{ filter:'drop-shadow(0 0 8px #f59e0b60)' }} />
                      <text x={40} y={45} textAnchor="middle" fill="#f59e0b" fontSize={18} fontWeight={900} fontFamily="system-ui">{fa.soil_health_index}</text>
                    </svg>
                  </div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Soil Health Index</div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Avg pH</div>
                    <div className="text-base font-black text-white mt-0.5">{fa.ph}</div>
                    <div className="text-[8px]" style={{ color: fa.ph < 6.2 ? '#ef4444' : '#22c55e' }}>{fa.ph < 6.2 ? 'Acidic' : 'Good'}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Organic C</div>
                    <div className="text-base font-black text-white mt-0.5">{fa.organic_carbon_pct}%</div>
                    <div className="text-[8px] text-amber-400">Low (&lt;2%)</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider">Fertility</div>
                    <div className="text-base font-black text-white mt-0.5">{fa.fertility_score}/100</div>
                    <div className="text-[8px]" style={{ color: fa.fertility_score > 70 ? '#22c55e' : '#f59e0b' }}>
                      {fa.fertility_score > 70 ? 'Good' : 'Moderate'}
                    </div>
                  </div>
                </div>
              </div>

              {/* NPK Grid */}
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">Macronutrient Status (Field Average)</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label:'Nitrogen (N)', value: fa.nitrogen_kg_ha, unit:'kg/ha', optimal: 180, color:'#22c55e', hi: 'नाइट्रोजन' },
                    { label:'Phosphorus (P)', value: fa.phosphorus_kg_ha, unit:'kg/ha', optimal: 25, color:'#3b82f6', hi: 'फास्फोरस' },
                    { label:'Potassium (K)', value: fa.potassium_kg_ha, unit:'kg/ha', optimal: 140, color:'#a78bfa', hi: 'पोटेशियम' },
                  ].map(n => {
                    const pct = Math.min(100, (n.value / n.optimal) * 100)
                    const status = pct > 85 ? 'Optimal' : pct > 65 ? 'Moderate' : 'Low'
                    const sc = pct > 85 ? '#22c55e' : pct > 65 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={n.label} className="rounded-2xl p-4"
                        style={{ background: `${n.color}0a`, border: `1px solid ${n.color}25` }}>
                        <div className="text-[10px] font-bold text-slate-400 mb-0.5">{lang === 'hi' ? n.hi : n.label}</div>
                        <div className="text-xl font-black" style={{ color: n.color }}>{n.value}<span className="text-xs text-slate-600 ml-1">{n.unit}</span></div>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/5">
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:n.color }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[8px]" style={{ color: sc }}>{status}</span>
                          <span className="text-[8px] text-slate-600">Optimal: {n.optimal} {n.unit}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* AI advisory */}
              <div className="rounded-2xl p-4" style={{ background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                    <Cpu size={14} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-amber-400 tracking-widest mb-1">🤖 SOIL INTELLIGENCE — {lang === 'hi' ? 'हिंदी' : 'ENGLISH'}</div>
                    {lang === 'en' ? (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Ravi bhai, your soil is <strong className="text-amber-400">Vertisol clay loam</strong> — typical for Thanjavur delta.
                        The main concerns are <strong className="text-red-400">compaction in SW corner</strong> (bulk density 1.52 — tractor is compressing wet soil),
                        <strong className="text-amber-400"> low organic carbon across 45% of field</strong>, and <strong className="text-blue-400">slight acidification in NE</strong>.
                        Fix these three issues and your fertility score goes from {fa.fertility_score} to 82+, saving ₹14,000+ per season.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        रवि भाई, आपकी मिट्टी <strong className="text-amber-400">Vertisol क्ले लोम</strong> है — थंजावुर डेल्टा के लिए सामान्य।
                        मुख्य चिंताएं हैं <strong className="text-red-400">SW कोने में संघनन</strong> (ट्रैक्टर गीली मिट्टी को दबा रहा है),
                        <strong className="text-amber-400"> 45% खेत में कम कार्बनिक कार्बन</strong>, और <strong className="text-blue-400">NE में हल्का अम्लीकरण</strong>।
                        इन तीन समस्याओं को ठीक करने से उर्वरता स्कोर {fa.fertility_score} से 82+ हो जाएगा।
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════ GRID ══════ */}
          {activeTab === 'grid' && (
            <>
              <SectionHeader title="4×4 Soil Grid Analysis" sub="250m resolution · ISRIC SoilGrids + Sentinel-2 SWIR B11/B12" color="#22c55e" />
              <div className="text-[9px] font-bold text-slate-500 mb-1">Click any cell for detailed analysis →</div>
              {[0,1,2,3].map(row => (
                <div key={row} className="flex items-center gap-2 mb-2">
                  <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider w-12 shrink-0 text-right pr-1">
                    {['North','N-Mid','S-Mid','South'][row]}
                  </div>
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {data.grid.filter(c => c.row === row).map(cell => (
                      <SoilCell key={cell.id} cell={cell}
                        onClick={() => setSelectedCell(cell)}
                        selected={selectedCell?.id === cell.id} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(CELL_STATUS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold"
                    style={{ background: v.bg, border: `1px solid ${v.color}30`, color: v.color }}>
                    {v.label}
                  </div>
                ))}
                <span className="text-[9px] text-slate-600 ml-2 self-center">Score = Fertility 0–100 · Bar = SOC</span>
              </div>
            </>
          )}

          {/* ══════ DEGRADATION ══════ */}
          {activeTab === 'degradation' && (
            <>
              <SectionHeader title="Land Degradation Zones" sub="Satellite-detected soil quality decline · LULC + DEM + NDVI trend" color="#ef4444" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                <StatPill label="Degraded Zones"   value={`${data.degradation_zones.length}`}  color="#ef4444" />
                <StatPill label="Area Affected"    value="1.66 ac"  color="#f97316" />
                <StatPill label="Avg Yield Loss"   value="−11.5%"   color="#f59e0b" />
                <StatPill label="Total Fix Cost"   value="₹18,500"  color="#22c55e" />
              </div>

              <div className="space-y-3">
                {data.degradation_zones.map(z => <DegradationCard key={z.id} zone={z} />)}
              </div>
            </>
          )}

          {/* ══════ AMENDMENTS ══════ */}
          {activeTab === 'amendments' && (
            <>
              <SectionHeader title="Recommended Soil Amendments" sub="ICAR-approved inputs · Cost-benefit calculated for 2.4 acres" color="#a78bfa" />

              <div className="space-y-3">
                {data.amendments.map((a, i) => (
                  <div key={i} className="rounded-2xl p-4"
                    style={{ background: `${PRIORITY_COLOR[a.priority]}08`, border: `1px solid ${PRIORITY_COLOR[a.priority]}25` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black rounded-full px-2 py-0.5"
                            style={{ background: `${PRIORITY_COLOR[a.priority]}18`, color: PRIORITY_COLOR[a.priority], border: `1px solid ${PRIORITY_COLOR[a.priority]}30` }}>
                            {a.priority.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{a.timing}</span>
                        </div>
                        <h3 className="text-sm font-black text-white">{a.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">{a.benefit}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-emerald-400">{a.cost}</div>
                        <div className="text-[10px] font-black text-white mt-0.5">{a.dose}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total investment */}
              <div className="rounded-2xl p-4 flex items-center justify-between mt-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Total Amendment Investment</div>
                  <div className="text-xl font-black text-white mt-0.5">
                    ₹{data.amendments.filter(a=>a.priority!=='optional').reduce((s,a) => s+parseInt(a.cost.replace(/[^0-9]/g,'')),0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Urgent + Recommended only</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Expected ROI</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">3.2×</div>
                  <div className="text-[10px] text-slate-500">In 1 season</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Cell detail panel (only on grid tab) ── */}
        {activeTab === 'grid' && selectedCell && (
          <div className="hidden lg:flex w-72 shrink-0 p-3"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
            <CellDetail cell={selectedCell} />
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-3"
        style={{ background: 'rgba(3,13,26,0.95)', borderTop: '1px solid rgba(245,158,11,0.15)' }}>
        <Globe size={11} className="text-amber-400" />
        <span className="font-mono text-[9px] text-slate-600">
          ISRIC SoilGrids: {data.soilgrids_date} · Sentinel-2: {data.sentinel_date} · 16 cells · 250m resolution
        </span>
        <div className="flex-1" />
        <button onClick={() => router.push('/field')}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft size={12} /> Back to Field
        </button>
      </div>
    </main>
  )
}
