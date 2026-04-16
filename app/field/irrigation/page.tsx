'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Droplets, AlertTriangle, CheckCircle,
  XCircle, ChevronRight, Cpu, MapPin,
  Activity, Zap, Construction, Waves, FileText,
} from 'lucide-react'
import { analyzeIrrigation, type IrrigationResult, type PipelineSegment, type DrainageIssue, type SoilMoistureGrid } from '@/lib/irrigation'

// ── Status config ────────────────────────────────────────────────────────
const SEG_STATUS: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  active:   { color: '#22c55e', label: 'ACTIVE',   icon: <CheckCircle size={11} /> },
  blocked:  { color: '#ef4444', label: 'BLOCKED',  icon: <XCircle size={11} /> },
  dry:      { color: '#f59e0b', label: 'DRY/BROKEN',icon:<AlertTriangle size={11} /> },
  overflow: { color: '#f97316', label: 'OVERFLOW', icon: <Waves size={11} /> },
  damaged:  { color: '#ef4444', label: 'DAMAGED',  icon: <XCircle size={11} /> },
}

const SEG_TYPE_LABEL: Record<string, string> = {
  main_canal:         'Main Canal',
  field_channel:      'Field Channel',
  drainage:           'Drainage',
  pipe_underground:   'Underground Pipe',
}

const DRAIN_SEVERITY: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: '#ef444412' },
  high:     { color: '#f97316', bg: '#f9731612' },
  medium:   { color: '#f59e0b', bg: '#f59e0b12' },
  low:      { color: '#22c55e', bg: '#22c55e12' },
}

const MOISTURE_STATUS: Record<string, { color: string; bg: string; label: string }> = {
  optimal:     { color: '#22c55e', bg: '#22c55e18', label: 'OPTIMAL'  },
  low:         { color: '#f59e0b', bg: '#f59e0b18', label: 'LOW'      },
  critical:    { color: '#ef4444', bg: '#ef444418', label: 'CRITICAL' },
  saturated:   { color: '#3b82f6', bg: '#3b82f618', label: 'SATURATED'},
  waterlogged: { color: '#8b5cf6', bg: '#8b5cf618', label: 'WATERLOG' },
}

