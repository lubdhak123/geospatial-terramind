'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Layers, MapPin, Activity, Droplets } from 'lucide-react'
import { FIELD_GRID, ndviColor } from '@/lib/fieldDataEngine'
import { detectDiseaseFromCell } from '@/lib/diseaseDetection'
import { DiseasePanelFull } from '@/components/DiseasePanel'

const RegionScene = dynamic(
  () => import('@/components/3d/RegionScene').then(m => m.RegionScene),
  { ssr: false }
)

export default function RegionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [textureUrls, setTextureUrls] = useState({
    satellite: '/textures/satellite.jpg',
    ndvi:      '/textures/ndvi.png',
    heightmap: '/textures/heightmap.png',
  })
  
  // Toggles for the 6 stacked layers
  const [activeLayers, setActiveLayers] = useState({
    surface: true, moisture: true, nutrients: true, roots: true, irrigation: true, drainage: true
  })

  const [rStr, cStr] = id.split('-')
  const row = Number(rStr)
  const col = Number(cStr)
  
  const cellData = FIELD_GRID[row]?.[col]

  // Micro-Cell specific tracking (3x3 grid)
  const [selectedMicro, setSelectedMicro] = useState<{r: number, c: number} | null>(null)

  // Procedural deterministic noise function for micro variation
  function getMicroVar(mr: number, mc: number, base: number, variance: number) {
    const seed = (row * 12.3) + (col * 45.6) + (mr * 7.8) + (mc * 9.1)
    const noise = Math.sin(seed * 43758.5453) * variance
    return base + noise
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('farm_polygon')
      if (raw) {
        const p = JSON.parse(raw)
        if (p.satellite_url) setTextureUrls({ satellite: p.satellite_url, ndvi: p.ndvi_url ?? '/textures/ndvi.png', heightmap: p.heightmap_url ?? '/textures/heightmap.png' })
      }
    } catch {}
  }, [])

  if (!cellData || isNaN(row) || isNaN(col)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#030d1a]">
        <div className="text-white">Region {id} not found.</div>
      </div>
    )
  }

  // Derived displays
  const microTitle = selectedMicro ? `Micro-Zone ${row+1}-${col+1} (${selectedMicro.r+1},${selectedMicro.c+1})` : `Zone ${row+1}-${col+1}`

  // Disease detection — recalculates when micro-cell selection changes
  const diseaseResult = useMemo(() => {
    if (!cellData) return null
    // For micro-cells apply the same procedural variation used for other metrics
    const effectiveCell = selectedMicro
      ? {
          ...cellData,
          ndvi:        getMicroVar(selectedMicro.r, selectedMicro.c, cellData.ndvi, 0.05),
          moisture:    getMicroVar(selectedMicro.r, selectedMicro.c, cellData.moisture, 0.08),
          humidity:    getMicroVar(selectedMicro.r, selectedMicro.c, cellData.humidity, 3),
          temperature: getMicroVar(selectedMicro.r, selectedMicro.c, cellData.temperature, 1),
          nitrogen:    getMicroVar(selectedMicro.r, selectedMicro.c, cellData.nitrogen, 0.15),
          potassium:   getMicroVar(selectedMicro.r, selectedMicro.c, cellData.potassium, 0.12),
        }
      : cellData
    return detectDiseaseFromCell(effectiveCell)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellData, selectedMicro])

  const displayNdvi = selectedMicro ? getMicroVar(selectedMicro.r, selectedMicro.c, cellData.ndvi, 0.05) : cellData.ndvi
  const displayMoist = selectedMicro ? getMicroVar(selectedMicro.r, selectedMicro.c, cellData.moisture, 0.08) : cellData.moisture
  const displayNitro = selectedMicro ? getMicroVar(selectedMicro.r, selectedMicro.c, cellData.nitrogen, 0.15) : cellData.nitrogen
  const displayYield = selectedMicro ? getMicroVar(selectedMicro.r, selectedMicro.c, cellData.analysis.yield_qtl_acre, 1.5) : cellData.analysis.yield_qtl_acre

  const color = ndviColor(displayNdvi)

  return (
    <main className="flex h-screen w-screen overflow-hidden text-white bg-[#030d1a]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEFT — 3D Cropped Terrain & Layers */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0">
        <RegionScene 
          row={row} 
          col={col}
          satelliteUrl={textureUrls.satellite}
          heightmapUrl={textureUrls.heightmap}
          ndviUrl={textureUrls.ndvi}
          activeLayers={activeLayers}
          selectedMicro={selectedMicro}
          onSelectMicro={setSelectedMicro}
        />

        {/* Back breadcrumb */}
        <button onClick={() => router.push('/field')}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:text-white"
          style={{ background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <ArrowLeft size={13} /> Back to Field
        </button>

        {/* Region Badge */}
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl px-4 py-2"
          style={{ background: `${color}18`, border: `1px solid ${color}40`, backdropFilter: 'blur(12px)' }}>
          <MapPin size={14} style={{ color }} />
          <span className="text-sm font-black" style={{ color }}>{microTitle}</span>
          <span className="text-[9px] font-bold text-slate-500 ml-1">DEEP ANALYSIS</span>
        </div>

        {/* Bottom Layer Toggles */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 rounded-2xl p-1.5"
          style={{ background: 'rgba(3,13,26,0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
          {[
            { id: 'surface', label: 'NDVI Surface', c: '#22c55e' },
            { id: 'moisture', label: 'Moisture', c: '#3b82f6' },
            { id: 'nutrients', label: 'Nutrients', c: '#d97706' },
            { id: 'roots', label: 'Root Zone', c: '#ea580c' },
            { id: 'irrigation', label: 'Irrigation', c: '#0ea5e9' },
            { id: 'drainage', label: 'Drainage Flow', c: '#475569' },
          ].map(l => {
            const active = activeLayers[l.id as keyof typeof activeLayers]
            return (
              <button key={l.id} 
                onClick={() => setActiveLayers(p => ({ ...p, [l.id]: !active }))}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all"
                style={{ 
                  background: active ? `${l.c}20` : 'transparent',
                  border: `1px solid ${active ? l.c + '50' : 'transparent'}`,
                  color: active ? '#fff' : '#64748b'
                }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? l.c : '#334155' }} />
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RIGHT PANEL — Detailed Analytics for Region */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 flex flex-col overflow-y-auto"
        style={{ borderLeft: `1px solid ${color}25`, background: 'rgba(3,13,26,0.97)' }}>
        
        {/* Header */}
        <div className="shrink-0 px-5 py-5" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)`, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
          <div className="text-[10px] font-black tracking-widest mb-1" style={{ color }}>
            ● MICRO-ZONE HIGHLIGHT
          </div>
          <h1 className="text-xl font-black text-white leading-tight">{microTitle} Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedMicro ? 'Focused single 3x3 subdivision metrics active.' : 'Multi-layer subsurface volumetric scanning active.'}
          </p>
        </div>

        <div className="p-5 space-y-5">
           {/* Key Metrics */}
           <div className="grid grid-cols-2 gap-3">
             <div className="rounded-xl p-3 bg-white/5 border border-white/10">
               <div className="flex items-center gap-1.5 text-green-400 mb-1">
                 <Activity size={12} /> <span className="text-[9px] font-black">NDVI MEAN</span>
               </div>
               <div className="text-lg font-black text-white">{displayNdvi.toFixed(2)}</div>
             </div>
             <div className="rounded-xl p-3 bg-white/5 border border-white/10">
               <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                 <Droplets size={12} /> <span className="text-[9px] font-black">MOISTURE</span>
               </div>
               <div className="text-lg font-black text-white">{(displayMoist * 100).toFixed(1)}%</div>
             </div>
             <div className="rounded-xl p-3 bg-white/5 border border-white/10">
               <div className="flex items-center gap-1.5 text-amber-500 mb-1">
                 <Layers size={12} /> <span className="text-[9px] font-black">NITROGEN</span>
               </div>
               <div className="text-lg font-black text-white">{displayNitro.toFixed(1)} kg</div>
             </div>
             <div className="rounded-xl p-3 bg-white/5 border border-white/10">
               <div className="flex items-center gap-1.5 text-purple-400 mb-1">
                 <MapPin size={12} /> <span className="text-[9px] font-black">ELEVATION</span>
               </div>
               <div className="text-lg font-black text-white">~45m</div>
             </div>
           </div>

           {/* Yield estimate */}
           <div className="rounded-xl p-3 bg-white/5 border border-white/10">
             <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Yield Estimate</div>
             <div className="text-sm font-black text-white">{displayYield.toFixed(1)} <span className="text-xs font-normal text-slate-500">qtl/ac</span></div>
           </div>

           {/* ── Disease Detection ── */}
           <div>
             <div className="text-[9px] font-black tracking-widest uppercase mb-3" style={{ color: diseaseResult?.riskColor ?? '#64748b' }}>
               🦠 DISEASE DETECTION
             </div>
             {diseaseResult && <DiseasePanelFull result={diseaseResult} />}
           </div>
        </div>
      </div>
    </main>
  )
}
