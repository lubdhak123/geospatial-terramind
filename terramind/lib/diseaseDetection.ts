/**
 * lib/diseaseDetection.ts
 *
 * Data-driven disease inference from cell sensor values.
 * No satellite image analysis — purely NDVI / moisture / humidity /
 * temperature signals mapped to likely disease type.
 *
 * The fieldDataEngine already sets `disease_type` and `disease_risk`
 * on CellAnalysis; this module enriches that with the full DiseaseInfo
 * reference record and adds a human-readable confidence percentage.
 */

import { type DiseaseKey, type DiseaseInfo, DISEASE_DB } from './diseaseData'

export interface DiseaseDetectionInput {
  ndvi:        number   // 0–1
  moisture:    number   // 0–1
  humidity:    number   // 0–100
  temperature: number   // °C
  nitrogen:    number   // kg/ha
  potassium:   number   // kg/ha
  soc_pct:     number   // soil organic carbon %
  ph:          number
  bulk_density:number
  /** disease_type string already set by fieldDataEngine.analyzeCell() */
  engineDiseaseType: string
  /** disease_risk already set by fieldDataEngine.analyzeCell() */
  engineDiseaseRisk: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

export interface DiseaseDetectionResult {
  key:         DiseaseKey
  info:        DiseaseInfo
  confidence:  number     // 0–100 integer
  riskLevel:   'none' | 'low' | 'medium' | 'high' | 'critical'
  riskLabel:   string     // "No Risk" / "Low" / "Medium" / "High" / "Critical"
  riskColor:   string     // hex for UI
  detected:    boolean    // false when key === 'none'
  /** 1-2 sentence plain-English explanation for the farmer */
  explanation: string
}

const RISK_LABEL: Record<string, string> = {
  none:     'No Risk',
  low:      'Low Risk',
  medium:   'Moderate Risk',
  high:     'High Risk',
  critical: 'Critical',
}

const RISK_COLOR: Record<string, string> = {
  none:     '#22c55e',
  low:      '#84cc16',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#dc2626',
}

// ── Map fieldDataEngine disease_type strings → DiseaseKey ─────────────────

function engineTypeToKey(type: string): DiseaseKey {
  const t = type.toLowerCase()
  if (t.includes('blast'))              return 'rice_blast'
  if (t.includes('brown spot'))         return 'brown_spot'
  if (t.includes('bacterial') || t.includes('blight')) return 'bacterial_blight'
  if (t.includes('sheath'))             return 'sheath_blight'
  if (t.includes('rust'))               return 'leaf_rust'
  if (t.includes('mildew') || t.includes('powdery')) return 'powdery_mildew'
  if (t.includes('root') || t.includes('rot'))       return 'root_rot'
  return 'none'
}

// ── Confidence estimation based on sensor signal strength ─────────────────

function estimateConfidence(
  key: DiseaseKey,
  input: DiseaseDetectionInput,
): number {
  if (key === 'none') return 0

  let score = 50 // base confidence when engine flagged a disease

  switch (key) {
    case 'rice_blast':
      if (input.ndvi < 0.45)     score += 15
      if (input.humidity > 82)   score += 10
      if (input.moisture > 0.62) score += 8
      if (input.temperature >= 24 && input.temperature <= 28) score += 7
      break

    case 'brown_spot':
      if (input.ndvi < 0.50)     score += 12
      if (input.potassium < 110) score += 12
      if (input.soc_pct < 1.0)   score += 8
      if (input.moisture > 0.55) score += 8
      break

    case 'bacterial_blight':
      if (input.humidity > 85)   score += 15
      if (input.moisture > 0.70) score += 12
      if (input.nitrogen > 180)  score += 8
      break

    case 'sheath_blight':
      if (input.humidity > 78)   score += 12
      if (input.nitrogen > 170)  score += 10
      if (input.moisture > 0.60) score += 8
      if (input.temperature >= 28 && input.temperature <= 32) score += 10
      break

    case 'leaf_rust':
      if (input.ndvi < 0.48)     score += 12
      if (input.humidity > 70)   score += 10
      if (input.temperature < 22) score += 8
      break

    case 'powdery_mildew':
      if (input.humidity > 60 && input.humidity < 80) score += 12
      if (input.nitrogen > 175)  score += 10
      if (input.moisture < 0.35) score += 10
      break

    case 'root_rot':
      if (input.moisture > 0.75) score += 18
      if (input.bulk_density > 1.45) score += 8
      if (input.soc_pct < 0.9)   score += 8
      if (input.ndvi < 0.40)     score += 6
      break
  }

  // Risk level from engine adds certainty weight
  if (input.engineDiseaseRisk === 'critical') score += 10
  else if (input.engineDiseaseRisk === 'high') score += 6
  else if (input.engineDiseaseRisk === 'medium') score += 2

  return Math.min(97, Math.round(score))
}

// ── Plain-English explanation generator ───────────────────────────────────

function buildExplanation(
  key: DiseaseKey,
  input: DiseaseDetectionInput,
  confidence: number,
): string {
  if (key === 'none') {
    return 'Sensor readings are within healthy ranges. No disease patterns detected in this zone.'
  }

  const parts: string[] = []

  if (input.humidity > 80) parts.push(`high humidity (${Math.round(input.humidity)}%)`)
  if (input.ndvi < 0.50)   parts.push(`low crop health index (NDVI ${input.ndvi.toFixed(2)})`)
  if (input.moisture > 0.65) parts.push(`excess soil moisture (${Math.round(input.moisture * 100)}%)`)
  if (input.potassium < 110 && key === 'brown_spot') parts.push('potassium deficiency')
  if (input.nitrogen > 175 && (key === 'bacterial_blight' || key === 'sheath_blight')) parts.push('excess nitrogen')
  if (input.bulk_density > 1.45 && key === 'root_rot') parts.push('compacted soil')

  const driverStr = parts.length > 0 ? ` Driven by: ${parts.slice(0, 2).join(' and ')}.` : ''
  return `${confidence}% confidence based on field sensor patterns.${driverStr} Act on the steps below to limit crop loss.`
}

// ── Main exported function ────────────────────────────────────────────────

export function detectDisease(input: DiseaseDetectionInput): DiseaseDetectionResult {
  // Trust the engine's type classification; we enrich it with reference data
  const key = engineTypeToKey(input.engineDiseaseType)
  const riskLevel = input.engineDiseaseRisk
  const info = DISEASE_DB[key]
  const confidence = estimateConfidence(key, input)
  const explanation = buildExplanation(key, input, confidence)

  return {
    key,
    info,
    confidence,
    riskLevel,
    riskLabel:  RISK_LABEL[riskLevel] ?? 'Unknown',
    riskColor:  RISK_COLOR[riskLevel] ?? '#94a3b8',
    detected:   key !== 'none',
    explanation,
  }
}

/**
 * Convenience wrapper: accepts the raw AnalyzedCell shape from fieldDataEngine
 * so callers don't need to manually destructure.
 */
export function detectDiseaseFromCell(cell: {
  ndvi: number
  moisture: number
  humidity: number
  temperature: number
  nitrogen: number
  potassium: number
  soc_pct: number
  ph: number
  bulk_density: number
  analysis: {
    disease_type: string
    disease_risk: 'none' | 'low' | 'medium' | 'high' | 'critical'
  }
}): DiseaseDetectionResult {
  return detectDisease({
    ndvi:              cell.ndvi,
    moisture:          cell.moisture,
    humidity:          cell.humidity,
    temperature:       cell.temperature,
    nitrogen:          cell.nitrogen,
    potassium:         cell.potassium,
    soc_pct:           cell.soc_pct,
    ph:                cell.ph,
    bulk_density:      cell.bulk_density,
    engineDiseaseType: cell.analysis.disease_type,
    engineDiseaseRisk: cell.analysis.disease_risk,
  })
}
