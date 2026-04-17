/**
 * lib/fieldDataEngine.ts
 *
 * Hybrid data engine for the precision agriculture platform.
 *
 * Simulates what a production system would get from:
 *   - Sentinel-2 (NDVI, crop health spectral indices)
 *   - Sentinel-1 SAR (soil moisture, waterlogging)
 *   - ISRIC SoilGrids 250m (NPK, pH, texture)
 *   - Open-Meteo (temperature, humidity)
 *
 * All values are seeded-deterministic so every page reload
 * gives the same grid — no flickering, no random surprises.
 *
 * Public surface:
 *   fetchFieldBaseData()        → FieldBaseData
 *   generateGridData(rows,cols) → AnalyzedCell[][]
 *   analyzeCell(cell)           → CellAnalysis
 *   FIELD_GRID                  → pre-built 10×10 AnalyzedCell[][]
 *   FIELD_GRID_FLAT             → flat array
 *   useFieldStore               → Zustand store (selectedCell, layer)
 */

import { create } from 'zustand'

// ════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════

export type SoilTexture   = 'loamy' | 'clay' | 'sandy' | 'silty' | 'clay_loam'
export type NutrientLevel = 'deficient' | 'low' | 'medium' | 'high' | 'excess'
export type RiskLevel     = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type HealthStatus  = 'healthy' | 'moderate' | 'degraded' | 'critical'
export type TrendDir      = 'improving' | 'stable' | 'degrading'

/** Simulated Sentinel-2 + Sentinel-1 + SoilGrids base for the entire field */
export interface FieldBaseData {
  // Sentinel-2 spectral
  ndvi_mean:           number   // 0–1  (NDVI field average)
  evi_mean:            number   // 0–1  (Enhanced VI)
  savi_mean:           number   // 0–1  (Soil-Adjusted VI)
  chlorophyll_index:   number   // 0–1  (Red-Edge based)
  // Sentinel-1 SAR
  moisture_mean:       number   // 0–1  (volumetric water content)
  sar_backscatter_vv:  number   // dB   (VV channel, water proxy)
  // SoilGrids
  soil_texture:        SoilTexture
  ph_mean:             number   // 4.0–8.5
  soc_pct:             number   // soil organic carbon %
  nitrogen_kg_ha:      number   // kg / ha
  phosphorus_kg_ha:    number
  potassium_kg_ha:     number
  bulk_density:        number   // g/cm³
  cec:                 number   // meq/100 g
  // Meteorological (Open-Meteo)
  temperature_c:       number
  humidity_pct:        number   // 0–100
  et0_mm_day:          number   // reference evapotranspiration
  // Metadata
  capture_date:        string
  cloud_cover_pct:     number
  is_live:             boolean
}

/** Per-cell satellite + soil readings (varies spatially around base) */
export interface FieldCell {
  id:            string   // "r{row}c{col}"
  row:           number
  col:           number
  // Sentinel-2
  ndvi:          number
  evi:           number
  savi:          number
  chlorophyll:   number
  // Sentinel-1
  moisture:      number   // 0–1
  // SoilGrids
  ph:            number
  soc_pct:       number
  nitrogen:      number   // kg/ha  (absolute)
  phosphorus:    number
  potassium:     number
  soil_texture:  SoilTexture
  bulk_density:  number
  // Met
  temperature:   number
  humidity:      number   // 0–100
}

/** 7-problem analysis output for a single cell */
export interface CellAnalysis {
  // 1. Irrigation
  irrigation_needed:     boolean
  irrigation_urgency:    'none' | 'schedule' | 'soon' | 'immediate'
  irrigation_deficit_mm: number

  // 2. Fertilizer
  nitrogen_status:       NutrientLevel
  phosphorus_status:     NutrientLevel
  potassium_status:      NutrientLevel
  fertilizer_priority:   RiskLevel
  recommended_inputs:    string[]

  // 3. Disease
  disease_risk:          RiskLevel
  disease_type:          string   // e.g. "Blast Fungus", "Brown Spot", "None"
  disease_drivers:       string[] // reasons why risk is elevated

  // 4. Land degradation
  degradation_risk:      RiskLevel
  degradation_type:      string
  erosion_risk:          RiskLevel

  // 5. Crop suitability
  crop_suitability:      'optimal' | 'suitable' | 'marginal' | 'unsuitable'
  limiting_factors:      string[]

