'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, Droplets, Activity, Target, ChevronRight,
  ArrowLeft, Cpu, Send, MapPin, ZoomIn, ZoomOut, RotateCcw,
  TrendingUp, Thermometer, FlaskConical, Layers, X, Home,
} from 'lucide-react'
import {
  LEVEL1_DATA, LEVEL1_FLAT, L1_MOST_CRITICAL, L1_TOP_CRITICAL,
  HEALTH_COLOR, DISEASE_COLOR,
  useHierarchyStore,
  type HierarchyCell,
} from '@/lib/hierarchyStore'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'

// ════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════
const LAYERS = [
  { id: 'health',   label: 'Health',   icon: Activity,      color: '#22c55e' },
  { id: 'moisture', label: 'Moisture', icon: Droplets,      color: '#38bdf8' },
  { id: 'disease',  label: 'Disease',  icon: AlertTriangle, color: '#ef4444' },
  { id: 'yield',    label: 'Yield',    icon: TrendingUp,    color: '#a78bfa' },
  { id: 'soil',     label: 'Soil',     icon: Layers,        color: '#f59e0b' },
  { id: 'nitrogen', label: 'Nitrogen', icon: FlaskConical,  color: '#06b6d4' },
] as const
type LayerId = typeof LAYERS[number]['id']

const LEVEL_META = {
  1: { label: 'Field View',   subtitle: '10 × 10 Overview',      color: '#38bdf8', icon: '🌾' },
  2: { label: 'Zone View',    subtitle: '5 × 5 Sub-Zones',        color: '#a78bfa', icon: '🔬' },
  3: { label: 'Micro View',   subtitle: '3 × 3 Micro-Zones',      color: '#f59e0b', icon: '⚗️' },
}

const LEVEL_INSIGHTS: Record<number, string[]> = {
  1: [
    'Field-wide health overview — click any quadrant to drill deeper.',
    'Red zones indicate combined soil, moisture and disease pressure.',
    'Each click reveals a NEW subdivided grid with unique data.',
  ],
  2: [
    'Sub-zone resolution — NDVI variation within the parent zone is visible.',
    'Each sub-cell is a ~50m × 50m patch. Irrigation lines map here.',
    'Click any cell to drill into micro-zones for precise analysis.',
  ],
  3: [
    'Micro-zone precision — individual plant row level (~15m × 15m).',
    'Actionable: target these exact patches for spot treatment.',
    'Temperature and pH variance here indicates root-zone heterogeneity.',
  ],
}

// ════════════════════════════════════════════════════════════════════════
// CELL COLOR LOGIC
// ════════════════════════════════════════════════════════════════════════
function getCellColor(cell: HierarchyCell, layer: LayerId): string {
  let value: number
  let invert = false

  switch (layer) {
    case 'health':
      if (cell.healthLevel === 'healthy')  return '#22c55e'
      if (cell.healthLevel === 'moderate') return '#f59e0b'
      return '#ef4444'
    case 'moisture':
      value = cell.moisture; break
    case 'disease': {
      const order = { none: 0, low: 20, medium: 50, high: 75, critical: 100 }
      value = order[cell.diseaseRisk]; invert = true; break
    }
    case 'yield':
      value = cell.yieldPrediction; break
    case 'soil':
      value = cell.soilQuality; break
    case 'nitrogen':
      value = cell.nitrogenLevel; break
    default:
      return '#22c55e'
  }

  if (invert) {
    const t = value / 100
    const r = Math.round(34  + t * (239 - 34))
    const g = Math.round(197 - t * (197 - 68))
    const b = Math.round(94  - t * (94  - 68))
    return `rgb(${r},${g},${b})`
  } else {
    const t = value / 100
    const r = Math.round(239 - t * (239 - 34))
    const g = Math.round(68  + t * (197 - 68))
    const b = Math.round(68  + t * (94  - 68))
    return `rgb(${r},${g},${b})`
  }
}