// ── Mini components ──────────────────────────────────────────────────────
function SectionHeader({ title, sub, color = '#3b82f6' }: { title: string; sub: string; color?: string }) {
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

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl px-4 py-3 gap-0.5"
      style={{ background: `${color}0c`, border: `1px solid ${color}25` }}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-sm font-black" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Moisture Grid Cell ────────────────────────────────────────────────────
function MoistureCell({ cell }: { cell: SoilMoistureGrid }) {
  const cfg = MOISTURE_STATUS[cell.status]
  const pct = ((cell.moisture_pct - cell.wilting_point) / (cell.field_capacity - cell.wilting_point)) * 100
  const clampedPct = Math.max(0, Math.min(100, pct))

  return (
    <div className="rounded-xl p-2.5 flex flex-col gap-1.5 transition-all hover:scale-[1.03] cursor-pointer"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-black tracking-widest" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="text-[8px] font-mono text-slate-600">{cell.gridId}</span>
      </div>
      <div className="text-lg font-black leading-none" style={{ color: cfg.color }}>
        {cell.moisture_pct}%
      </div>
      {/* FC bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clampedPct}%`, background: `linear-gradient(90deg,${cfg.color}80,${cfg.color})` }} />
      </div>
      <div className="flex items-center gap-1">
        <div className={`h-1 w-1 rounded-full ${cell.trend === 'falling' ? 'bg-red-400' : cell.trend === 'rising' ? 'bg-blue-400' : 'bg-slate-500'}`} />
        <span className="text-[8px] text-slate-600 capitalize">{cell.trend}</span>
      </div>
    </div>
  )
}

// ── Pipeline Segment Row ──────────────────────────────────────────────────
function SegmentRow({ seg }: { seg: PipelineSegment }) {
  const [open, setOpen] = useState(false)
  const cfg = SEG_STATUS[seg.status]

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${cfg.color}20` }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen(v => !v)}>
        {/* Status dot */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${cfg.color}15`, color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{SEG_TYPE_LABEL[seg.type]}</span>
            <span className="text-[9px] font-black rounded-full px-1.5 py-0.5"
              style={{ background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
          </div>
          <div className="text-[10px] text-slate-500">{seg.id} · {seg.length_m}m · {seg.width_m}m wide</div>
        </div>
        {/* Flow indicator */}
        <div className="text-right shrink-0">
          <div className="text-xs font-black" style={{ color: seg.flow_ls > 10 ? '#22c55e' : seg.flow_ls > 0 ? '#f59e0b' : '#ef4444' }}>
            {seg.flow_ls} L/s
          </div>
          <div className="text-[9px] text-slate-600">{seg.confidence}% conf.</div>
        </div>
        {/* Blockage bar */}
        {seg.blockage_pct > 0 && (
          <div className="w-16 shrink-0">
            <div className="text-[8px] text-slate-600 mb-0.5">{seg.blockage_pct}% blocked</div>
            <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
              <div className="h-full rounded-full"
                style={{ width: `${seg.blockage_pct}%`, background: seg.blockage_pct > 60 ? '#ef4444' : '#f59e0b' }} />
            </div>
          </div>
        )}
        <ChevronRight size={13} className={`text-slate-600 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-3 pt-0 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Detection</div>
              <div className="text-[10px] text-slate-300">{seg.detectionMethod}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Last Active</div>
              <div className="text-[10px] text-slate-300">{seg.last_active}</div>
            </div>
          </div>
          {seg.blockage_cause && (
            <div className="mt-3 rounded-xl p-3" style={{ background: '#ef444408', border: '1px solid #ef444420' }}>
              <div className="text-[9px] font-bold text-red-400 mb-1">⚠ Blockage Cause</div>
              <div className="text-[11px] text-slate-300">{seg.blockage_cause}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pipeline Map SVG Schematic ───────────────────────────────────────────
function PipelineMapView({ data }: { data: IrrigationResult }) {
  const [hoveredSeg, setHoveredSeg] = useState<string | null>(null)
  const [hoveredDrain, setHoveredDrain] = useState<string | null>(null)

  // Field is conceptually a 480×380 SVG canvas (N at top, S at bottom)
  // We project lat/lng differences to pixel coordinates
  // Field center = (240, 190). Scale: 0.001 deg ≈ 111m ≈ 60px
  const scale = 60000  // pixels per degree
  const cx = 240, cy = 190

  const project = (lat: number, lng: number, centerLat: number, centerLng: number) => {
    const x = cx + (lng - centerLng) * scale
    const y = cy - (lat - centerLat) * scale  // flip lat (N = up)
    return [x, y] as [number, number]
  }

  // Get field center from segment data
  const centerLat = (data.segments[0].startCoord[0] + data.segments[0].endCoord[0]) / 2 - 0.001
  const centerLng = (data.segments[0].startCoord[1] + data.segments[0].endCoord[1]) / 2

  const SEG_COLOR: Record<string, string> = {
    active:   '#22c55e',
    blocked:  '#ef4444',
    dry:      '#f59e0b',
    overflow: '#f97316',
    damaged:  '#dc2626',
  }

  const SEG_WIDTH: Record<string, number> = {
    main_canal:       6,
    field_channel:    3.5,
    drainage:         4,
    pipe_underground: 2.5,
  }

  // Moisture cells → colored rectangles in a 4×4 grid inside the field
  const fieldW = 240, fieldH = 200
  const cellW = fieldW / 4, cellH = fieldH / 4
  const fieldX = cx - fieldW / 2, fieldY = cy - fieldH / 2

  const MOIST_COLOR: Record<string, string> = {
    optimal:     '#22c55e',
    low:         '#f59e0b',
    critical:    '#ef4444',
    saturated:   '#3b82f6',
    waterlogged: '#8b5cf6',
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(3,13,26,0.8)', border: '1px solid rgba(59,130,246,0.2)' }}>

      {/* Legend */}
      <div className="px-4 pt-4 pb-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-white/[0.05]">
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest self-center">Legend:</div>
        {[
          { color: '#22c55e', label: 'Active Canal', dash: false },
          { color: '#ef4444', label: 'Blocked Channel', dash: false },
          { color: '#f59e0b', label: 'Dry / Broken', dash: false },
          { color: '#f97316', label: 'Overflow', dash: false },
          { color: '#3b82f6', label: 'Drainage (dashed)', dash: true },
          { color: '#8b5cf6', label: 'Underground Pipe', dash: true },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="22" height="8">
              <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth={l.dash ? 2 : 3}
                strokeDasharray={l.dash ? '4 3' : '0'} />
            </svg>
            <span className="text-[9px] text-slate-400">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm" style={{ background: '#ef444440' }} />
          <span className="text-[9px] text-slate-400">Moisture zones</span>
        </div>
      </div>

      {/* SVG Map */}
      <div className="overflow-auto p-2">
        <svg width="480" height="380" viewBox="0 0 480 380" className="mx-auto"
          style={{ maxWidth: '100%', display: 'block' }}>

          {/* Dark field background */}
          <rect x="0" y="0" width="480" height="380" fill="#030d1a" rx="12" />

          {/* Grid dots (subtle) */}
          {Array.from({ length: 10 }).map((_, i) =>
            Array.from({ length: 8 }).map((_, j) => (
              <circle key={`${i}-${j}`} cx={30 + i * 48} cy={30 + j * 46} r="1" fill="#1e3a5f" opacity="0.5" />
            ))
          )}

          {/* Compass rose */}
          <g transform="translate(450, 30)">
            <text x="0" y="-12" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">N</text>
            <polygon points="0,-10 3,-2 0,0 -3,-2" fill="#3b82f6" />
            <text x="12" y="4" textAnchor="middle" fill="#334155" fontSize="7">E</text>
            <text x="-12" y="4" textAnchor="middle" fill="#334155" fontSize="7">W</text>
            <text x="0" y="18" textAnchor="middle" fill="#334155" fontSize="7">S</text>
          </g>

          {/* Scale bar */}
          <g transform="translate(20, 355)">
            <line x1="0" y1="0" x2="60" y2="0" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#334155" strokeWidth="1" />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="#334155" strokeWidth="1" />
            <text x="30" y="-5" textAnchor="middle" fill="#475569" fontSize="7">~100m</text>
          </g>

          {/* Moisture heat map cells */}
          {data.moisture_grid.map(cell => {
            const mx = fieldX + cell.col * cellW
            const my = fieldY + cell.row * cellH
            const color = MOIST_COLOR[cell.status]
            return (
              <g key={cell.gridId}>
                <rect x={mx} y={my} width={cellW} height={cellH}
                  fill={color} opacity={0.12} rx="2" />
                <text x={mx + cellW/2} y={my + cellH/2 - 4} textAnchor="middle"
                  fill={color} fontSize="8" fontWeight="bold" opacity="0.9">
                  {cell.moisture_pct}%
                </text>
                <text x={mx + cellW/2} y={my + cellH/2 + 6} textAnchor="middle"
                  fill={color} fontSize="6" opacity="0.6">
                  {cell.status.toUpperCase()}
                </text>
              </g>
            )
          })}

          {/* Field boundary */}
          <rect x={fieldX} y={fieldY} width={fieldW} height={fieldH}
            fill="none" stroke="#1e40af" strokeWidth="1.5" rx="4" opacity="0.5"
            strokeDasharray="6 3" />
          <text x={cx} y={fieldY - 6} textAnchor="middle" fill="#1e40af" fontSize="8" opacity="0.7">
            FIELD BOUNDARY (2.4 acres)
          </text>

          {/* Pipeline segments */}
          {data.segments.map(seg => {
            const [x1, y1] = project(seg.startCoord[0], seg.startCoord[1], centerLat, centerLng)
            const [x2, y2] = project(seg.endCoord[0], seg.endCoord[1], centerLat, centerLng)
            const color  = SEG_COLOR[seg.status]
            const sw     = SEG_WIDTH[seg.type]
            const dash   = seg.type === 'pipe_underground' ? '4 4' :
                           seg.type === 'drainage' ? '8 4' : '0'
            const isHov  = hoveredSeg === seg.id
            // Mid point for label
            const mx2 = (x1 + x2) / 2
            const my2 = (y1 + y2) / 2
            return (
              <g key={seg.id}
                onMouseEnter={() => setHoveredSeg(seg.id)}
                onMouseLeave={() => setHoveredSeg(null)}
                style={{ cursor: 'pointer' }}>
                {/* Glow backdrop */}
                {isHov && <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color} strokeWidth={sw + 6} opacity={0.15} strokeLinecap="round" />}
                {/* Main line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color} strokeWidth={isHov ? sw + 1 : sw}
                  strokeDasharray={dash} strokeLinecap="round" opacity={isHov ? 1 : 0.85} />
                {/* Flow direction arrows on active segments */}
                {seg.status === 'active' && seg.flow_ls > 0 && (() => {
                  const angle = Math.atan2(y2 - y1, x2 - x1)
                  const ax = mx2 + Math.cos(angle) * 0
                  const ay = my2 + Math.sin(angle) * 0
                  return (
                    <polygon
                      points={`${ax},${ay} ${ax - 8*Math.cos(angle-0.4)},${ay - 8*Math.sin(angle-0.4)} ${ax - 8*Math.cos(angle+0.4)},${ay - 8*Math.sin(angle+0.4)}`}
                      fill={color} opacity={0.7} />
                  )
                })()}
                {/* Blockage marker */}
                {seg.blockage_pct > 50 && (
                  <g transform={`translate(${mx2},${my2})`}>
                    <circle r="7" fill="#ef4444" opacity="0.9" />
                    <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="bold">✕</text>
                  </g>
                )}
                {/* ID label on hover */}
                {isHov && (
                  <g transform={`translate(${mx2},${my2 - 14})`}>
                    <rect x="-22" y="-8" width="44" height="14" rx="4" fill="#030d1a" stroke={color} strokeWidth="0.5" opacity="0.9" />
                    <text textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="8" fontWeight="bold">
                      {seg.id} {seg.flow_ls}L/s
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Drainage issue markers */}
          {data.drainage_issues.map(issue => {
            const [ix, iy] = project(issue.location[0], issue.location[1], centerLat, centerLng)
            const cfg      = DRAIN_SEVERITY[issue.severity]
            const isHov    = hoveredDrain === issue.id
            return (
              <g key={issue.id} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDrain(issue.id)}
                onMouseLeave={() => setHoveredDrain(null)}>
                {/* Pulse ring */}
                <circle cx={ix} cy={iy} r={isHov ? 18 : 12} fill={cfg.color} opacity={0.1} />
                <circle cx={ix} cy={iy} r={8} fill={cfg.color} opacity={0.9} />
                <text x={ix} y={iy} textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="8" fontWeight="bold">
                  {issue.severity === 'critical' ? '!' : issue.severity === 'high' ? '▲' : '●'}
                </text>
                {/* Tooltip */}
                {isHov && (
                  <g transform={`translate(${ix + 14}, ${iy - 18})`}>
                    <rect x="0" y="-9" width="90" height="24" rx="4"
                      fill="#030d1a" stroke={cfg.color} strokeWidth="0.7" opacity="0.97" />
                    <text x="5" y="0" fill={cfg.color} fontSize="7" fontWeight="bold">
                      {issue.id}: {issue.type.replace(/_/g,' ')}
                    </text>
                    <text x="5" y="10" fill="#94a3b8" fontSize="6.5">
                      {issue.affectedArea_acres}ac · {issue.cost_to_fix}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Direction labels */}
          <text x={cx} y={fieldY - 18} textAnchor="middle" fill="#1e3a5f" fontSize="7">NORTH (NH-226)</text>
          <text x={cx} y={fieldY + fieldH + 14} textAnchor="middle" fill="#1e3a5f" fontSize="7">SOUTH (Village Road)</text>
          <text x={fieldX - 8} y={cy} textAnchor="end" fill="#1e3a5f" fontSize="7" transform={`rotate(-90,${fieldX-8},${cy})`}>WEST</text>
          <text x={fieldX + fieldW + 8} y={cy} textAnchor="start" fill="#1e3a5f" fontSize="7" transform={`rotate(90,${fieldX+fieldW+8},${cy})`}>EAST</text>

          {/* Title */}
          <text x="240" y="16" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold" opacity="0.8">
            IRRIGATION NETWORK MAP — SATELLITE DETECTED
          </text>
        </svg>
      </div>

      {/* Interactive hint */}
      <div className="px-4 pb-3 text-[9px] text-slate-600 text-center">
        Hover over pipeline segments and issue markers for details · Moisture zones shown as heat overlay
      </div>
    </div>
  )
}

// ── Drainage Issue Card ───────────────────────────────────────────────────
function DrainageCard({ issue }: { issue: DrainageIssue }) {
  const [open, setOpen] = useState(false)
  const cfg = DRAIN_SEVERITY[issue.severity]

  const typeIcon: Record<string, React.ReactNode> = {
    construction_block: <Construction size={14} />,
    silt_deposit:       <Waves size={14} />,
    vegetation_overgrowth: <Activity size={14} />,
    structural_damage:  <Zap size={14} />,
    overflow:           <Waves size={14} />,
  }

  const typeLabel: Record<string, string> = {
    construction_block:     'Construction Blockage',
    silt_deposit:           'Silt Deposit',
    vegetation_overgrowth:  'Vegetation Overgrowth',
    structural_damage:      'Structural Damage',
    overflow:               'Overflow',
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      <button className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
        onClick={() => setOpen(v => !v)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
          style={{ background: `${cfg.color}20`, color: cfg.color }}>
          {typeIcon[issue.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black tracking-widest" style={{ color: cfg.color }}>
              ● {issue.severity.toUpperCase()}
            </span>
            {issue.waterlog_risk && (
              <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5"
                style={{ background: '#8b5cf618', color: '#a78bfa', border: '1px solid #8b5cf630' }}>
                WATERLOG RISK
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-white leading-tight">{typeLabel[issue.type]}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">{issue.zone} · {issue.affectedArea_acres} acres affected</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-black text-red-400">{issue.revenue_risk} risk</div>
          <div className="text-[9px] text-emerald-400">{issue.cost_to_fix} to fix</div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          <div className="mt-3 space-y-2">
            <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Analysis</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{issue.description}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: `${cfg.color}0a`, border: `1px solid ${cfg.color}20` }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>
                ⚡ Recommended Action
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{issue.recommendation}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Detected By</div>
              <p className="text-[10px] text-slate-400">{issue.detected_by}</p>
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
export default function IrrigationPage() {
  const router = useRouter()
  const [data, setData]         = useState<IrrigationResult | null>(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'map' | 'overview' | 'pipelines' | 'drainage' | 'moisture'>('map')
  const [lang, setLang]         = useState<'en' | 'hi'>('en')

  useEffect(() => {
    let lat = 10.787, lng = 79.139
    try {
      const raw = localStorage.getItem('farm_polygon')
      if (raw) { const p = JSON.parse(raw); if (p.center) { lat=p.center[0]; lng=p.center[1] } }
    } catch {}
    analyzeIrrigation(lat, lng).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: '#030d1a' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-[#0d2540] border-t-[#3b82f6] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Droplets size={20} className="text-[#3b82f6]" />
          </div>
        </div>
        <p className="font-mono text-xs text-[#3b82f6] tracking-[0.3em]">ANALYZING IRRIGATION NETWORK</p>
        <p className="font-mono text-[10px] text-slate-600">SAR + NDWI + DEM Processing…</p>
      </div>
    </div>
  )

  if (!data) return null
  const s = data.summary
  const criticalIssues = data.drainage_issues.filter(i => i.severity === 'critical' || i.severity === 'high')
  const totalRisk = data.drainage_issues.reduce((sum, i) => {
    const n = parseInt(i.revenue_risk.replace(/[^0-9]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const TABS = [
    { id: 'map',       label: 'Pipeline Map', color: '#06b6d4' },
    { id: 'overview',  label: 'Overview',     color: '#3b82f6' },
    { id: 'pipelines', label: 'Pipelines',    color: '#22c55e' },
    { id: 'drainage',  label: 'Drainage',     color: '#f59e0b' },
    { id: 'moisture',  label: 'Moisture Grid',color: '#8b5cf6' },
  ] as const

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden text-white" style={{ background: '#030d1a' }}>

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 px-5 py-3"
        style={{ background: 'rgba(3,13,26,0.95)', borderBottom: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => router.push('/field')}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft size={15} className="text-slate-400" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', boxShadow: '0 0 16px #3b82f630' }}>
            <Droplets size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">Irrigation Intelligence</h1>
            <p className="text-[10px] text-slate-500">SAR · NDWI · SMAP · DEM Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg"
          style={{ background: data.is_live ? '#22c55e12' : 'rgba(255,255,255,0.03)', border: data.is_live ? '1px solid #22c55e30' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className={`h-1.5 w-1.5 rounded-full ${data.is_live ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="font-mono text-[9px] text-slate-400">{data.is_live ? 'LIVE · SAR' : `DEMO · SAR ${data.sar_date}`}</span>
        </div>

        <div className="flex-1" />

        {/* View in 3D button */}
        <button
          onClick={() => {
            try { sessionStorage.setItem('tm-show-irrigation', '1') } catch {}
            router.push('/field')
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-white mr-2"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 4px 14px #0ea5e930' }}>
          <Droplets size={13} /> View in 3D
        </button>

        {/* Language toggle */}
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['en','hi'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="rounded-md px-3 py-1 text-[10px] font-black transition-all"
              style={lang===l ? { background:'#3b82f620', color:'#3b82f6', border:'1px solid #3b82f640' } : { color:'#475569', border:'1px solid transparent' }}>
              {l === 'en' ? 'EN' : 'हिं'}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', boxShadow: '0 4px 14px #3b82f630' }}>
          <FileText size={13} /> Export Report
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className="shrink-0 flex items-center gap-1 px-5 pt-3 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-xs font-bold transition-all"
            style={activeTab===t.id
              ? { background:`${t.color}15`, color:t.color, borderBottom:`2px solid ${t.color}`, marginBottom:-1 }
              : { color:'#475569', borderBottom:'2px solid transparent', marginBottom:-1 }
            }>
            {t.label}
            {t.id==='drainage' && criticalIssues.length > 0 && (
              <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background:'#ef444420', color:'#ef4444' }}>{criticalIssues.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

        {/* ══════ PIPELINE MAP ══════ */}
        {activeTab === 'map' && (
          <>
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-black text-white">Irrigation Network Map</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Detected via Sentinel-1 SAR · NDWI · DEM flow analysis · Hover segments for details
                </p>
              </div>
              <div className="flex gap-2">
                {[
                  { label: `${data.segments.filter(s=>s.status==='active').length} Active`, color: '#22c55e' },
                  { label: `${data.segments.filter(s=>s.status==='blocked'||s.status==='dry').length} Blocked`, color: '#ef4444' },
                  { label: `${data.drainage_issues.length} Issues`, color: '#f59e0b' },
                ].map(p => (
                  <span key={p.label} className="text-[9px] font-black rounded-full px-2.5 py-1"
                    style={{ background: `${p.color}15`, color: p.color, border: `1px solid ${p.color}30` }}>
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
            <PipelineMapView data={data} />

            {/* Quick segment summary below map */}
            <div className="grid grid-cols-1 gap-2">
              {data.segments.map(seg => {
                const cfg = SEG_STATUS[seg.status]
                return (
                  <div key={seg.id} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${cfg.color}18`, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white">{SEG_TYPE_LABEL[seg.type]}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{seg.id} · {seg.length_m}m</span>
                      {seg.blockage_cause && (
                        <p className="text-[9px] text-slate-500 mt-0.5 truncate">{seg.blockage_cause}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black" style={{ color: cfg.color }}>{cfg.label}</div>
                      <div className="text-[9px] text-slate-600">{seg.flow_ls} L/s</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══════ OVERVIEW ══════ */}
        {activeTab === 'overview' && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Canal Network"   value={`${s.total_canal_length_m}m`}    color="#3b82f6" />
              <StatPill label="Active Segments" value={`${s.active_segments}/${data.segments.length}`} color="#22c55e" />
              <StatPill label="Blocked"         value={`${s.blocked_segments} segs`}     color="#ef4444" />
              <StatPill label="Water Efficiency" value={`${s.water_use_efficiency}%`}   color="#f59e0b" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Avg Moisture"    value={`${s.avg_moisture}%`}             color="#8b5cf6" />
              <StatPill label="Critical Zones"  value={`${s.critical_zones} cells`}     color="#ef4444" />
              <StatPill label="Next Irrigation" value={`${s.next_irrigation_days} days`} color="#3b82f6" />
              <StatPill label="Seepage Loss"    value={`${s.estimated_seepage_loss_ls} L/s`} color="#f97316" />
            </div>

            {/* Top issues */}
            <div>
              <SectionHeader title="Critical Issues Detected" sub={`${criticalIssues.length} requiring immediate action · ₹${totalRisk.toLocaleString('en-IN')} revenue at risk`} color="#ef4444" />
              <div className="space-y-2">
                {data.drainage_issues.filter(i => i.severity === 'critical' || i.severity === 'high').map(issue => (
                  <DrainageCard key={issue.id} issue={issue} />
                ))}
              </div>
            </div>

            {/* Farmer advisory */}
            <div className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg,#1d4ed810,#1e40af08)', border: '1px solid #3b82f620' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: '#3b82f620', color: '#3b82f6' }}>
                  <Cpu size={14} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-blue-400 tracking-widest mb-1">
                    🤖 AI FIELD ADVISORY — {lang === 'hi' ? 'हिंदी' : 'ENGLISH'}
                  </div>
                  {lang === 'en' ? (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ravi bhai, your irrigation network has <strong className="text-red-400">1 critical blockage</strong> in the east channel caused by road construction debris.
                      This is cutting off water to 0.58 acres — fix it within 48 hours or risk waterlogging.
                      Also, your underground pipe near the NW corner has been dry for 12 days — likely broken.
                      Overall irrigation coverage is only <strong className="text-amber-400">68%</strong> of your field. Fix these two issues to reach 90%+ coverage.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      रवि भाई, आपके पूर्वी चैनल में <strong className="text-red-400">1 गंभीर रुकावट</strong> है — सड़क निर्माण के मलबे से।
                      यह 0.58 एकड़ में पानी काट रहा है — 48 घंटे में ठीक करें नहीं तो जलभराव का खतरा है।
                      साथ ही, NW कोने की भूमिगत पाइप 12 दिनों से सूखी है — शायद टूटी है।
                      कुल सिंचाई कवरेज सिर्फ <strong className="text-amber-400">68%</strong> है। इन दो समस्याओं को ठीक करके 90%+ तक पहुंचें।
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Moisture overview mini-grid */}
            <div>
              <SectionHeader title="Soil Moisture Overview" sub="4×4 field grid · 30cm depth · Sentinel-1 SAR + SMAP" color="#8b5cf6" />
              <div className="grid grid-cols-4 gap-2">
                {data.moisture_grid.map(cell => <MoistureCell key={cell.gridId} cell={cell} />)}
              </div>
            </div>
          </>
        )}

        {/* ══════ PIPELINES ══════ */}
        {activeTab === 'pipelines' && (
          <>
            <SectionHeader title="Irrigation Pipeline Network" sub={`${data.segments.length} segments detected via Sentinel-1 SAR + NDWI`} color="#22c55e" />

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(SEG_STATUS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ background:`${v.color}12`, border:`1px solid ${v.color}30`, color:v.color }}>
                  {v.icon} {v.label}
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                <span className="text-blue-400 font-bold">Detection method:</span> Sentinel-1 SAR C-band (VV polarisation) detects open water surface via high backscatter.
                NDWI (B3–B8) identifies water extent. DEM slope analysis traces flow direction.
                Temporal SAR change detection flags blocked/dry segments vs last 14 days.
              </p>
            </div>

            <div className="space-y-2">
              {data.segments.map(seg => <SegmentRow key={seg.id} seg={seg} />)}
            </div>

            {/* Flow summary */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="rounded-2xl p-4 text-center" style={{ background: '#22c55e0c', border: '1px solid #22c55e25' }}>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Total Inflow</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {data.segments.reduce((s, g) => s + g.flow_ls, 0).toFixed(1)} L/s
                </div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: '#ef44440c', border: '1px solid #ef444425' }}>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Seepage Loss</div>
                <div className="text-xl font-black text-red-400 mt-1">{s.estimated_seepage_loss_ls} L/s</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: '#3b82f60c', border: '1px solid #3b82f625' }}>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest">Efficiency</div>
                <div className="text-xl font-black text-blue-400 mt-1">{s.water_use_efficiency}%</div>
              </div>
            </div>
          </>
        )}

        {/* ══════ DRAINAGE ══════ */}
        {activeTab === 'drainage' && (
          <>
            <SectionHeader title="Drainage Blockage Analysis" sub="SAR temporal change + DEM flow direction + NDWI anomaly detection" color="#f59e0b" />

            {/* Construction alert banner */}
            {data.drainage_issues.some(i => i.type === 'construction_block') && (
              <div className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: '#ef444410', border: '1px solid #ef444435' }}>
                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-black text-red-400 mb-1">Construction Activity Detected</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {lang === 'en'
                      ? 'Road construction on NH-226 has physically blocked the east field drainage channel. This was detected via SAR temporal coherence change 6 days ago. Revenue risk: ₹9,400. File PWD complaint immediately.'
                      : 'NH-226 पर सड़क निर्माण ने पूर्वी खेत की जल निकासी नहर को शारीरिक रूप से अवरुद्ध कर दिया है। इसे 6 दिन पहले SAR टेम्पोरल कोहेरेंस परिवर्तन के माध्यम से पता चला था। राजस्व जोखिम: ₹9,400। तुरंत PWD शिकायत दर्ज करें।'
                    }
                  </p>
                  <button className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black text-white"
                    style={{ background: '#ef4444' }}>
                    File PWD Complaint <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {data.drainage_issues.map(issue => <DrainageCard key={issue.id} issue={issue} />)}
            </div>

            {/* Total risk summary */}
            <div className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total Revenue at Risk</div>
                <div className="text-2xl font-black text-red-400 mt-1">₹{totalRisk.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total Fix Cost</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{data.drainage_issues.reduce((s,i) => s + parseInt(i.cost_to_fix.replace(/[^0-9]/g,'')||'0'), 0).toLocaleString('en-IN')}
                </div>
              </div>
              <button className="flex items-center gap-2 rounded-2xl px-5 py-3 font-black text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', boxShadow: '0 4px 14px #3b82f630' }}>
                Fix All → ROI <ChevronRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ══════ MOISTURE GRID ══════ */}
        {activeTab === 'moisture' && (
          <>
            <SectionHeader title="Soil Moisture Grid" sub="16-cell 4×4 grid · VWC at 30cm depth · Sentinel-1 SAR + SMAP 9km downscaled" color="#8b5cf6" />

            {/* Legend */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(MOISTURE_STATUS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black"
                  style={{ background: v.bg, border: `1px solid ${v.color}30`, color: v.color }}>
                  {v.label}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-4 gap-2 mb-1">
                {['West', 'Centre-W', 'Centre-E', 'East'].map(l => (
                  <div key={l} className="text-[8px] text-slate-600 text-center font-bold uppercase tracking-wider">{l}</div>
                ))}
              </div>
              {[0,1,2,3].map(row => (
                <div key={row} className="flex items-center gap-2 mb-2">
                  <div className="text-[8px] text-slate-600 font-bold uppercase tracking-wider w-12 shrink-0 text-right pr-1">
                    {['North','N-Mid','S-Mid','South'][row]}
                  </div>
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {data.moisture_grid.filter(c => c.row === row).map(cell => (
                      <MoistureCell key={cell.gridId} cell={cell} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill label="Field Average"   value={`${s.avg_moisture}%`} color="#8b5cf6" />
              <StatPill label="Critical Cells"  value={`${s.critical_zones}`} color="#ef4444" />
              <StatPill label="Field Capacity"  value="65%" color="#3b82f6" />
              <StatPill label="Wilting Point"   value="28%" color="#f59e0b" />
            </div>

            {/* Interpretation */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-bold text-slate-400 mb-2">How to read this grid</div>
              <div className="space-y-1 text-[10px] text-slate-500 leading-relaxed">
                <p>• <span className="text-red-400 font-bold">CRITICAL (&lt;30%)</span>: Below wilting point — immediate irrigation needed or crop stress begins</p>
                <p>• <span className="text-amber-400 font-bold">LOW (30–40%)</span>: Below threshold — schedule irrigation within 48 hours</p>
                <p>• <span className="text-emerald-400 font-bold">OPTIMAL (40–65%)</span>: Field capacity range — crops growing normally</p>
                <p>• <span className="text-blue-400 font-bold">SATURATED (&gt;65%)</span>: Above field capacity — risk of oxygen depletion in root zone</p>
                <p>• <span className="text-purple-400 font-bold">WATERLOGGED (&gt;75%)</span>: Standing water or subsurface saturation — drainage urgently needed</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-3"
        style={{ background: 'rgba(3,13,26,0.95)', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
        <MapPin size={11} className="text-blue-400" />
        <span className="font-mono text-[9px] text-slate-600">SAR: {data.sar_date} · NDWI: {data.ndwi_date} · Analyzed: {new Date(data.analyzed_at).toLocaleTimeString()}</span>
        <div className="flex-1" />
        <button onClick={() => router.push('/field')}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft size={12} /> Back to Field View
        </button>
      </div>
    </main>
  )
}