  // 6. Yield estimate
  yield_qtl_acre:        number   // quintals per acre
  yield_pct_of_max:      number   // 0–100
  yield_trend:           TrendDir

  // 7. Risk summary
  overall_risk:          RiskLevel
  health_status:         HealthStatus
  critical_score:        number   // 0–100 (higher = worse)
  action_required:       boolean
  primary_alert:         string   // single most urgent message
  stressors:             string[]
}

/** Cell + analysis bundled */
export interface AnalyzedCell extends FieldCell {
  analysis: CellAnalysis
}

// ════════════════════════════════════════════════════════════════════════
// SEEDED NOISE
// ════════════════════════════════════════════════════════════════════════

function sn(a: number, b: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

// ════════════════════════════════════════════════════════════════════════
// STEP 1 — BASE FIELD DATA
// ════════════════════════════════════════════════════════════════════════

/**
 * Simulates a Sentinel-2 / Sentinel-1 / SoilGrids combined fetch
 * for the whole field. Values are deterministic (no random()).
 */
export function fetchFieldBaseData(): FieldBaseData {
  console.log('[FieldDataEngine] Generating base field data (Sentinel-2 + SAR + SoilGrids)')

  const base: FieldBaseData = {
    // Sentinel-2 — healthy Samba rice at heading stage
    ndvi_mean:          0.64,
    evi_mean:           0.51,
    savi_mean:          0.58,
    chlorophyll_index:  0.72,
    // Sentinel-1 — moderate moisture, some dry zones NE
    moisture_mean:      0.52,
    sar_backscatter_vv: -8.4,
    // SoilGrids — Tamil Nadu Vertisol / Inceptisol
    soil_texture:       'clay_loam',
    ph_mean:            6.4,
    soc_pct:            1.45,
    nitrogen_kg_ha:     162,
    phosphorus_kg_ha:   22,
    potassium_kg_ha:    128,
    bulk_density:       1.32,
    cec:                24.5,
    // Open-Meteo
    temperature_c:      27.8,
    humidity_pct:       71,
    et0_mm_day:         4.8,
    // Metadata
    capture_date:       '2024-10-08',
    cloud_cover_pct:    6,
    is_live:            false,
  }

  console.log('[FieldDataEngine] Base data:', base)
  return base
}

// ════════════════════════════════════════════════════════════════════════
// STEP 2 — GENERATE SPATIAL GRID FROM BASE
// ════════════════════════════════════════════════════════════════════════

// Spatial hotspot definitions (Tamil Nadu field patterns):
//   NE = drought / low moisture (water-stress zone)
//   SW = high humidity + disease pressure (blast risk)
//   SE = healthy, well-drained
//   Central = nitrogen depletion strip

const HOTSPOTS = {
  drought:  { r: 1.5, c: 8.0 },
  disease:  { r: 7.5, c: 1.5 },
  healthy:  { r: 7.5, c: 8.0 },
  nitrogen: { r: 5.0, c: 5.0 },
}

function spatialInfluence(row: number, col: number, center: { r: number; c: number }, radius = 4): number {
  return Math.max(0, 1 - Math.hypot(row - center.r, col - center.c) / radius)
}

const TEXTURE_VARIANTS: SoilTexture[] = ['clay_loam', 'clay', 'loamy', 'silty', 'sandy']

export function generateGridData(rows: number, cols: number, base: FieldBaseData): FieldCell[][] {
  const grid: FieldCell[][] = []

  for (let r = 0; r < rows; r++) {
    const rowArr: FieldCell[] = []
    for (let c = 0; c < cols; c++) {
      const n = Array.from({ length: 12 }, (_, i) => sn(r, c, i + 1))

      const iDrought = spatialInfluence(r, c, HOTSPOTS.drought)
      const iDisease = spatialInfluence(r, c, HOTSPOTS.disease)
      const iHealthy = spatialInfluence(r, c, HOTSPOTS.healthy)
      const iNitrogen = spatialInfluence(r, c, HOTSPOTS.nitrogen, 3)

      // ── Sentinel-2 spectral ──────────────────────────────────────────
      const ndvi = round2(clamp(
        base.ndvi_mean
          - iDrought * 0.25          // drought reduces greenness
          - iDisease * 0.30          // blast reduces NDVI sharply
          + iHealthy * 0.18          // healthy zone boost
          + (n[0] - 0.5) * 0.12,
        0.05, 0.95,
      ))

      const evi = round2(clamp(base.evi_mean * (0.88 + ndvi * 0.22) + (n[1] - 0.5) * 0.08, 0.02, 0.9))
      const savi = round2(clamp(ndvi * 0.92 + (n[2] - 0.5) * 0.06, 0.02, 0.9))
      const chlorophyll = round2(clamp(
        base.chlorophyll_index - iNitrogen * 0.25 - iDisease * 0.20 + (n[3] - 0.5) * 0.10,
        0.1, 0.95,
      ))

      // ── Sentinel-1 moisture ──────────────────────────────────────────
      const moisture = round2(clamp(
        base.moisture_mean
          - iDrought * 0.32
          + iDisease * 0.22          // disease zones are wetter
          + iHealthy * 0.10
          + (n[4] - 0.5) * 0.15,
        0.08, 0.92,
      ))

      // ── SoilGrids per-cell ───────────────────────────────────────────
      const ph = round2(clamp(
        base.ph_mean
          + iDisease * 0.6           // disease zones tend acidic or pH-stressed
          + (n[5] - 0.5) * 0.6,
        4.2, 8.2,
      ))

      const soc = round2(clamp(base.soc_pct - iNitrogen * 0.4 + (n[6] - 0.5) * 0.3, 0.4, 3.0))

      const nitrogen = Math.round(clamp(
        base.nitrogen_kg_ha
          - iNitrogen * 55           // central strip depleted
          - iDisease * 30
          + iHealthy * 25
          + (n[7] - 0.5) * 30,
        60, 250,
      ))

      const phosphorus = Math.round(clamp(
        base.phosphorus_kg_ha + (n[8] - 0.5) * 12,
        8, 45,
      ))

      const potassium = Math.round(clamp(
        base.potassium_kg_ha - iNitrogen * 20 + (n[9] - 0.5) * 30,
        70, 200,
      ))

      const textureIdx = Math.floor(n[10] * TEXTURE_VARIANTS.length)
      const soil_texture = TEXTURE_VARIANTS[textureIdx]

      const bulk_density = round2(clamp(base.bulk_density + (n[11] - 0.5) * 0.18, 1.0, 1.7))

      // ── Met per-cell ─────────────────────────────────────────────────
      const temperature = round2(clamp(
        base.temperature_c + iDisease * 1.8 + (n[0] - 0.5) * 2.5,
        20, 36,
      ))

      const humidity = Math.round(clamp(
        base.humidity_pct + iDisease * 18 - iDrought * 20 + (n[1] - 0.5) * 12,
        25, 98,
      ))

      rowArr.push({
        id: `r${r}c${c}`,
        row: r, col: c,
        ndvi, evi, savi, chlorophyll,
        moisture,
        ph, soc_pct: soc, nitrogen, phosphorus, potassium,
        soil_texture, bulk_density,
        temperature, humidity,
      })
    }
    grid.push(rowArr)
  }

  return grid
}

// ════════════════════════════════════════════════════════════════════════
// STEP 3 — ANALYSIS ENGINE (all 7 problems)
// ════════════════════════════════════════════════════════════════════════

const DISEASE_TYPES = [
  { name: 'Blast Fungus (M. oryzae)',   ndviThresh: 0.38, humThresh: 72, note: 'spore germination >72% RH' },
  { name: 'Brown Spot (B. oryzae)',      ndviThresh: 0.42, humThresh: 68, note: 'low N + high humidity'   },
  { name: 'Sheath Blight (R. solani)',   ndviThresh: 0.45, humThresh: 75, note: 'high canopy humidity'    },
  { name: 'Bacterial Leaf Blight',       ndviThresh: 0.40, humThresh: 80, note: 'wet conditions'          },
]

function nutrientLevel(val: number, low: number, mid: number, high: number): NutrientLevel {
  if (val < low * 0.6) return 'deficient'
  if (val < low)       return 'low'
  if (val < mid)       return 'medium'
  if (val <= high)     return 'high'
  return 'excess'
}

function toRisk(score: number): RiskLevel {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'none'
}

export function analyzeCell(cell: FieldCell): CellAnalysis {
  // ── 1. Irrigation ────────────────────────────────────────────────────
  const fieldCapacity = 0.65
  const wiltingPoint  = 0.28
  const irrigThresh   = 0.35
  const moisturePct   = cell.moisture
  const deficitFraction = Math.max(0, fieldCapacity - moisturePct)
  const deficit_mm    = Math.round(deficitFraction * 300)  // ~300mm rooting depth

  const irrigation_needed = moisturePct < irrigThresh
  const irrigation_urgency =
    moisturePct < wiltingPoint ? 'immediate' :
    moisturePct < 0.32 ? 'soon'     :
    moisturePct < irrigThresh ? 'schedule' : 'none'

  // ── 2. Fertilizer ────────────────────────────────────────────────────
  // Optimal: N 170–200, P 20–30, K 130–160 kg/ha for Samba rice
  const nitrogen_status    = nutrientLevel(cell.nitrogen,    100, 140, 200)
  const phosphorus_status  = nutrientLevel(cell.phosphorus,   15,  22,  35)
  const potassium_status   = nutrientLevel(cell.potassium,    90, 125, 165)

  const fertScore =
    (nitrogen_status   === 'deficient' ? 40 : nitrogen_status   === 'low' ? 20 : 0) +
    (phosphorus_status === 'deficient' ? 25 : phosphorus_status === 'low' ? 12 : 0) +
    (potassium_status  === 'deficient' ? 20 : potassium_status  === 'low' ? 10 : 0)
  const fertilizer_priority = toRisk(fertScore)

  const recommended_inputs: string[] = []
  if (nitrogen_status   === 'deficient') recommended_inputs.push('Urea 12 kg/acre (top dress)')
  else if (nitrogen_status === 'low')    recommended_inputs.push('Urea 6 kg/acre')
  if (phosphorus_status === 'deficient') recommended_inputs.push('DAP 18 kg/acre')
  else if (phosphorus_status === 'low')  recommended_inputs.push('DAP 10 kg/acre')
  if (potassium_status  === 'deficient') recommended_inputs.push('MOP 12 kg/acre')
  else if (potassium_status === 'low')   recommended_inputs.push('MOP 8 kg/acre')
  if (cell.ph < 6.0)                     recommended_inputs.push('Lime 150 kg/acre')
  if (cell.soc_pct < 1.0)               recommended_inputs.push('FYM 4 tonnes/acre')
  if (recommended_inputs.length === 0)   recommended_inputs.push('No inputs needed')

  // ── 3. Disease ───────────────────────────────────────────────────────
  let diseaseScore = 0
  const disease_drivers: string[] = []

  for (const d of DISEASE_TYPES) {
    if (cell.ndvi < d.ndviThresh && cell.humidity > d.humThresh) {
      diseaseScore += 35
      disease_drivers.push(`${d.name}: ${d.note}`)
    }
  }
  if (cell.temperature > 30 && cell.humidity > 75) {
    diseaseScore += 20
    disease_drivers.push('High temp + humidity = spore germination conditions')
  }
  if (cell.ph < 5.8) {
    diseaseScore += 10
    disease_drivers.push('Acidic soil weakens root resistance')
  }

  const disease_risk = toRisk(Math.min(100, diseaseScore))
  let disease_type = 'None detected'
  if (diseaseScore > 0 && disease_drivers.length > 0) {
    const match = DISEASE_TYPES.find(d => cell.ndvi < d.ndviThresh && cell.humidity > d.humThresh)
    disease_type = match ? match.name : 'Fungal stress'
  }

  // ── 4. Land degradation ──────────────────────────────────────────────
  let degradScore = 0
  const degradation_type_parts: string[] = []

  if (cell.soc_pct < 1.0)        { degradScore += 30; degradation_type_parts.push('Low SOC') }
  if (cell.bulk_density > 1.5)   { degradScore += 25; degradation_type_parts.push('Compaction') }
  if (cell.ph < 5.5 || cell.ph > 7.8) { degradScore += 20; degradation_type_parts.push('pH stress') }
  if (cell.ndvi < 0.25)          { degradScore += 30; degradation_type_parts.push('Severe NDVI decline') }

  const degradation_risk = toRisk(degradScore)
  const degradation_type = degradation_type_parts.join(' + ') || 'None'
  const erosion_risk: RiskLevel = cell.soc_pct < 1.0 && cell.bulk_density > 1.4 ? 'high'
                                 : cell.soc_pct < 1.3 ? 'medium' : 'low'

  // ── 5. Crop suitability ──────────────────────────────────────────────
  const limiting_factors: string[] = []
  let suitScore = 100

  if (cell.soil_texture === 'sandy') { suitScore -= 25; limiting_factors.push('Sandy soil — poor water retention') }
  if (cell.ph < 5.5 || cell.ph > 7.5) { suitScore -= 20; limiting_factors.push(`pH ${cell.ph} out of optimal 5.5–7.5`) }
  if (cell.bulk_density > 1.55) { suitScore -= 20; limiting_factors.push('High bulk density — root penetration restricted') }
  if (cell.moisture < 0.25)     { suitScore -= 25; limiting_factors.push('Insufficient moisture for germination') }
  if (cell.temperature > 33)    { suitScore -= 15; limiting_factors.push('Temperature stress >33°C') }

  const crop_suitability =
    suitScore >= 80 ? 'optimal'  :
    suitScore >= 60 ? 'suitable' :
    suitScore >= 40 ? 'marginal' : 'unsuitable'

  // ── 6. Yield estimate ────────────────────────────────────────────────
  // Max theoretical Samba rice yield ~55 qtl/acre under ideal conditions
  const MAX_YIELD = 55
  const yieldFactor =
    cell.ndvi        * 0.35 +
    cell.moisture    * 0.25 +
    (cell.nitrogen / 200)   * 0.20 +
    (cell.soc_pct  / 2.5)   * 0.10 +
    (suitScore / 100)        * 0.10

  const yield_qtl_acre  = round2(clamp(yieldFactor * MAX_YIELD, 8, 52))
  const yield_pct_of_max = Math.round((yield_qtl_acre / MAX_YIELD) * 100)
  const yield_trend: TrendDir =
    cell.ndvi > 0.55 && cell.moisture > 0.4 ? 'improving' :
    cell.ndvi < 0.35 || cell.moisture < 0.28 ? 'degrading' : 'stable'

  // ── 7. Overall risk / health summary ────────────────────────────────
  const critScore = Math.round(
    (diseaseScore > 0  ? Math.min(diseaseScore, 40) : 0) +
    ((1 - cell.ndvi)   * 25) +
    ((1 - cell.moisture) * 20) +
    (fertScore * 0.25) +
    (degradScore * 0.15),
  )

  const overall_risk  = toRisk(critScore)
  const health_status: HealthStatus =
    critScore >= 60 ? 'critical' :
    critScore >= 40 ? 'degraded' :
    critScore >= 20 ? 'moderate' : 'healthy'

  const action_required = critScore >= 30 || irrigation_urgency === 'immediate' || disease_risk === 'critical'

  // Compose single primary alert
  let primary_alert = 'No urgent action required'
  if (irrigation_urgency === 'immediate') {
    primary_alert = `Critical moisture deficit — irrigate now (${deficit_mm}mm needed)`
  } else if (disease_risk === 'critical') {
    primary_alert = `${disease_type} — apply fungicide within 48h`
  } else if (disease_risk === 'high') {
    primary_alert = `High disease pressure (${disease_type}) — scout and treat`
  } else if (nitrogen_status === 'deficient') {
    primary_alert = `Severe N deficiency (${cell.nitrogen} kg/ha) — apply urea urgently`
  } else if (irrigation_urgency === 'soon') {
    primary_alert = `Water stress developing — irrigate within 2 days`
  } else if (degradation_risk === 'high' || degradation_risk === 'critical') {
    primary_alert = `Soil degradation detected: ${degradation_type}`
  }

  const stressors: string[] = []
  if (irrigation_urgency !== 'none')      stressors.push(`Water stress (${Math.round(cell.moisture * 100)}% moisture)`)
  if (nitrogen_status === 'deficient' || nitrogen_status === 'low') stressors.push(`N deficiency (${cell.nitrogen} kg/ha)`)
  if (disease_risk !== 'none')            stressors.push(`Disease: ${disease_type}`)
  if (degradation_risk !== 'none')        stressors.push(`Degradation: ${degradation_type}`)
  if (crop_suitability === 'marginal')    stressors.push(...limiting_factors.slice(0, 2))
  if (stressors.length === 0)             stressors.push('No active stressors')

  return {
    irrigation_needed, irrigation_urgency, irrigation_deficit_mm: deficit_mm,
    nitrogen_status, phosphorus_status, potassium_status,
    fertilizer_priority, recommended_inputs,
    disease_risk, disease_type, disease_drivers,
    degradation_risk, degradation_type, erosion_risk,
    crop_suitability, limiting_factors,
    yield_qtl_acre, yield_pct_of_max, yield_trend,
    overall_risk, health_status, critical_score: critScore,
    action_required, primary_alert, stressors,
  }
}

// ════════════════════════════════════════════════════════════════════════
// STEP 4 — ATTACH ANALYSIS TO EACH CELL
// ════════════════════════════════════════════════════════════════════════

function buildAnalyzedGrid(rows: number, cols: number): AnalyzedCell[][] {
  const base = fetchFieldBaseData()
  const raw  = generateGridData(rows, cols, base)

  const analyzed = raw.map(row =>
    row.map(cell => ({
      ...cell,
      analysis: analyzeCell(cell),
    }))
  )

  console.log('[FieldDataEngine] Grid built:', analyzed.flat().length, 'cells')
  console.log('[FieldDataEngine] Sample cell r0c0:', analyzed[0][0])
  return analyzed
}

// ════════════════════════════════════════════════════════════════════════
// PRE-BUILT GRIDS (deterministic, computed once at module load)
// ════════════════════════════════════════════════════════════════════════

export const FIELD_BASE:      FieldBaseData   = fetchFieldBaseData()
export const FIELD_GRID:      AnalyzedCell[][] = buildAnalyzedGrid(10, 10)
export const FIELD_GRID_FLAT: AnalyzedCell[]   = FIELD_GRID.flat()

// Summary helpers
export const FIELD_STATS = {
  avg_ndvi:       round2(FIELD_GRID_FLAT.reduce((s, c) => s + c.ndvi, 0) / FIELD_GRID_FLAT.length),
  avg_moisture:   round2(FIELD_GRID_FLAT.reduce((s, c) => s + c.moisture, 0) / FIELD_GRID_FLAT.length),
  critical_cells: FIELD_GRID_FLAT.filter(c => c.analysis.health_status === 'critical').length,
  dry_cells:      FIELD_GRID_FLAT.filter(c => c.analysis.irrigation_needed).length,
  disease_cells:  FIELD_GRID_FLAT.filter(c => c.analysis.disease_risk !== 'none').length,
  avg_yield:      round2(FIELD_GRID_FLAT.reduce((s, c) => s + c.analysis.yield_qtl_acre, 0) / FIELD_GRID_FLAT.length),
}

// ════════════════════════════════════════════════════════════════════════
// COLOR HELPERS  (exported for UI use)
// ════════════════════════════════════════════════════════════════════════

export function ndviColor(ndvi: number): string {
  if (ndvi < 0.2) return '#7c3f00'   // bare / very degraded
  if (ndvi < 0.35) return '#ef4444'  // critical
  if (ndvi < 0.50) return '#f97316'  // stressed
  if (ndvi < 0.62) return '#f59e0b'  // moderate
  if (ndvi < 0.74) return '#84cc16'  // good
  return '#22c55e'                   // excellent
}

export function moistureColor(m: number): string {
  if (m < 0.25) return '#ef4444'
  if (m < 0.35) return '#f59e0b'
  if (m < 0.60) return '#22c55e'
  if (m < 0.78) return '#3b82f6'
  return '#8b5cf6'
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  none:     '#22c55e',
  low:      '#84cc16',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
}

export const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy:  '#22c55e',
  moderate: '#f59e0b',
  degraded: '#f97316',
  critical: '#ef4444',
}

// ════════════════════════════════════════════════════════════════════════
// ZUSTAND STORE
// ════════════════════════════════════════════════════════════════════════

export type ActiveDataLayer = 'ndvi' | 'moisture' | 'disease' | 'nitrogen' | 'yield' | 'degradation' | 'suitability'

interface FieldStore {
  selectedCell:  AnalyzedCell | null
  hoveredCell:   AnalyzedCell | null
  activeLayer:   ActiveDataLayer
  panelOpen:     boolean
  setSelectedCell: (c: AnalyzedCell | null) => void
  setHoveredCell:  (c: AnalyzedCell | null) => void
  setActiveLayer:  (l: ActiveDataLayer) => void
  setPanelOpen:    (v: boolean) => void
}

export const useFieldStore = create<FieldStore>((set) => ({
  selectedCell:  null,
  hoveredCell:   null,
  activeLayer:   'ndvi',
  panelOpen:     false,
  setSelectedCell: (c) => set({ selectedCell: c, panelOpen: c !== null }),
  setHoveredCell:  (c) => set({ hoveredCell: c }),
  setActiveLayer:  (l) => set({ activeLayer: l }),
  setPanelOpen:    (v) => set({ panelOpen: v }),
}))
