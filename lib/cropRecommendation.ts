/**
 * lib/cropRecommendation.ts
 *
 * Deterministic, rule-based crop recommendation engine.
 * No ML, no API calls. Pure scoring logic driven by cell data.
 *
 * Public surface:
 *   CROPS                     — crop database constant
 *   scoreCrop(crop, data)     — returns numeric score (higher = better fit)
 *   getCropRecommendations(d) — sorted list: [{ name, score, warning? }]
 *   explainRecommendation(r)  — returns human-readable reasoning string
 */

import type { SoilTexture, NutrientLevel, RiskLevel } from './fieldDataEngine'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CropDef {
  name:       string
  emoji:      string
  soil:       SoilTexture[]
  water:      'low' | 'medium' | 'high'
  nitrogen:   'low' | 'medium' | 'high'
  tempRange:  [number, number]   // [min°C, max°C]
  rainfall:   'low' | 'medium' | 'high'
  avoidAfter?: string[]          // rotation penalty — avoid if last crop matches
  notes:      string             // one-line agronomic note
}

export interface RegionData {
  soilType:      SoilTexture
  moisture:      number           // 0–1
  nitrogen:      number           // kg/ha
  phosphorus:    number           // kg/ha
  potassium:     number           // kg/ha
  temperature:   number           // °C
  ph:            number
  degradation:   RiskLevel
  previousCrops?: string[]        // names of last 1–3 crops grown
}

export interface CropScore {
  name:      string
  emoji:     string
  score:     number               // 0–100+
  warning?:  string               // rotation or degradation alert
  notes:     string
}

// ─────────────────────────────────────────────────────────────────────────────
// CROP DATABASE
// ─────────────────────────────────────────────────────────────────────────────

