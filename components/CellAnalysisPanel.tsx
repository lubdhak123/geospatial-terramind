'use client'

/**
 * CellAnalysisPanel.tsx
 * Slide-in panel that shows live fieldDataEngine analysis for the
 * currently selected grid cell.  Reads from useFieldStore.
 *
 * Mount it anywhere outside the Canvas (it's a plain HTML overlay).
 */

import { useFieldStore, RISK_COLOR, HEALTH_COLOR, type AnalyzedCell } from '@/lib/fieldDataEngine'
import { getCropRecommendations, explainRecommendation, cellToRegionData, CROPS } from '@/lib/cropRecommendation'

// ── Tiny helpers ─────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: `${color}20`, border: `1px solid ${color}50`,
      borderRadius: 4, padding: '1px 6px',
      color, fontSize: 8, fontWeight: 900, letterSpacing: '0.08em',
    }}>
      {label.toUpperCase()}
    </span>
  )
}

function Row({ label, value, color = '#94a3b8' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#475569', fontSize: 9, fontWeight: 700 }}>{label}</span>
      <span style={{ color, fontSize: 9, fontWeight: 900 }}>{value}</span>
    </div>
  )
}

function Section({ title, color = '#38bdf8', children }: {
  title: string; color?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}20`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
    }}>
      <div style={{ color, fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────

function PanelContent({ cell }: { cell: AnalyzedCell }) {
  const a = cell.analysis
  const healthColor = HEALTH_COLOR[a.health_status]
  const riskColor   = RISK_COLOR[a.overall_risk]

  return (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 120px)', paddingRight: 2 }}>

      {/* ── Header ── */}
      <div style={{
        background: `${healthColor}14`,
        border: `1px solid ${healthColor}40`,
        borderRadius: 10, padding: '10px 12px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: healthColor, boxShadow: `0 0 8px ${healthColor}`,
          }} />
          <span style={{ color: healthColor, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
            {cell.id.toUpperCase()} — {a.health_status.toUpperCase()}
          </span>
          <div style={{ flex: 1 }} />
          <Badge label={`Risk: ${a.overall_risk}`} color={riskColor} />
        </div>

        {a.action_required && (
          <div style={{
            background: `${riskColor}18`, border: `1px solid ${riskColor}50`,
            borderRadius: 6, padding: '5px 8px',
            color: riskColor, fontSize: 9, fontWeight: 800, lineHeight: 1.5,
          }}>
            ⚡ {a.primary_alert}
          </div>
        )}
        {!a.action_required && (
          <div style={{ color: '#22c55e', fontSize: 9, fontWeight: 700 }}>
            ✓ {a.primary_alert}
          </div>
        )}
      </div>

      {/* ── Satellite indices ── */}
      <Section title="📡 SENTINEL DATA" color="#38bdf8">
        <Row label="NDVI (Sentinel-2)"      value={cell.ndvi.toFixed(3)}     color="#22c55e" />
        <Row label="EVI"                    value={cell.evi.toFixed(3)}      color="#84cc16" />
        <Row label="SAVI"                   value={cell.savi.toFixed(3)}     color="#a78bfa" />
        <Row label="Chlorophyll Index"      value={cell.chlorophyll.toFixed(3)} color="#22c55e" />
        <Row label="Soil Moisture (SAR)"    value={`${Math.round(cell.moisture * 100)}%`} color="#38bdf8" />
        <Row label="Temperature"            value={`${cell.temperature}°C`}  color="#f97316" />
        <Row label="Humidity"               value={`${cell.humidity}%`}      color="#60a5fa" />
      </Section>

      {/* ── Soil chemistry ── */}
      <Section title="🌍 SOILGRIDS DATA" color="#f59e0b">
        <Row label="pH"                     value={String(cell.ph)}          color={cell.ph < 5.8 || cell.ph > 7.5 ? '#ef4444' : '#22c55e'} />
        <Row label="Soil Organic Carbon"    value={`${cell.soc_pct}%`}       color={cell.soc_pct < 1.0 ? '#ef4444' : '#22c55e'} />
        <Row label="Nitrogen (N)"           value={`${cell.nitrogen} kg/ha`} color={RISK_COLOR[a.nitrogen_status === 'deficient' || a.nitrogen_status === 'low' ? 'high' : 'none']} />
        <Row label="Phosphorus (P)"         value={`${cell.phosphorus} kg/ha`} color="#f59e0b" />
        <Row label="Potassium (K)"          value={`${cell.potassium} kg/ha`}  color="#a78bfa" />
        <Row label="Soil Texture"           value={cell.soil_texture}          color="#94a3b8" />
        <Row label="Bulk Density"           value={`${cell.bulk_density} g/cm³`} color={cell.bulk_density > 1.5 ? '#f97316' : '#94a3b8'} />
      </Section>

      {/* ── 7-problem analysis ── */}

      {/* 1. Irrigation */}
      <Section title="💧 IRRIGATION ANALYSIS" color="#38bdf8">
        <Row label="Status"         value={a.irrigation_needed ? 'DEFICIT' : 'ADEQUATE'} color={a.irrigation_needed ? '#ef4444' : '#22c55e'} />
        <Row label="Urgency"        value={a.irrigation_urgency.toUpperCase()} color={a.irrigation_urgency === 'immediate' ? '#ef4444' : a.irrigation_urgency === 'soon' ? '#f97316' : '#22c55e'} />
        <Row label="Deficit"        value={`${a.irrigation_deficit_mm} mm`}   color="#38bdf8" />
        <Row label="Moisture"       value={`${Math.round(cell.moisture * 100)}%`} color="#38bdf8" />
      </Section>

      {/* 2. Fertilizer */}
      <Section title="🧪 FERTILIZER STATUS" color="#a78bfa">
        <Row label="Nitrogen"       value={a.nitrogen_status.toUpperCase()}   color={a.nitrogen_status === 'deficient' ? '#ef4444' : a.nitrogen_status === 'low' ? '#f97316' : '#22c55e'} />
        <Row label="Phosphorus"     value={a.phosphorus_status.toUpperCase()} color={a.phosphorus_status === 'deficient' ? '#ef4444' : '#22c55e'} />
        <Row label="Potassium"      value={a.potassium_status.toUpperCase()}  color={a.potassium_status === 'deficient' ? '#ef4444' : '#22c55e'} />
        <Row label="Priority"       value={a.fertilizer_priority.toUpperCase()} color={RISK_COLOR[a.fertilizer_priority]} />
        {a.recommended_inputs.slice(0, 3).map((inp, i) => (
          <div key={i} style={{ color: '#a78bfa', fontSize: 8, fontWeight: 700 }}>→ {inp}</div>
        ))}
      </Section>

      {/* 3. Disease */}
      <Section title="🦠 DISEASE RISK" color={RISK_COLOR[a.disease_risk]}>
        <Row label="Risk Level"     value={a.disease_risk.toUpperCase()}  color={RISK_COLOR[a.disease_risk]} />
        <Row label="Type"           value={a.disease_type}                color={a.disease_risk !== 'none' ? '#ef4444' : '#22c55e'} />
        {a.disease_drivers.slice(0, 2).map((d, i) => (
          <div key={i} style={{ color: '#94a3b8', fontSize: 7, lineHeight: 1.4 }}>⚠ {d}</div>
        ))}
      </Section>

      {/* 4. Land degradation */}
      <Section title="⚠ LAND DEGRADATION" color={RISK_COLOR[a.degradation_risk]}>
        <Row label="Degradation"    value={a.degradation_risk.toUpperCase()} color={RISK_COLOR[a.degradation_risk]} />
        <Row label="Type"           value={a.degradation_type}               color="#94a3b8" />
        <Row label="Erosion Risk"   value={a.erosion_risk.toUpperCase()}      color={RISK_COLOR[a.erosion_risk]} />
      </Section>

      {/* 5. Crop suitability */}
      <Section title="🌾 CROP SUITABILITY" color="#22c55e">
        <Row label="Suitability"    value={a.crop_suitability.toUpperCase()} color={a.crop_suitability === 'optimal' ? '#22c55e' : a.crop_suitability === 'suitable' ? '#84cc16' : '#f59e0b'} />
        {a.limiting_factors.map((f, i) => (
          <div key={i} style={{ color: '#f59e0b', fontSize: 7 }}>• {f}</div>
        ))}
      </Section>

      {/* 6. Yield estimate */}
      <Section title="📈 YIELD ESTIMATE" color="#22c55e">
        <Row label="Predicted Yield"  value={`${a.yield_qtl_acre} qtl/acre`} color="#22c55e" />
        <Row label="% of Max Yield"   value={`${a.yield_pct_of_max}%`}        color="#22c55e" />
        <Row label="Trend"            value={a.yield_trend.toUpperCase()}      color={a.yield_trend === 'improving' ? '#22c55e' : a.yield_trend === 'degrading' ? '#ef4444' : '#f59e0b'} />
      </Section>

      {/* 7. Stressors */}
      <Section title="🚨 ACTIVE STRESSORS" color="#ef4444">
        {a.stressors.map((s, i) => (
          <div key={i} style={{ color: i === 0 && a.stressors[0] !== 'No active stressors' ? '#ef4444' : '#94a3b8', fontSize: 8, fontWeight: 700 }}>
            {s === 'No active stressors' ? '✓' : '•'} {s}
          </div>
        ))}
      </Section>

      {/* 8. Crop Recommendations */}
      <CropRecommendationsSection cell={cell} />

    </div>
  )
}

// ── Crop Recommendations ──────────────────────────────────────────────────────

function CropRecommendationsSection({ cell }: { cell: AnalyzedCell }) {
  const regionData = cellToRegionData(cell)
  const recs       = getCropRecommendations(regionData).slice(0, 5)
  const top        = recs[0]
  const topCropDef = CROPS.find(c => c.name === top.name)
  const reason     = topCropDef ? explainRecommendation(topCropDef, regionData) : ''

  const scoreColor = (score: number) =>
    score >= 60 ? '#22c55e' : score >= 35 ? '#f59e0b' : '#ef4444'

  const scoreBar = (score: number) => {
    const pct  = Math.max(0, Math.min(100, score))
    const col  = scoreColor(score)
    return (
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2 }} />
      </div>
    )
  }

  return (
    <div style={{
      background: '#22c55e08', border: '1px solid #22c55e20',
      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
    }}>
      {/* Section header */}
      <div style={{ color: '#22c55e', fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 7 }}>
        🌾 CROP RECOMMENDATIONS
      </div>

      {/* Top recommendation hero */}
      <div style={{
        background: '#22c55e14', border: '1px solid #22c55e35',
        borderRadius: 6, padding: '6px 8px', marginBottom: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 14 }}>{top.emoji}</span>
          <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 900 }}>{top.name}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#22c55e', fontSize: 8, fontWeight: 900 }}>
            {Math.max(0, top.score)}pt
          </span>
        </div>
        {/* Reasoning */}
        <div style={{ color: '#94a3b8', fontSize: 7, lineHeight: 1.55, marginBottom: top.warning ? 4 : 0 }}>
          {reason}
        </div>
        {top.warning && (
          <div style={{
            background: '#f97316 18', border: '1px solid #f9731640',
            borderRadius: 4, padding: '3px 6px',
            color: '#f97316', fontSize: 7, fontWeight: 800, lineHeight: 1.4,
          }}>
            ⚠ {top.warning}
          </div>
        )}
      </div>

      {/* Alternatives */}
      <div style={{ color: '#475569', fontSize: 7, fontWeight: 900, letterSpacing: '0.1em', marginBottom: 4 }}>
        ALTERNATIVES
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {recs.slice(1).map(r => (
          <div key={r.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <span style={{ fontSize: 10 }}>{r.emoji}</span>
              <span style={{ color: '#94a3b8', fontSize: 8, fontWeight: 700, flex: 1 }}>{r.name}</span>
              <span style={{ color: scoreColor(r.score), fontSize: 7, fontWeight: 900 }}>
                {Math.max(0, r.score)}pt
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 18 }}>
              {scoreBar(r.score)}
            </div>
            {r.warning && (
              <div style={{ color: '#f97316', fontSize: 7, paddingLeft: 18, marginTop: 1 }}>
                ⚠ {r.warning}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────

export default function CellAnalysisPanel() {
  const { selectedCell, panelOpen, setPanelOpen, setSelectedCell, activeLayer, setActiveLayer } = useFieldStore()

  if (!panelOpen || !selectedCell) return null

  const LAYERS: { id: typeof activeLayer; label: string; color: string }[] = [
    { id: 'ndvi',        label: 'NDVI',   color: '#22c55e' },
    { id: 'moisture',    label: 'H₂O',    color: '#38bdf8' },
    { id: 'disease',     label: 'Disease',color: '#ef4444' },
    { id: 'nitrogen',    label: 'N/P/K',  color: '#f59e0b' },
    { id: 'yield',       label: 'Yield',  color: '#a78bfa' },
    { id: 'degradation', label: 'Degrad', color: '#f97316' },
    { id: 'suitability', label: 'Suit.',  color: '#84cc16' },
  ]

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 16,
      width: 240,
      zIndex: 30,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(3,13,26,0.95)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: '10px 10px 0 0',
        padding: '7px 10px',
        backdropFilter: 'blur(16px)',
      }}>
        <span style={{ color: '#38bdf8', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', flex: 1 }}>
          📊 CELL ANALYSIS
        </span>
        <span style={{ color: '#475569', fontSize: 8 }}>
          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={() => { setSelectedCell(null); setPanelOpen(false) }}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>

      {/* Layer switcher */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 3,
        background: 'rgba(3,13,26,0.92)',
        borderLeft: '1px solid rgba(56,189,248,0.2)',
        borderRight: '1px solid rgba(56,189,248,0.2)',
        padding: '5px 8px',
      }}>
        {LAYERS.map(l => (
          <button key={l.id} onClick={() => setActiveLayer(l.id)} style={{
            background: activeLayer === l.id ? `${l.color}22` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${activeLayer === l.id ? l.color + '60' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 4, padding: '2px 6px',
            color: activeLayer === l.id ? l.color : '#475569',
            fontSize: 7, fontWeight: 900, cursor: 'pointer',
            transition: 'all 0.12s',
          }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div style={{
        background: 'rgba(3,13,26,0.95)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        padding: '8px 10px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <PanelContent cell={selectedCell} />
      </div>
    </div>
  )
}