// ════════════════════════════════════════════════════════════════════════
// MINI BAR
// ════════════════════════════════════════════════════════════════════════
function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="w-8 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// BREADCRUMB
// ════════════════════════════════════════════════════════════════════════
function Breadcrumb({
  drillPath, currentLevel, onNavigate,
}: {
  drillPath: { cell: HierarchyCell; gridSize: number }[]
  currentLevel: number
  onNavigate: (idx: number) => void
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Home / Field root */}
      <button
        onClick={() => onNavigate(-1)}
        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
      >
        <Home size={10} />
        <span>Field</span>
      </button>

      {drillPath.map((entry, idx) => (
        <span key={entry.cell.id} className="flex items-center gap-1">
          <ChevronRight size={10} className="text-slate-600" />
          <button
            onClick={() => onNavigate(idx)}
            className="text-[10px] text-slate-400 hover:text-white transition-colors max-w-[80px] truncate"
          >
            {entry.cell.boundLabel}
          </button>
        </span>
      ))}

      {drillPath.length > 0 && (
        <span className="flex items-center gap-1">
          <ChevronRight size={10} className="text-slate-600" />
          <span
            className="text-[10px] font-bold"
            style={{ color: LEVEL_META[currentLevel as 1|2|3].color }}
          >
            {LEVEL_META[currentLevel as 1|2|3].icon} {LEVEL_META[currentLevel as 1|2|3].label}
          </span>
        </span>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// DRILL-DOWN GRID CELL
// Single-click drills in (level 1→2, 2→3).
// At level 3 (max depth), single-click selects for inspection.
// Hold-hover shows inspect icon to open detail panel without drilling.
// ════════════════════════════════════════════════════════════════════════
function HierarchyCellComp({
  cell, layer, isSelected, canDrillIn, showCriticalPath, isMostCritical,
  onDrillIn, onInspect, onHover,
}: {
  cell: HierarchyCell
  layer: LayerId
  isSelected: boolean
  canDrillIn: boolean
  showCriticalPath: boolean
  isMostCritical: boolean
  onDrillIn: () => void
  onInspect: () => void
  onHover: (c: HierarchyCell | null) => void
}) {
  const bg = getCellColor(cell, layer)
  const pulse = isMostCritical

  // Single click: drill if possible, otherwise inspect
  const handleClick = useCallback(() => {
    if (canDrillIn) {
      onDrillIn()
    } else {
      onInspect()
    }
  }, [canDrillIn, onDrillIn, onInspect])

  return (
    <motion.div
      className="relative cursor-pointer rounded-sm overflow-hidden group"
      style={{ background: bg + '2a', border: `1px solid ${bg}44` }}
      whileHover={{ scale: 1.1, zIndex: 10 }}
      whileTap={{ scale: 0.93 }}
      animate={
        isSelected
          ? { scale: 1.1, boxShadow: `0 0 18px ${bg}, 0 0 36px ${bg}44`, zIndex: 20 }
          : pulse
          ? { scale: [1, 1.05, 1], boxShadow: [`0 0 6px ${bg}`, `0 0 20px ${bg}`, `0 0 6px ${bg}`] }
          : {}
      }
      transition={pulse ? { duration: 1.4, repeat: Infinity } : { type: 'spring', stiffness: 300 }}
      onClick={handleClick}
      onMouseEnter={() => onHover(cell)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{ background: `radial-gradient(circle at 50% 50%, ${bg}, transparent 70%)` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold opacity-60" style={{ color: bg, textShadow: '0 0 4px #000' }}>
          {cell.criticalScore}
        </span>
      </div>
      {isMostCritical && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
      )}
      {isSelected && (
        <div className="absolute inset-0 border-2 rounded-sm animate-pulse" style={{ borderColor: bg }} />
      )}
      {/* Drill-in indicator for drillable cells */}
      {canDrillIn && (
        <div className="absolute inset-0 flex items-end justify-center pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={8} style={{ color: bg }} />
        </div>
      )}
      {/* Inspect icon — right-click alt: small eye button to open panel without drilling */}
      <div
        className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-80 transition-opacity z-10"
        onClick={(e) => { e.stopPropagation(); onInspect() }}
        title="Inspect zone"
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="2.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>
        </svg>
      </div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// GRID CANVAS — animated grid with level-aware sizing
// ════════════════════════════════════════════════════════════════════════
const GRID_CELL_SIZE: Record<number, string> = { 10: '1.75rem', 5: '2.4rem', 3: '3.5rem' }

function GridCanvas({
  grid, gridSize, layer, selectedCell, hoveredCell, showCriticalPath,
  mostCriticalId, topCriticalIds, transitionDir,
  onCellDrillIn, onCellInspect, onCellHover,
}: {
  grid: HierarchyCell[][]
  gridSize: number
  layer: LayerId
  selectedCell: HierarchyCell | null
  hoveredCell: HierarchyCell | null
  showCriticalPath: boolean
  mostCriticalId: string
  topCriticalIds: Set<string>
  transitionDir: 'in' | 'out'
  onCellDrillIn: (c: HierarchyCell) => void
  onCellInspect: (c: HierarchyCell) => void
  onCellHover: (c: HierarchyCell | null) => void
}) {
  const cellSz = GRID_CELL_SIZE[gridSize] ?? '1.75rem'
  const canDrill = gridSize > 3 // level 1 → 2, level 2 → 3; level 3 can't drill

  const enterAnim = transitionDir === 'in'
    ? { opacity: 0, scale: 0.82, filter: 'blur(4px)' }
    : { opacity: 0, scale: 1.14, filter: 'blur(4px)' }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`grid-${gridSize}-${grid[0]?.[0]?.id ?? 'root'}`}
        initial={enterAnim}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={transitionDir === 'in'
          ? { opacity: 0, scale: 1.1, filter: 'blur(3px)' }
          : { opacity: 0, scale: 0.88, filter: 'blur(3px)' }
        }
        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Column labels */}
        <div className="flex mb-1" style={{ marginLeft: cellSz, gap: '2px' }}>
          {Array.from({ length: gridSize }, (_, i) => (
            <div
              key={i}
              className="text-center text-[9px] text-slate-600 font-mono"
              style={{ width: cellSz }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: '2px' }}>
          {/* Row labels */}
          <div className="flex flex-col mr-0.5 justify-start" style={{ gap: '2px' }}>
            {Array.from({ length: gridSize }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-end text-[9px] text-slate-600 font-mono pr-1"
                style={{ height: cellSz, width: cellSz }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, ${cellSz})`,
              gap: '2px',
            }}
          >
            {grid.flat().map(cell => (
              <HierarchyCellComp
                key={cell.id}
                cell={cell}
                layer={layer}
                isSelected={selectedCell?.id === cell.id}
                canDrillIn={canDrill}
                showCriticalPath={showCriticalPath}
                isMostCritical={cell.id === mostCriticalId}
                onDrillIn={() => onCellDrillIn(cell)}
                onInspect={() => onCellInspect(cell)}
                onHover={onCellHover}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ════════════════════════════════════════════════════════════════════════
// RADAR CHART
// ════════════════════════════════════════════════════════════════════════
function CellRadar({ cell }: { cell: HierarchyCell }) {
  const data = [
    { subject: 'Soil',     value: cell.soilQuality },
    { subject: 'Moisture', value: cell.moisture },
    { subject: 'Nitrogen', value: cell.nitrogenLevel },
    { subject: 'Yield',    value: cell.yieldPrediction },
    { subject: 'Health',   value: 100 - cell.criticalScore },
  ]
  return (
    <ResponsiveContainer width="100%" height={150}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
        <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={1.5} />
        <Tooltip
          contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#94a3b8' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ════════════════════════════════════════════════════════════════════════
// LEVEL BADGE
// ════════════════════════════════════════════════════════════════════════
function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const meta = LEVEL_META[level]
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
      <span className="opacity-60">· {meta.subtitle}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// CELL DETAIL PANEL
// ════════════════════════════════════════════════════════════════════════
function CellDetailPanel({
  cell, onClose, onDrillIn, onAiExplain, aiResponse, aiLoading,
}: {
  cell: HierarchyCell
  onClose: () => void
  onDrillIn: (c: HierarchyCell) => void
  onAiExplain: (c: HierarchyCell) => void
  aiResponse: string | null
  aiLoading: boolean
}) {
  const hColor = HEALTH_COLOR[cell.healthLevel]
  const dColor = DISEASE_COLOR[cell.diseaseRisk]
  const canDrill = cell.level < 3
  const insights = LEVEL_INSIGHTS[cell.level]

  const metrics = [
    { label: 'Soil Quality', value: cell.soilQuality,    unit: '/100', color: '#f59e0b', icon: Layers },
    { label: 'Moisture',     value: cell.moisture,        unit: '%',    color: '#38bdf8', icon: Droplets },
    { label: 'Nitrogen',     value: cell.nitrogenLevel,   unit: '/100', color: '#06b6d4', icon: FlaskConical },
    { label: 'Yield Pred.',  value: cell.yieldPrediction, unit: '%',    color: '#a78bfa', icon: TrendingUp },
    { label: 'Temperature',  value: cell.temperature,     unit: '°C',   color: '#f97316', icon: Thermometer },
    { label: 'pH',           value: cell.pH,              unit: '',     color: '#84cc16', icon: Activity },
  ]

  return (
    <motion.div
      key={cell.id}
      className="flex flex-col h-full overflow-y-auto"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <MapPin size={11} className="text-slate-400" />
            <span className="font-mono text-[10px] text-slate-400">
              {cell.levelLabel} · {cell.boundLabel}
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight mb-1.5" style={{ color: hColor }}>
            {cell.boundLabel}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <LevelBadge level={cell.level} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Health badges */}
      <div className="flex gap-2 mb-4">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
          style={{ background: hColor + '22', color: hColor, border: `1px solid ${hColor}44` }}
        >
          {cell.healthLevel}
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
          style={{ background: dColor + '22', color: dColor, border: `1px solid ${dColor}44` }}
        >
          Disease: {cell.diseaseRisk}
        </span>
      </div>

      {/* Score ring */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-xl border border-white/10 bg-white/[0.03]">
        <svg width={60} height={60} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
          <circle cx={32} cy={32} r={26} fill="none" stroke={hColor} strokeWidth={5}
            strokeDasharray={`${(cell.criticalScore / 100) * (2 * Math.PI * 26)} ${2 * Math.PI * 26}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{ filter: `drop-shadow(0 0 6px ${hColor})` }}
          />
          <text x={32} y={37} textAnchor="middle" fill={hColor} fontSize={13} fontWeight={900} fontFamily="system-ui">
            {cell.criticalScore}
          </text>
        </svg>
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">Critical Score</div>
          <div className="text-sm font-bold text-white">{cell.criticalScore}/100</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {new Date(cell.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-slate-500 mb-0.5">Yield</div>
          <div className="text-2xl font-black" style={{ color: '#a78bfa' }}>{cell.yieldPrediction}%</div>
        </div>
      </div>

      {/* Radar */}
      <CellRadar cell={cell} />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4 mt-2">
        {metrics.map(m => (
          <div key={m.label} className="p-2 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-1 mb-1">
              <m.icon size={10} style={{ color: m.color }} />
              <span className="text-[9px] text-slate-500">{m.label}</span>
            </div>
            <div className="text-sm font-black" style={{ color: m.color }}>
              {m.value}{m.unit}
            </div>
            <div className="mt-1 h-1 rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: m.color }}
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(
                    typeof m.value === 'number'
                      ? m.unit === '°C' ? m.value / 40 * 100
                      : m.unit === '' ? (m.value - 4) / 4.5 * 100
                      : m.value
                      : 50,
                    100,
                  )}%`,
                }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stressors */}
      <div className="mb-4">
        <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-bold">Detected Stressors</div>
        <div className="flex flex-col gap-1">
          {cell.cropStress.map((s, i) => {
            const ok = s === 'No active stressors'
            return (
              <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: ok ? '#22c55e' : '#fbbf24' }}>
                <span>{ok ? '✅' : '⚠️'}</span>
                <span>{s}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Level-specific insight */}
      <div className="mb-4 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-bold flex items-center gap-1">
          <span>{LEVEL_META[cell.level].icon}</span>
          <span>{LEVEL_META[cell.level].label} Insights</span>
        </div>
        {insights.map((ins, i) => (
          <div key={i} className="text-[10px] text-slate-400 mb-1 leading-relaxed">{ins}</div>
        ))}
      </div>

      {/* Drill deeper button */}
      {canDrill && (
        <motion.button
          onClick={() => onDrillIn(cell)}
          className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3"
          style={{
            background: 'linear-gradient(135deg, #0f3460, #533483)',
            color: 'white',
            boxShadow: '0 0 18px #533483AA',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 28px #533483' }}
          whileTap={{ scale: 0.97 }}
        >
          <ZoomIn size={14} />
          Drill into {cell.level === 1 ? 'Sub-Zones (5×5)' : 'Micro-Zones (3×3)'}
        </motion.button>
      )}

      {/* AI Explain */}
      <button
        onClick={() => onAiExplain(cell)}
        disabled={aiLoading}
        className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3 transition-all"
        style={{
          background: aiLoading ? '#1e3a5f' : 'linear-gradient(135deg, #2a6fdb, #7c3aed)',
          color: 'white',
          boxShadow: aiLoading ? 'none' : '0 0 18px #2a6fdb44',
        }}
      >
        <Cpu size={13} />
        {aiLoading ? 'Analyzing...' : 'AI Explain This Zone'}
      </button>

      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl border border-[#2a6fdb]/40 bg-[#0a1628] text-[11px] leading-relaxed text-slate-300"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Cpu size={10} className="text-[#2a6fdb]" />
              <span className="text-[9px] font-bold text-[#2a6fdb] uppercase tracking-wider">TerraMind AI</span>
            </div>
            {aiResponse}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// AI QUERY BAR
// ════════════════════════════════════════════════════════════════════════
function AIQueryBar({ onResult }: {
  onResult: (response: string, navigateTo?: { row: number; col: number }) => void
}) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const SUGGESTIONS = ['Show worst area', 'Which part needs water?', 'Most disease risk', 'Best yield zone']

  const submit = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/grid-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'query', query: q }),
      })
      const data = await res.json()
      onResult(data.response, data.navigateTo)
    } catch {
      onResult('AI service temporarily unavailable.')
    }
    setLoading(false)
    setQuery('')
  }, [onResult])

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1e3a5f] bg-[#07112a] focus-within:border-[#2a6fdb]/60 transition-colors">
          <Cpu size={12} className="text-[#2a6fdb] shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit(query)}
            placeholder='Ask AI: "Show worst area"'
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none"
          />
        </div>
        <button
          onClick={() => submit(query)}
          disabled={loading || !query.trim()}
          className="px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #2a6fdb, #7c3aed)', color: 'white' }}
        >
          {loading
            ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
            : <Send size={12} />
          }
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => submit(s)}
            className="text-[9px] px-2 py-0.5 rounded-full border border-[#1e3a5f] text-slate-400 hover:text-white hover:border-[#2a6fdb]/50 transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// LEFT PANEL — Level-aware sidebar
// ════════════════════════════════════════════════════════════════════════
function LeftPanel({
  drillPath, currentLevel, currentGrid,
  onSelectCell, onAiNav,
}: {
  drillPath: { cell: HierarchyCell; gridSize: number }[]
  currentLevel: number
  currentGrid: HierarchyCell[][]
  onSelectCell: (c: HierarchyCell) => void
  onAiNav: (response: string, nav?: { row: number; col: number }) => void
}) {
  const flat = currentGrid.flat()
  const topCrit = [...flat].sort((a, b) => b.criticalScore - a.criticalScore).slice(0, 5)
  const critCount  = flat.filter(c => c.healthLevel === 'critical').length
  const modCount   = flat.filter(c => c.healthLevel === 'moderate').length
  const hltyCount  = flat.filter(c => c.healthLevel === 'healthy').length
  const avgMoist   = Math.round(flat.reduce((s, c) => s + c.moisture, 0) / flat.length)
  const avgYield   = Math.round(flat.reduce((s, c) => s + c.yieldPrediction, 0) / flat.length)

  const meta = LEVEL_META[currentLevel as 1|2|3]

  return (
    <div className="w-64 shrink-0 flex flex-col border-r border-white/[0.06] p-4 gap-4 overflow-y-auto"
      style={{ background: 'rgba(3,9,20,0.6)' }}>

      {/* Level indicator */}
      <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider font-bold">Current Level</div>
        <LevelBadge level={currentLevel as 1|2|3} />
        <div className="mt-2 text-[10px] text-slate-400">
          {currentLevel === 1
            ? `Viewing ${flat.length} field zones. Click a cell to inspect, double-click to drill in.`
            : currentLevel === 2
            ? `Viewing ${flat.length} sub-zones inside ${drillPath[0]?.cell.boundLabel ?? 'parent zone'}.`
            : `Micro-zone precision. ${flat.length} patches. Max resolution.`}
        </div>
      </div>

      {/* AI Query */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">AI Navigator</div>
        <AIQueryBar onResult={onAiNav} />
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* Top critical in current view */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
          Top Critical — {meta.label}
        </div>
        <div className="space-y-1.5">
          {topCrit.map((cell, i) => {
            const hc = HEALTH_COLOR[cell.healthLevel]
            return (
              <motion.button
                key={cell.id}
                onClick={() => onSelectCell(cell)}
                className="w-full p-2 rounded-lg border text-left"
                style={{ borderColor: hc + '33', background: hc + '0a' }}
                whileHover={{ borderColor: hc + '88', x: 2 }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black" style={{ color: hc }}>#{i + 1}</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-[90px]">{cell.boundLabel}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: hc + '22', color: hc }}>
                    {cell.criticalScore}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500">{cell.cropStress[0]}</div>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* Stats */}
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
          {meta.icon} {meta.label} Stats
        </div>
        {[
          { label: 'Critical',    value: critCount,  color: '#ef4444', suffix: `/${flat.length}` },
          { label: 'Moderate',    value: modCount,   color: '#f59e0b', suffix: `/${flat.length}` },
          { label: 'Healthy',     value: hltyCount,  color: '#22c55e', suffix: `/${flat.length}` },
          { label: 'Avg Moisture',value: avgMoist,   color: '#38bdf8', suffix: '%' },
          { label: 'Avg Yield',   value: avgYield,   color: '#a78bfa', suffix: '%' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-slate-500">{s.label}</span>
            <span className="text-[10px] font-bold" style={{ color: s.color }}>
              {s.value}{s.suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// LEGEND
// ════════════════════════════════════════════════════════════════════════
function Legend({ layer }: { layer: LayerId }) {
  const stops = layer === 'disease'
    ? [
        { color: '#22c55e', label: 'None' }, { color: '#84cc16', label: 'Low' },
        { color: '#f59e0b', label: 'Med' },  { color: '#f97316', label: 'High' },
        { color: '#ef4444', label: 'Crit' },
      ]
    : [
        { color: '#ef4444', label: 'Low' }, { color: '#f59e0b', label: 'Mid' },
        { color: '#22c55e', label: 'High' },
      ]
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider">Legend</span>
      {stops.map(s => (
        <div key={s.label} className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
          <span className="text-[9px] text-slate-400">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function GridPage() {
  const {
    currentGrid, currentGridSize, drillPath, transitionDir,
    selectedCell, hoveredCell, activeLayer, showCriticalPath,
    aiResponse, aiLoading,
    setSelectedCell, setHoveredCell, setActiveLayer, setAiResponse, setAiLoading,
    setShowCriticalPath, drillInto, drillOut, navigateToDepth, resetToLevel1,
  } = useHierarchyStore()

  const [aiNavMessage, setAiNavMessage] = useState<string | null>(null)

  // Current level: 1 if no drillPath, else last drilled cell's level + 1
  const currentLevel: 1 | 2 | 3 = drillPath.length === 0
    ? 1
    : drillPath.length === 1 ? 2 : 3

  // Most critical in current view
  const flatGrid = currentGrid.flat()
  const mostCritical = [...flatGrid].sort((a, b) => b.criticalScore - a.criticalScore)[0]
  const topCritIds = new Set(
    [...flatGrid].sort((a, b) => b.criticalScore - a.criticalScore).slice(0, 5).map(c => c.id),
  )

  useEffect(() => {
    setShowCriticalPath(true)
    const t = setTimeout(() => setShowCriticalPath(false), 3000)
    return () => clearTimeout(t)
  }, [setShowCriticalPath, currentGrid]) // re-pulse on new grid

  // Single-click on a cell = drill into it (generates NEW child grid with unique data)
  const handleDrillIn = useCallback((cell: HierarchyCell) => {
    console.log('[TerraMind] Drilling into:', cell.id, '| Level:', cell.level, '→', cell.level + 1)
    setAiResponse(null)
    setSelectedCell(null)
    drillInto(cell)
  }, [drillInto, setAiResponse, setSelectedCell])

  // Inspect = open detail panel WITHOUT drilling (via eye icon or sidebar)
  const handleInspect = useCallback((cell: HierarchyCell) => {
    console.log('[TerraMind] Inspecting:', cell.id)
    setSelectedCell(cell)
    setAiResponse(null)
  }, [setSelectedCell, setAiResponse])

  const handleClose = useCallback(() => {
    setSelectedCell(null)
    setAiResponse(null)
  }, [setSelectedCell, setAiResponse])

  const handleDrillOut = useCallback(() => {
    setAiResponse(null)
    drillOut()
  }, [drillOut, setAiResponse])

  const handleReset = useCallback(() => {
    setAiResponse(null)
    resetToLevel1()
  }, [resetToLevel1, setAiResponse])

  // Navigate breadcrumb to specific index (-1 = root, 0 = first drilled cell's children, etc.)
  const handleBreadcrumbNav = useCallback((idx: number) => {
    setAiResponse(null)
    if (idx === -1) {
      resetToLevel1()
    } else {
      // idx 0 means show the grid that was generated when we drilled into drillPath[0]
      // That means we want depth = idx + 1 entries in drillPath
      navigateToDepth(idx + 1)
    }
  }, [navigateToDepth, resetToLevel1, setAiResponse])

  const handleAiExplain = useCallback(async (cell: HierarchyCell) => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/grid-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'explain', cell }),
      })
      const data = await res.json()
      setAiResponse(data.response)
    } catch {
      setAiResponse('AI analysis unavailable. Check Gemini API key.')
    }
    setAiLoading(false)
  }, [setAiLoading, setAiResponse])

  const handleAiNav = useCallback((response: string, navigateTo?: { row: number; col: number }) => {
    setAiNavMessage(response)
    if (navigateTo) {
      const cell = currentGrid[navigateTo.row]?.[navigateTo.col]
      if (cell) { setSelectedCell(cell); setAiResponse(response) }
    }
    setTimeout(() => setAiNavMessage(null), 6000)
  }, [currentGrid, setSelectedCell, setAiResponse])

  const handleGoCritical = useCallback(() => {
    if (mostCritical) {
      setSelectedCell(mostCritical)
      setAiResponse(null)
    }
  }, [mostCritical, setSelectedCell, setAiResponse])

  return (
    <div
      className="h-screen w-full text-white flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020b1a 0%, #030d1f 50%, #050a14 100%)' }}
    >
      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] shrink-0"
        style={{ background: 'rgba(3,13,31,0.9)', backdropFilter: 'blur(12px)' }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3">
          <a href="/field" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors">
            <ArrowLeft size={13} /> Field View
          </a>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-black text-sm tracking-tight">TERRAMIND</span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Grid Intelligence</span>
          </div>
        </div>

        {/* Center: breadcrumb + drill controls */}
        <div className="flex flex-col items-center gap-1">
          <Breadcrumb
            drillPath={drillPath}
            currentLevel={currentLevel}
            onNavigate={handleBreadcrumbNav}
          />
          {/* Drill nav buttons */}
          <div className="flex items-center gap-2">
            {drillPath.length > 0 && (
              <motion.button
                onClick={handleDrillOut}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <ZoomOut size={10} /> Back
              </motion.button>
            )}
            {drillPath.length > 0 && (
              <motion.button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <RotateCcw size={9} /> Field
              </motion.button>
            )}
          </div>
        </div>

        {/* Right: layer + most critical */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 p-1 rounded-xl border border-white/[0.06] bg-white/[0.03]">
            {LAYERS.map(l => (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={
                  activeLayer === l.id
                    ? { background: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }
                    : { color: '#64748b' }
                }
              >
                <l.icon size={10} />
                <span className="hidden lg:inline">{l.label}</span>
              </button>
            ))}
          </div>

          <motion.button
            onClick={handleGoCritical}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #ef444422, #ef4444)', color: 'white', boxShadow: '0 0 16px #ef444440' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={{ boxShadow: ['0 0 8px #ef444430', '0 0 20px #ef444470', '0 0 8px #ef444430'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Target size={12} />
            Most Critical
          </motion.button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <LeftPanel
          drillPath={drillPath}
          currentLevel={currentLevel}
          currentGrid={currentGrid}
          onSelectCell={handleInspect}
          onAiNav={handleAiNav}
        />

        {/* CENTER: Grid */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto gap-4">
          {/* Grid label + legend row */}
          <div className="flex items-center justify-between w-full max-w-fit gap-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLevel}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex items-center gap-2"
              >
                <LevelBadge level={currentLevel} />
                <span className="text-[10px] text-slate-500">
                  {currentGridSize}×{currentGridSize} · {flatGrid.length} zones
                </span>
              </motion.div>
            </AnimatePresence>
            <Legend layer={activeLayer as LayerId} />
          </div>

          {/* The grid canvas */}
          <GridCanvas
            grid={currentGrid}
            gridSize={currentGridSize}
            layer={activeLayer as LayerId}
            selectedCell={selectedCell}
            hoveredCell={hoveredCell}
            showCriticalPath={showCriticalPath}
            mostCriticalId={mostCritical?.id ?? ''}
            topCriticalIds={topCritIds}
            transitionDir={transitionDir}
            onCellDrillIn={handleDrillIn}
            onCellInspect={handleInspect}
            onCellHover={setHoveredCell}
          />

          {/* Hint footer */}
          <AnimatePresence>
            {currentLevel < 3 && (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[9px] text-slate-600 flex items-center gap-1"
              >
                <ZoomIn size={9} />
                Click any cell to drill into sub-zones with NEW data · Hover eye-icon to inspect
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {currentLevel === 3 && (
              <motion.div
                key="hint-max"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[9px] text-slate-600 flex items-center gap-1"
              >
                ⚗️ Max resolution reached · Click any cell to inspect
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Nav message — toast-style */}
        <AnimatePresence>
          {aiNavMessage && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl border border-[#2a6fdb]/40 bg-[#0a1628] text-xs text-slate-300 pointer-events-none max-w-xs text-center"
              style={{ zIndex: 60, backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Cpu size={10} className="text-[#2a6fdb]" />
                <span className="text-[9px] font-bold text-[#2a6fdb] uppercase tracking-wider">AI Navigation</span>
              </div>
              {aiNavMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* HOVER TOOLTIP — fixed, never clipped */}
        <AnimatePresence>
          {hoveredCell && !selectedCell && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 p-3 rounded-2xl border min-w-56 pointer-events-none"
              style={{
                background: 'rgba(3,13,31,0.95)',
                backdropFilter: 'blur(16px)',
                borderColor: HEALTH_COLOR[hoveredCell.healthLevel] + '44',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${HEALTH_COLOR[hoveredCell.healthLevel]}22`,
                zIndex: 50,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs" style={{ color: HEALTH_COLOR[hoveredCell.healthLevel] }}>
                  {hoveredCell.boundLabel}
                </span>
                <span className="text-[9px] text-slate-500">
                  {hoveredCell.levelLabel} · R{hoveredCell.row+1}C{hoveredCell.col+1}
                </span>
              </div>
              <div className="space-y-1">
                <MiniBar label="Moisture"  value={hoveredCell.moisture}        color="#38bdf8" />
                <MiniBar label="Soil"      value={hoveredCell.soilQuality}     color="#f59e0b" />
                <MiniBar label="Yield"     value={hoveredCell.yieldPrediction} color="#a78bfa" />
                <MiniBar label="Nitrogen"  value={hoveredCell.nitrogenLevel}   color="#06b6d4" />
              </div>
              <div className="mt-1.5 text-[9px] text-slate-500">{hoveredCell.cropStress[0]}</div>
              {currentLevel < 3 && (
                <div className="mt-1 text-[9px] text-slate-600 flex items-center gap-1">
                  <ZoomIn size={8} /> Click to drill in · Generates new sub-zones
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL: Cell detail — fixed overlay */}
        <AnimatePresence>
          {selectedCell && (
            <motion.div
              className="fixed top-0 right-0 h-full w-80 border-l border-white/[0.06] p-5 overflow-y-auto"
              style={{ background: 'rgba(3,9,20,0.93)', backdropFilter: 'blur(18px)', zIndex: 40 }}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <CellDetailPanel
                cell={selectedCell}
                onClose={handleClose}
                onDrillIn={handleDrillIn}
                onAiExplain={handleAiExplain}
                aiResponse={aiResponse}
                aiLoading={aiLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