export const CROPS: CropDef[] = [
  {
    name:      'Rice',
    emoji:     '🌾',
    soil:      ['clay', 'loamy', 'clay_loam'],
    water:     'high',
    nitrogen:  'medium',
    tempRange: [20, 35],
    rainfall:  'high',
    avoidAfter: ['rice'],
    notes:     'Prefers standing water, heavy soils, and warm humid conditions.',
  },
  {
    name:      'Wheat',
    emoji:     '🌿',
    soil:      ['loamy', 'clay_loam', 'silty'],
    water:     'medium',
    nitrogen:  'high',
    tempRange: [10, 25],
    rainfall:  'medium',
    avoidAfter: ['wheat'],
    notes:     'Requires cool temperatures at sowing; good nitrogen response.',
  },
  {
    name:      'Maize',
    emoji:     '🌽',
    soil:      ['loamy', 'sandy', 'clay_loam'],
    water:     'medium',
    nitrogen:  'high',
    tempRange: [18, 35],
    rainfall:  'medium',
    avoidAfter: [],
    notes:     'High nitrogen demand; well-drained loamy soils preferred.',
  },
  {
    name:      'Millet',
    emoji:     '🌱',
    soil:      ['sandy', 'loamy'],
    water:     'low',
    nitrogen:  'low',
    tempRange: [25, 42],
    rainfall:  'low',
    avoidAfter: [],
    notes:     'Drought-tolerant staple; thrives in hot dry conditions.',
  },
  {
    name:      'Sorghum',
    emoji:     '🌾',
    soil:      ['loamy', 'clay', 'sandy'],
    water:     'low',
    nitrogen:  'low',
    tempRange: [25, 40],
    rainfall:  'low',
    avoidAfter: [],
    notes:     'Excellent drought and heat tolerance; low input requirements.',
  },
  {
    name:      'Chickpea',
    emoji:     '🫘',
    soil:      ['loamy', 'sandy', 'clay_loam'],
    water:     'low',
    nitrogen:  'low',
    tempRange: [15, 30],
    rainfall:  'low',
    avoidAfter: ['chickpea'],
    notes:     'Nitrogen-fixing legume; improves soil for the next crop.',
  },
  {
    name:      'Lentils',
    emoji:     '🫘',
    soil:      ['loamy', 'silty', 'clay_loam'],
    water:     'low',
    nitrogen:  'low',
    tempRange: [15, 28],
    rainfall:  'low',
    avoidAfter: ['lentils'],
    notes:     'Cool-season legume; fixes nitrogen and suits rotation after cereal.',
  },
  {
    name:      'Groundnut',
    emoji:     '🥜',
    soil:      ['sandy', 'loamy'],
    water:     'medium',
    nitrogen:  'low',
    tempRange: [25, 38],
    rainfall:  'medium',
    avoidAfter: ['groundnut'],
    notes:     'Needs well-aerated sandy/loamy soil; sensitive to waterlogging.',
  },
  {
    name:      'Soybean',
    emoji:     '🫛',
    soil:      ['loamy', 'clay_loam', 'silty'],
    water:     'medium',
    nitrogen:  'low',
    tempRange: [20, 35],
    rainfall:  'medium',
    avoidAfter: ['soybean'],
    notes:     'Nitrogen-fixing; excellent rotation crop after cereals.',
  },
  {
    name:      'Cotton',
    emoji:     '🌸',
    soil:      ['clay', 'clay_loam', 'loamy'],
    water:     'medium',
    nitrogen:  'medium',
    tempRange: [25, 40],
    rainfall:  'medium',
    avoidAfter: [],
    notes:     'Long-duration crop; deep roots tolerate moderate drought.',
  },
  {
    name:      'Sugarcane',
    emoji:     '🎋',
    soil:      ['loamy', 'clay_loam', 'clay'],
    water:     'high',
    nitrogen:  'high',
    tempRange: [20, 38],
    rainfall:  'high',
    avoidAfter: [],
    notes:     'Water-intensive; rewards heavy N and warm humid climate.',
  },
  {
    name:      'Sunflower',
    emoji:     '🌻',
    soil:      ['loamy', 'sandy', 'silty'],
    water:     'low',
    nitrogen:  'medium',
    tempRange: [20, 35],
    rainfall:  'low',
    avoidAfter: ['sunflower'],
    notes:     'Moderate water use; rotates well after legumes.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCORING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a single crop against region data.
 * Max theoretical score ≈ 100 (before rotation/degradation penalties).
 */
export function scoreCrop(crop: CropDef, data: RegionData): number {
  let score = 0

  // 1. Soil texture match (+20)
  if (crop.soil.includes(data.soilType)) score += 20

  // 2. Moisture / water need match (+20)
  const moisturePct = data.moisture   // 0–1
  if (crop.water === 'high'   && moisturePct >= 0.55) score += 20
  if (crop.water === 'medium' && moisturePct >= 0.35 && moisturePct < 0.65) score += 20
  if (crop.water === 'low'    && moisturePct < 0.45) score += 20
  // Partial credit for near-match
  if (crop.water === 'high'   && moisturePct >= 0.40 && moisturePct < 0.55) score += 10
  if (crop.water === 'low'    && moisturePct >= 0.45 && moisturePct < 0.60) score += 10

  // 3. Temperature match (+20)
  if (data.temperature >= crop.tempRange[0] && data.temperature <= crop.tempRange[1]) {
    score += 20
  } else {
    // Partial credit within 5°C of range
    const below = crop.tempRange[0] - data.temperature
    const above = data.temperature - crop.tempRange[1]
    const gap   = Math.max(below, above)
    if (gap <= 5) score += Math.round(20 * (1 - gap / 5))
  }

  // 4. Nitrogen availability match (+15)
  const nitrogenAvail: NutrientLevel =
    data.nitrogen < 60  ? 'low'
    : data.nitrogen < 120 ? 'medium'
    : 'high'

  if (crop.nitrogen === nitrogenAvail) score += 15
  else if (
    (crop.nitrogen === 'medium' && nitrogenAvail === 'high') ||
    (crop.nitrogen === 'medium' && nitrogenAvail === 'low')
  ) score += 7

  // 5. pH suitability (+10)
  // Most crops do best at pH 6.0–7.5
  if (data.ph >= 6.0 && data.ph <= 7.5) score += 10
  else if (data.ph >= 5.5 && data.ph < 6.0) score += 6
  else if (data.ph > 7.5 && data.ph <= 8.0) score += 5

  // 6. Crop rotation penalty (−30)
  const lastCrop = data.previousCrops?.slice(-1)[0]
  if (lastCrop && crop.avoidAfter?.includes(lastCrop.toLowerCase())) score -= 30

  // 7. Land degradation penalty
  if (data.degradation === 'high' || data.degradation === 'critical') {
    if (crop.water === 'high') score -= 20   // water-hungry crops worsen degraded land
    else score -= 8
  } else if (data.degradation === 'medium') {
    if (crop.water === 'high') score -= 10
  }

  return score
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all crops sorted best-first.
 * Attaches a `warning` string for crops that triggered rotation/degradation penalties.
 */
export function getCropRecommendations(data: RegionData): CropScore[] {
  const lastCrop = data.previousCrops?.slice(-1)[0]?.toLowerCase()

  return CROPS
    .map(crop => {
      const score = scoreCrop(crop, data)
      let warning: string | undefined

      if (lastCrop && crop.avoidAfter?.includes(lastCrop)) {
        warning = `Avoid after ${lastCrop} — ${crop.name} monoculture increases disease risk.`
      } else if ((data.degradation === 'high' || data.degradation === 'critical') && crop.water === 'high') {
        warning = `High water demand may worsen soil degradation.`
      }

      return { name: crop.name, emoji: crop.emoji, score, warning, notes: crop.notes }
    })
    .sort((a, b) => b.score - a.score)
}

// ─────────────────────────────────────────────────────────────────────────────
// REASONING GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a plain-English explanation of why a crop scored the way it did.
 * Used by UI panels for the "Show Reasoning" feature.
 */
export function explainRecommendation(crop: CropDef, data: RegionData): string {
  const reasons: string[] = []

  if (crop.soil.includes(data.soilType)) {
    reasons.push(`suitable for ${data.soilType} soil`)
  } else {
    reasons.push(`suboptimal for ${data.soilType} soil (prefers ${crop.soil.join('/')})`)
  }

  if (data.temperature >= crop.tempRange[0] && data.temperature <= crop.tempRange[1]) {
    reasons.push(`current temperature ${data.temperature}°C is ideal`)
  } else {
    reasons.push(`temperature ${data.temperature}°C is outside ideal range (${crop.tempRange[0]}–${crop.tempRange[1]}°C)`)
  }

  const moisturePct = Math.round(data.moisture * 100)
  if (crop.water === 'high' && data.moisture >= 0.55)   reasons.push(`high moisture (${moisturePct}%) matches water needs`)
  if (crop.water === 'low'  && data.moisture < 0.45)    reasons.push(`low moisture (${moisturePct}%) suits low water requirement`)
  if (crop.water === 'medium')                          reasons.push(`moderate water requirement (current: ${moisturePct}%)`)

  if (crop.nitrogen === 'low') {
    reasons.push(`low nitrogen input needed — reduces fertilizer cost`)
  } else if (crop.nitrogen === 'high' && data.nitrogen >= 120) {
    reasons.push(`field nitrogen (${data.nitrogen} kg/ha) supports high demand`)
  }

  const lastCrop = data.previousCrops?.slice(-1)[0]?.toLowerCase()
  if (lastCrop && crop.avoidAfter?.includes(lastCrop)) {
    reasons.push(`⚠ rotation risk — same crop grown last season`)
  } else if (lastCrop) {
    reasons.push(`good rotation after ${lastCrop}`)
  }

  return reasons.join('; ') + '.'
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — build RegionData from an AnalyzedCell
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adapts an AnalyzedCell (from fieldDataEngine) into the RegionData shape
 * needed by getCropRecommendations.
 *
 * `previousCrops` is optional context the caller can inject from farm records.
 */
export function cellToRegionData(
  cell: {
    soil_texture: SoilTexture
    moisture:     number
    nitrogen:     number
    phosphorus:   number
    potassium:    number
    temperature:  number
    ph:           number
    analysis: { degradation_risk: RiskLevel }
  },
  previousCrops?: string[]
): RegionData {
  return {
    soilType:     cell.soil_texture,
    moisture:     cell.moisture,
    nitrogen:     cell.nitrogen,
    phosphorus:   cell.phosphorus,
    potassium:    cell.potassium,
    temperature:  cell.temperature,
    ph:           cell.ph,
    degradation:  cell.analysis.degradation_risk,
    previousCrops,
  }
}
