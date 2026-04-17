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
export type ModuleId =
  | 'disease' | 'water' | 'soil' | 'fertilizer'
  | 'yield'   | 'oracle' | 'credit' | 'advisor'

interface AIModule {
  id: ModuleId
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  layer: ActiveLayer
  status: 'critical' | 'warning' | 'good' | 'info'
  statusLabel: string
  deepPage?: string          // route to dedicated module page
  // Panel data
  headline: string
  problem: string
  dataSources: string[]
  confidence: number
  affectedZone: string
  affectedPct: number
  recommendation: string
  recommendationHi: string
  saving: string
  urgency: string
  farmerMessage: string
  farmerMessageHi: string
  metrics: { label: string; value: string; color: string }[]
}

const MODULES: AIModule[] = [
  {
    id: 'disease',
    label: 'Disease',
    shortLabel: 'DISEASE',
    icon: <Bug size={14} />,
    color: '#ef4444',
    layer: 'disease',
    status: 'critical',
    statusLabel: 'CRITICAL',
    headline: 'Blast Fungus Detected',
    problem: 'Rice blast (Magnaporthe oryzae) spores detected in SW quadrant via NDVI drop + thermal anomaly. Spore density 840/cm². High humidity 88% accelerating spread.',
    dataSources: ['Sentinel-2 B4/B8 NDVI', 'MODIS LST Thermal', 'IMD Humidity Forecast', 'YOLOv11 Leaf Scan'],
    confidence: 92,
    affectedZone: 'SW Quadrant',
    affectedPct: 18,
    recommendation: 'Apply Tricyclazole 0.6 g/L + Propiconazole 0.1% immediately. Maintain 2 cm standing water. Re-scout in 5 days.',
    recommendationHi: 'तुरंत Tricyclazole 0.6 g/L + Propiconazole 0.1% डालें। 2 सेमी खड़ा पानी बनाए रखें। 5 दिनों में फिर से निगरानी करें।',
    saving: '₹8,400',
    urgency: 'Act within 48 hours',
    farmerMessage: 'Ravi bhai, your SW field has blast fungus. Apply medicine today — it will spread to 60% of your field in 7 days if untreated.',
    farmerMessageHi: 'रवि भाई, आपके SW खेत में ब्लास्ट फंगस है। आज ही दवाई डालें — अगर नहीं डाली तो 7 दिनों में 60% खेत में फैल जाएगी।',
    metrics: [
      { label: 'Spore Density', value: '840/cm²', color: '#ef4444' },
      { label: 'Spread Risk',   value: '7 days',  color: '#f97316' },
      { label: 'Area at Risk',  value: '0.43 ac',  color: '#eab308' },
    ],
  },
  {
    id: 'water',
    label: 'Water',
    shortLabel: 'WATER',
    icon: <Droplets size={14} />,
    color: '#3b82f6',
    layer: 'soil',
    deepPage: '/field/irrigation',
    status: 'warning',
    statusLabel: 'WARNING',
    headline: 'Water Stress — NE Zone',
    problem: 'Soil moisture in NE quadrant at 28% — below 35% critical threshold for tillering stage. ET₀ = 5.2 mm/day. Deficit accumulating for 4 days.',
    dataSources: ['Sentinel-1 SAR Moisture', 'Open-Meteo ET₀', 'SMAP Soil Moisture', 'IMD Rainfall'],
    confidence: 88,
    affectedZone: 'NE Quadrant',
    affectedPct: 24,
    recommendation: 'Irrigate NE quadrant with 40mm water. Use drip-irrigation if available. Schedule next irrigation in 5 days. Avoid overwatering — puddling causes root rot.',
    recommendationHi: 'NE क्षेत्र में 40mm पानी से सिंचाई करें। अगर ड्रिप सिंचाई है तो उसका उपयोग करें। अगली सिंचाई 5 दिनों में करें।',
    saving: '₹6,200',
    urgency: 'Irrigate within 3 days',
    farmerMessage: 'Your NE corner is very dry. Crops need water now or you will lose 15% of yield in that section.',
    farmerMessageHi: 'आपके NE कोने में बहुत सूखापन है। अभी पानी दें नहीं तो उस हिस्से में 15% उपज की हानि होगी।',
    metrics: [
      { label: 'Soil Moisture', value: '28%',      color: '#3b82f6' },
      { label: 'ET₀ Deficit',   value: '4 days',   color: '#f97316' },
      { label: 'Yield Risk',    value: '−15%',      color: '#ef4444' },
    ],
  },
  {
    id: 'soil',
    label: 'Soil',
    shortLabel: 'SOIL',
    icon: <Globe size={14} />,
    color: '#f59e0b',
    layer: 'soil',
    deepPage: '/field/soil',
    status: 'warning',
    statusLabel: 'MODERATE',
    headline: 'Nitrogen Deficiency — Central',
    problem: 'Soil organic carbon 1.2% (low). Available N at 142 kg/ha — below optimal 180 kg/ha for Samba rice at heading stage. Yellowing in central strip confirms deficiency.',
    dataSources: ['Sentinel-2 Red-Edge', 'ISRO Bhuvan Soil Map', 'ICAR Soil Health Card', 'Landsat-8 B6'],
    confidence: 81,
    affectedZone: 'Central Strip',
    affectedPct: 31,
    recommendation: 'Apply 10 kg Urea/acre as top dressing within 1 week. Split application: 6 kg now + 4 kg after 10 days. Avoid broadcasting before rain.',
    recommendationHi: '1 सप्ताह के अंदर 10 किलो यूरिया/एकड़ डालें। बंटवारा: अभी 6 किलो + 10 दिन बाद 4 किलो। बारिश से पहले छिड़काव न करें।',
    saving: '₹3,800',
    urgency: 'Apply within 7 days',
    farmerMessage: 'Your central field has low nitrogen. Add urea this week before heading stage ends — after that it won\'t help.',
    farmerMessageHi: 'आपके बीच के खेत में नाइट्रोजन कम है। इस हफ्ते यूरिया डालें — हेडिंग स्टेज के बाद फायदा नहीं होगा।',
    metrics: [
      { label: 'Available N',  value: '142 kg/ha', color: '#f59e0b' },
      { label: 'Soil OC',      value: '1.2%',      color: '#f97316' },
      { label: 'pH',           value: '6.4',        color: '#22c55e' },
    ],
  },
  {
    id: 'fertilizer',
    label: 'Fertilizer',
    shortLabel: 'FERT',
    icon: <FlaskConical size={14} />,
    color: '#a78bfa',
    layer: 'ndvi',
    status: 'info',
    statusLabel: 'SCHEDULED',
    headline: 'Next Application in 6 Days',
    problem: 'NDVI trend analysis shows heading stage peak at 0.78. Panicle initiation requires P boost. K deficiency risk rising — current K at 118 kg/ha vs optimal 140 kg/ha.',
    dataSources: ['NDVI Time Series', 'Sentinel-2 Red-Edge', 'ICAR Fertilizer Schedule', 'Soil Test Results'],
    confidence: 85,
    affectedZone: 'Whole Field',
    affectedPct: 100,
    recommendation: 'DAP 15 kg/acre + MOP 10 kg/acre at panicle initiation. Foliar spray Zinc Sulfate 0.5% to prevent Khaira disease.',
    recommendationHi: 'बाल निकलने पर DAP 15 किलो/एकड़ + MOP 10 किलो/एकड़ डालें। खैरा रोग से बचाव के लिए 0.5% जिंक सल्फेट का पर्णीय छिड़काव करें।',
    saving: '₹5,100',
    urgency: 'Schedule in 6 days',
    farmerMessage: 'Time to plan next fertilizer. Add DAP and MOP at panicle stage for maximum grain filling.',
    farmerMessageHi: 'अगले खाद की योजना बनाएं। अधिकतम दाने भरने के लिए बाल निकलने पर DAP और MOP डालें।',
    metrics: [
      { label: 'Available K',  value: '118 kg/ha', color: '#a78bfa' },
      { label: 'NDVI Now',     value: '0.78',       color: '#22c55e' },
      { label: 'Next Stage',   value: '6 days',     color: '#3b82f6' },
    ],
  },
  {
    id: 'yield',
    label: 'Yield',
    shortLabel: 'YIELD',
    icon: <TrendingUp size={14} />,
    color: '#22c55e',
    layer: 'yield',
    status: 'good',
    statusLabel: 'ON TRACK',
    headline: 'Predicted: 48 qtl/acre',
    problem: 'XGBoost model trained on 12,000 Tamil Nadu farms. Current NDVI trajectory, tiller count 380/m², and weather forecast suggest above-average season.',
    dataSources: ['XGBoost Yield Model', 'NDVI Time Series', 'IMD Seasonal Forecast', 'TNAU Benchmark Data'],
    confidence: 79,
    affectedZone: 'All Zones',
    affectedPct: 100,
    recommendation: 'Maintain current irrigation schedule. Apply final potassium dose at milky stage. Ensure bird scarers active during grain filling period.',
    recommendationHi: 'वर्तमान सिंचाई कार्यक्रम बनाए रखें। दूधिया अवस्था में अंतिम पोटेशियम डालें। दाने भरने के दौरान चिड़िया भगाने वाले यंत्र सक्रिय रखें।',
    saving: '₹12,000',
    urgency: 'Harvest in ~45 days',
    farmerMessage: 'Good news! Your field is predicted to yield 48 qtl/acre — 8% above district average. Current crop looks healthy.',
    farmerMessageHi: 'खुशखबरी! आपके खेत में 48 क्विंटल/एकड़ उपज का अनुमान है — जिला औसत से 8% अधिक। वर्तमान फसल स्वस्थ दिख रही है।',
    metrics: [
      { label: 'Predicted',    value: '48 qtl/ac',  color: '#22c55e' },
      { label: 'vs District',  value: '+8%',         color: '#22c55e' },
      { label: 'Income Est.',  value: '₹1.15L',      color: '#a78bfa' },
    ],
  },
  {
    id: 'oracle',
    label: 'Oracle',
    shortLabel: 'ORACLE',
    icon: <Zap size={14} />,
    color: '#f59e0b',
    layer: 'ndvi',
    status: 'info',
    statusLabel: 'SCANNING',
    headline: 'Harvest Window: Oct 18–24',
    problem: 'Harvest Oracle scanned 847 farms within 50 km. Mandi prices trending ₹2,480/qtl (+3.2%). Storage facility at Papanasam has 40% capacity. Optimal window identified.',
    dataSources: ['847 Farm Scan Radius', 'AGMARKNET Mandi API', 'Dept. of Agriculture TN', 'IMD Harvest Forecast'],
    confidence: 74,
    affectedZone: '50 km Radius',
    affectedPct: 100,
    recommendation: 'Harvest Oct 18–24 when moisture content drops to 22–24%. Avoid Oct 25 — northeast monsoon onset predicted. Contact Papanasam Cold Storage now.',
    recommendationHi: 'अक्टूबर 18-24 को काटें जब नमी 22-24% हो। 25 अक्टूबर से बचें — पूर्वोत्तर मानसून की शुरुआत का अनुमान है। अभी पापनासम कोल्ड स्टोरेज से संपर्क करें।',
    saving: '₹18,500',
    urgency: 'Book mandi slot now',
    farmerMessage: 'Harvest between Oct 18-24 for best price. Delay risks monsoon damage and lower mandi rates. 847 farms surveyed for this prediction.',
    farmerMessageHi: 'सबसे अच्छी कीमत के लिए 18-24 अक्टूबर के बीच काटें। देरी से मानसून नुकसान और कम मंडी दर का खतरा है।',
    metrics: [
      { label: 'Mandi Price',  value: '₹2,480/q',   color: '#22c55e' },
      { label: 'Best Window',  value: 'Oct 18–24',   color: '#f59e0b' },
      { label: 'Farms Scanned',value: '847',          color: '#3b82f6' },
    ],
  },
  {
    id: 'credit',
    label: 'Credit',
    shortLabel: 'CREDIT',
    icon: <CreditCard size={14} />,
    color: '#ec4899',
    layer: 'satellite',
    status: 'good',
    statusLabel: 'ELIGIBLE',
    headline: 'Credit Score: 742 / 900',
    problem: 'Satellite-verified crop health, consistent NDVI history (3 seasons), and soil quality score qualify this field for KCC (Kisan Credit Card) and PM-Kisan enhanced tier.',
    dataSources: ['3-Season NDVI History', 'Sentinel-2 Verification', 'PM-Kisan Database', 'NABARD Credit Model'],
    confidence: 88,
    affectedZone: 'Full Farm',
    affectedPct: 100,
    recommendation: 'Apply for KCC crop loan up to ₹1.2L at 4% interest. PM-Kisan Samman Nidhi next installment ₹2,000 due Nov 1. PMFBY insurance premium ₹640 — deadline Oct 31.',
    recommendationHi: 'KCC फसल ऋण के लिए आवेदन करें — ₹1.2L तक 4% ब्याज पर। PM-Kisan अगली किस्त ₹2,000 — 1 नवंबर। PMFBY बीमा प्रीमियम ₹640 — अंतिम तिथि 31 अक्टूबर।',
    saving: '₹24,000',
    urgency: 'Apply before Oct 31',
    farmerMessage: 'Your farm qualifies for ₹1.2L KCC loan at just 4% interest. This satellite report is accepted by SBI and Indian Bank branches in Thanjavur.',
    farmerMessageHi: 'आपका खेत सिर्फ 4% ब्याज पर ₹1.2L KCC ऋण के लिए योग्य है। यह सैटेलाइट रिपोर्ट थंजावुर में SBI और इंडियन बैंक शाखाओं द्वारा स्वीकार की जाती है।',
    metrics: [
      { label: 'Credit Score',  value: '742/900',    color: '#ec4899' },
      { label: 'Loan Eligible', value: '₹1.2L',      color: '#22c55e' },
      { label: 'Interest Rate', value: '4% p.a.',    color: '#3b82f6' },
    ],
  },
  {
    id: 'advisor',
    label: 'Advisor',
    shortLabel: 'AI',
    icon: <Cpu size={14} />,
    color: '#06b6d4',
    layer: 'satellite',
    status: 'info',
    statusLabel: 'ACTIVE',
    headline: 'Top 3 Actions This Week',
    problem: 'Gemini 1.5 Flash synthesizing all 7 data streams: disease risk, water stress, soil deficiency, upcoming harvest window, and credit opportunity all converging.',
    dataSources: ['All 7 AI Modules', 'Gemini 1.5 Flash', 'ICAR Knowledge Base', '12,000-Farm Dataset'],
    confidence: 91,
    affectedZone: 'Full Farm',
    affectedPct: 100,
    recommendation: '① Blast fungicide today (₹8,400 risk). ② Irrigate NE tomorrow (₹6,200 risk). ③ Apply urea within 7 days (₹3,800 risk). Total preventable loss: ₹18,400.',
    recommendationHi: '① आज ब्लास्ट दवाई (₹8,400 जोखिम)। ② कल NE में सिंचाई (₹6,200 जोखिम)। ③ 7 दिनों में यूरिया (₹3,800 जोखिम)। कुल रोकने योग्य नुकसान: ₹18,400।',
    saving: '₹18,400',
    urgency: 'Priority actions this week',
    farmerMessage: 'TerraMind has analyzed every inch of your field. Act on 3 things this week to protect ₹18,400 in potential losses.',
    farmerMessageHi: 'TerraMind ने आपके खेत के हर कोने का विश्लेषण किया है। ₹18,400 के संभावित नुकसान से बचाने के लिए इस सप्ताह 3 काम करें।',
    metrics: [
      { label: 'Actions',      value: '3 urgent',   color: '#ef4444' },
      { label: 'Risk Avoided', value: '₹18,400',    color: '#22c55e' },
      { label: 'AI Accuracy',  value: '91%',         color: '#06b6d4' },
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
// MODULE CARD (strip at bottom)
// ════════════════════════════════════════════════════════════════════════
function ModuleCard({ mod, active, onClick }: { mod: AIModule; active: boolean; onClick: () => void }) {
  const sc = STATUS_COLORS[mod.status]
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl px-4 py-3 shrink-0 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
      style={active
        ? { background: `${mod.color}18`, border: `1.5px solid ${mod.color}60`, boxShadow: `0 0 20px ${mod.color}25` }
        : { background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.07)' }
      }>
      {/* Icon */}
      <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
        style={active
          ? { background: `${mod.color}25`, color: mod.color, boxShadow: `0 0 12px ${mod.color}40` }
          : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
        }>
        {mod.icon}
      </div>
      {/* Label */}
      <span className="text-[10px] font-bold tracking-wider transition-colors"
        style={{ color: active ? mod.color : '#475569' }}>
        {mod.shortLabel}
      </span>
      {/* Status dot */}
      <div className="h-1.5 w-1.5 rounded-full transition-all"
        style={{ background: active ? sc : '#1e3a5f', boxShadow: active ? `0 0 6px ${sc}` : 'none' }} />
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════
// DEEP DIVE BUTTON — navigates to module-specific full page
// ════════════════════════════════════════════════════════════════════════
function DeepDiveButton({ mod }: { mod: AIModule }) {
  const router = useRouter()
  const quadrantId = MODULE_QUADRANT_MAP[mod.id]
  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Quadrant deep-dive if this module maps to a specific field zone */}
      {quadrantId && (
        <button
          onClick={() => router.push(`/field/quadrant/${quadrantId.toLowerCase()}`)}
          className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-black tracking-widest transition-all hover:scale-[1.02] active:scale-100"
          style={{
            background: `linear-gradient(135deg, ${mod.color}22, ${mod.color}0a)`,
            border: `1px solid ${mod.color}60`,
            color: mod.color,
            boxShadow: `0 0 20px ${mod.color}18`,
          }}>
          <span className="flex items-center gap-2">
            <span className="text-[11px]">🗺</span>
            OPEN {quadrantId} QUADRANT
          </span>
          <span className="flex items-center gap-1 opacity-80">
            Full View <ChevronRight size={11} />
          </span>
        </button>
      )}
      {/* Module-specific deep page (irrigation / soil) */}
      {mod.deepPage && (
        <button
          onClick={() => router.push(mod.deepPage!)}
          className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-black tracking-widest transition-all hover:scale-[1.02] active:scale-100"
          style={{
            background: `linear-gradient(135deg, ${mod.color}12, ${mod.color}06)`,
            border: `1px solid ${mod.color}40`,
            color: mod.color,
          }}>
          <span className="flex items-center gap-2">
            <span className="text-[10px]">🛰</span>
            DEEP ANALYSIS
          </span>
          <span className="flex items-center gap-1 opacity-80">
            Full Report <ChevronRight size={11} />
          </span>
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// MODULE INSIGHT PANEL (right side)
// ════════════════════════════════════════════════════════════════════════
function InsightPanel({
  mod,
  onClose,
}: {
  mod: AIModule
  onClose: () => void
}) {
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [speaking, setSpeaking] = useState(false)
  const sc = STATUS_COLORS[mod.status]

  const speak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const utt = new SpeechSynthesisUtterance()
    utt.text  = lang === 'hi' ? mod.farmerMessageHi : mod.farmerMessage
    utt.lang  = lang === 'hi' ? 'hi-IN' : 'en-IN'
    utt.rate  = 0.88
    utt.onend = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
    setSpeaking(true)
  }

  // Stop speech on unmount
  useEffect(() => () => { window.speechSynthesis.cancel() }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl"
      style={{ background: 'rgba(3,13,26,0.92)', border: `1px solid ${mod.color}30`, backdropFilter: 'blur(20px)', boxShadow: `0 0 40px ${mod.color}15` }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between p-4 shrink-0"
        style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${mod.color}20`, color: mod.color, boxShadow: `0 0 14px ${mod.color}35` }}>
            {mod.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black tracking-[0.15em]" style={{ color: sc }}>
                ● {mod.statusLabel}
              </span>
              <span className="text-[9px] text-slate-600 font-mono">{mod.urgency}</span>
            </div>
            <h3 className="text-sm font-black text-white leading-tight">{mod.headline}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{mod.label} Intelligence Module</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* EN/HI toggle */}
          {(['en','hi'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="rounded-md px-2 py-1 text-[9px] font-black transition-all"
              style={lang === l
                ? { background: `${mod.color}25`, color: mod.color, border: `1px solid ${mod.color}50` }
                : { background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }
              }>
              {l === 'en' ? 'EN' : 'हिं'}
            </button>
          ))}
          {/* Voice */}
          <button onClick={speak}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
            style={{ background: speaking ? `${mod.color}25` : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: speaking ? mod.color : '#475569' }}>
            <span className="text-xs">{speaking ? '⏹' : '🔊'}</span>
          </button>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>

        {/* Farmer message pill */}
        <div className="rounded-xl p-3" style={{ background: `${mod.color}0c`, border: `1px solid ${mod.color}20` }}>
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">🤖</span>
            <p className="text-xs leading-relaxed" style={{ color: mod.color === '#06b6d4' ? '#67e8f9' : '#cbd5e1' }}>
              <span className="font-bold" style={{ color: mod.color }}>AI: </span>
              {lang === 'hi' ? mod.farmerMessageHi : mod.farmerMessage}
            </p>
          </div>
        </div>

        {/* Confidence + Zone */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1.5">AI Confidence</div>
            <ConfidenceBar value={mod.confidence} color={mod.color} />
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Affected Zone</div>
            <div className="text-xs font-bold text-white">{mod.affectedZone}</div>
            <div className="text-[10px] font-mono mt-0.5" style={{ color: mod.color }}>{mod.affectedPct}% of field</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {mod.metrics.map(m => (
            <div key={m.label} className="rounded-xl p-2.5 text-center" style={{ background: `${m.color}0a`, border: `1px solid ${m.color}20` }}>
              <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">{m.label}</div>
              <div className="text-xs font-black" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Problem */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">Analysis</div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{mod.problem}</p>
        </div>

        {/* Recommendation */}
        <div className="rounded-xl p-3" style={{ background: `${mod.color}08`, border: `1px solid ${mod.color}25` }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: mod.color }}>
            ⚡ Recommendation
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {lang === 'hi' ? mod.recommendationHi : mod.recommendation}
          </p>
        </div>

        {/* Data sources */}
        <div>
          <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-2">Data Sources</div>
          <div className="flex flex-wrap gap-1.5">
            {mod.dataSources.map(src => (
              <span key={src}
                className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                {src}
              </span>
            ))}
          </div>
        </div>

        {/* Saving CTA */}
        <div className="rounded-xl p-3 flex items-center justify-between mt-auto"
          style={{ background: '#22c55e0c', border: '1px solid #22c55e25' }}>
          <div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold">Expected Saving</div>
            <div className="text-base font-black text-emerald-400 mt-0.5" style={{ textShadow: '0 0 12px #22c55e60' }}>
              {mod.saving}
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg,${mod.color},${mod.color}bb)`, boxShadow: `0 4px 14px ${mod.color}40` }}>
            Act Now <ChevronRight size={12} />
          </button>
        </div>

        {/* Deep Dive CTA — only for modules with dedicated pages */}
        {mod.deepPage && (
          <DeepDiveButton mod={mod} />
        )}
      </div>
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

  const [activeModule, setActiveModule]       = useState<AIModule>(MODULES[7]) // advisor default
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

  const compareRef  = useRef<HTMLDivElement>(null)
  const cropMonth   = MONTHS[monthIdx]
  const currentNDVI = MONTH_NDVI[cropMonth]
  // isLive = true if real Sentinel imagery loaded OR real pipeline ran
  const isLive      = sentinelData?.is_live || pipelineResult?.is_live

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
    setSelectedQuadrant(null) // clear any previous quadrant highlight
  }

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
        const rec = m.recommendation.substring(0,110)
        pdf.text(rec,18,y+9)
        pdf.setTextColor(34,197,94); pdf.setFont('helvetica','bold'); pdf.setFontSize(8)
        pdf.text(`Saving: ${m.saving}`,18,y+16)
        pdf.text(`Confidence: ${m.confidence}%`,70,y+16)
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
        style={{ background:'rgba(3,13,26,0.95)', borderBottom:'1px solid rgba(42,111,219,0.18)', backdropFilter:'blur(20px)', minHeight: 48 }}>

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
          <div className={`h-1.5 w-1.5 rounded-full ${sentinelLoading ? 'bg-amber-400 animate-pulse' : isLive ? 'bg-emerald-400' : 'bg-slate-600'}`} style={isLive ? { boxShadow:'0 0 5px #22c55e' } : {}} />
          <span className="font-mono text-[9px] text-slate-400">
            {sentinelLoading ? 'SCANNING…' : pipelineResult?.is_live ? `LIVE·${pipelineResult.capture_date}·${realGrid?.[0]?.length ?? 0}×${realGrid?.length ?? 0}` : isLive ? `SAT·${sentinelData?.capture_date}` : 'DEMO'}
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
                    // Navigate to dedicated full-screen quadrant page
                    router.push(`/field/quadrant/${id.toLowerCase()}`)
                  } else {
                    setSelectedQuadrant(null)
                    setPanelOpen(true)
                  }
                }}
                showIrrigation={showIrrigation}
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
            <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
              style={{ background:`${activeModule.color}12`, border:`1px solid ${activeModule.color}35`, color:activeModule.color, backdropFilter:'blur(12px)', boxShadow:`0 0 16px ${activeModule.color}12` }}>
              {activeModule.icon}
              {activeModule.label.toUpperCase()} · {activeLayer.toUpperCase()} VIEW
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
          <div className="hidden lg:flex shrink-0 flex-col w-[320px]"
            style={{ borderLeft:'1px solid rgba(42,111,219,0.15)', background:'rgba(3,13,26,0.6)', backdropFilter:'blur(20px)' }}>

            {/* Health summary strip */}
            <div className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <HealthRing score={liveHealth} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Field Health</div>
                <div className="text-sm font-black text-white">{liveHealth}<span className="text-slate-600 text-xs font-normal">/100</span></div>
                <div className="text-[10px] text-slate-500 truncate">{MOCK_FARM.crop} · {displayArea}</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {MODULES.filter(m => m.status !== 'info' && m.status !== 'good').slice(0,2).map(m => (
                  <div key={m.id} className="flex items-center gap-1 rounded-lg px-2 py-0.5"
                    style={{ background:`${STATUS_COLORS[m.status]}15`, border:`1px solid ${STATUS_COLORS[m.status]}30` }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background:STATUS_COLORS[m.status] }} />
                    <span className="text-[9px] font-bold" style={{ color:STATUS_COLORS[m.status] }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* InsightPanel fills remaining height */}
            <div className="flex-1 min-h-0 p-3">
              <InsightPanel mod={activeModule} onClose={() => setPanelOpen(false)} />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODULE STRIP + BOTTOM DASHBOARD
      ══════════════════════════════════════════════════ */}
      <footer className="relative z-30 shrink-0 flex flex-col"
        style={{ background:'rgba(3,13,26,0.97)', borderTop:'1px solid rgba(42,111,219,0.18)', backdropFilter:'blur(20px)' }}>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg,transparent,#2a6fdb40 50%,transparent)' }} />

        {/* ── Module strip ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 pt-2.5 pb-0 scrollbar-hide">
          {MODULES.map(mod => (
            <ModuleCard key={mod.id} mod={mod} active={activeModule.id === mod.id} onClick={() => selectModule(mod)} />
          ))}

          {/* Spacer push right */}
          <div className="flex-1" />

          {/* PDF */}
          <button onClick={generatePDF} disabled={pdfLoading}
            className="flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{ background:'linear-gradient(135deg,#2a6fdb,#1a3f8a)', boxShadow:'0 4px 20px #2a6fdb35, inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            {pdfLoading
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating…</>
              : <><FileText size={14} />Get AI Report<ChevronRight size={13} /></>
            }
          </button>
        </div>

        {/* ── Stats bar ── */}
        <div className="flex items-center divide-x divide-white/[0.04] overflow-x-auto scrollbar-hide px-2 pb-2 pt-1.5">

          {/* Health */}
          <div className="flex items-center gap-2 px-3 shrink-0">
            <HealthRing score={liveHealth} />
            <div>
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Health</div>
              <div className="text-sm font-black text-white">{MOCK_FARM.health_score}/100</div>
            </div>
          </div>

          {/* NDVI */}
          <div className="flex flex-col justify-center px-4 shrink-0 min-w-[140px]">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">NDVI · {cropMonth}</span>
              <span className="font-mono text-[10px] font-bold" style={{ color: liveNdvi > 0.6 ? '#22c55e' : liveNdvi > 0.4 ? '#eab308' : '#ef4444' }}>{liveNdvi.toFixed(2)}</span>
            </div>
            <div className="relative h-1.5 rounded-full overflow-hidden bg-white/5">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width:`${liveNdvi*100}%`, background:'linear-gradient(90deg,#ef4444 0%,#eab308 40%,#22c55e 100%)' }} />
            </div>
          </div>

          {/* Crop timeline */}
          <div className="flex flex-col justify-center px-4 shrink-0 min-w-[200px]">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Crop Timeline</span>
              <span className="font-mono text-[9px] text-blue-400 font-bold">{cropMonth} · {CROP_STAGES[cropMonth]?.label?.split('—')[0].trim()}</span>
            </div>
            <div className="flex justify-between mb-1">
              {MONTHS.map((m,i) => (
                <button key={m} onClick={() => setMonthIdx(i)} className="text-[8px] font-bold transition-all hover:scale-110"
                  style={{ color: i===monthIdx ? '#3b82f6' : '#1e3a5f' }}>{m}</button>
              ))}
            </div>
            <input type="range" min={0} max={MONTHS.length-1} step={1} value={monthIdx}
              onChange={e => setMonthIdx(Number(e.target.value))}
              className="w-full h-1 appearance-none rounded-full outline-none tm-slider"
              style={{ background:`linear-gradient(to right,#2a6fdb ${(monthIdx/(MONTHS.length-1))*100}%,#0d2540 ${(monthIdx/(MONTHS.length-1))*100}%)`, cursor:'pointer' }}
            />
          </div>

          {/* Quick stats — real pipeline values when available */}
          {[
            { label:'Disease', value:MOCK_FARM.disease_risk, color: MOCK_FARM.disease_risk==='Low'?'#22c55e':MOCK_FARM.disease_risk==='Medium'?'#eab308':'#ef4444' },
            { label:'Moisture',value:liveMoisture,           color:'#3b82f6'  },
            { label:'Yield Est',value:liveYield,             color:'#a78bfa'  },
            { label:'Income',   value:`₹${YIELD_INCOME}L`,   color:'#22c55e'  },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center px-3 shrink-0">
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{s.label}</div>
              <div className="text-xs font-black mt-0.5" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
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
