/**
 * lib/quadrantStore.ts
 * Quadrant data model + Zustand store for field intelligence system
 */

import { create } from 'zustand'

export type QuadrantId = 'NE' | 'NW' | 'SE' | 'SW'

export interface QuadrantIssue {
  label: string
  severity: 'high' | 'medium' | 'low'
  detail: string
}

export interface QuadrantData {
  id: QuadrantId
  label: string
  direction: string
  centerX: number
  centerZ: number
  cameraPos: [number, number, number]
  cameraTarget: [number, number, number]
  healthScore: number
  healthLevel: 'healthy' | 'moderate' | 'critical'
  ndvi: number
  moisture: number
  topProblem: string
  issues: QuadrantIssue[]
  recommendedActions: string[]
  recommendedActionsHi: string[]
  aiConfidence: number
  emoji: string
}

export const QUADRANT_DATA: Record<QuadrantId, QuadrantData> = {
  NE: {
    id: 'NE', label: 'North-East', direction: 'NE',
    centerX: 2.5, centerZ: -2.5,
    cameraPos: [5.5, 5.5, 2.5],
    cameraTarget: [2.5, 0, -2.5],
    healthScore: 52, healthLevel: 'moderate',
    ndvi: 0.42, moisture: 28,
    topProblem: 'Water Stress',
    emoji: '💧',
    issues: [
      { label: 'Soil Moisture 28%',   severity: 'high',   detail: 'Below 35% critical threshold for tillering' },
      { label: 'ET₀ Deficit 4 days',  severity: 'high',   detail: '5.2 mm/day evapotranspiration accumulating' },
      { label: 'NDVI Drop −0.12',     severity: 'medium', detail: 'Dropped from 0.54 last week' },
      { label: 'Tiller stress signs', severity: 'low',    detail: 'Leaf rolling observed in 0.3 acres' },
    ],
    recommendedActions: [
      'Irrigate 40mm within 3 days',
      'Use drip system to target NE corner',
      'Re-check moisture in 5 days',
    ],
    recommendedActionsHi: [
      '3 दिनों में 40mm सिंचाई करें',
      'NE कोने को टार्गेट करने के लिए ड्रिप सिस्टम का उपयोग करें',
      '5 दिनों में नमी फिर से जांचें',
    ],
    aiConfidence: 88,
  },

  NW: {
    id: 'NW', label: 'North-West', direction: 'NW',
    centerX: -2.5, centerZ: -2.5,
    cameraPos: [-5.5, 5.5, 2.5],
    cameraTarget: [-2.5, 0, -2.5],
    healthScore: 71, healthLevel: 'healthy',
    ndvi: 0.74, moisture: 58,
    topProblem: 'Potassium Deficiency',
    emoji: '🌿',
    issues: [
      { label: 'K at 118 kg/ha',       severity: 'medium', detail: 'Optimal is 140 kg/ha for heading stage' },
      { label: 'Tiller count low',     severity: 'low',    detail: '310/m² vs expected 380/m²' },
      { label: 'Minor leaf yellowing', severity: 'low',    detail: 'Bottom leaves, non-critical at this stage' },
    ],
    recommendedActions: [
      'Apply MOP 10 kg/acre at panicle initiation',
      'Foliar spray Zinc Sulfate 0.5%',
      'Monitor for Khaira disease symptoms',
    ],
    recommendedActionsHi: [
      'बाल निकलने पर MOP 10 किलो/एकड़ डालें',
      'जिंक सल्फेट 0.5% का पर्णीय छिड़काव करें',
      'खैरा रोग के लक्षणों की निगरानी करें',
    ],
    aiConfidence: 85,
  },

  SE: {
    id: 'SE', label: 'South-East', direction: 'SE',
    centerX: 2.5, centerZ: 2.5,
    cameraPos: [5.5, 5.5, 7.5],
    cameraTarget: [2.5, 0, 2.5],
    healthScore: 78, healthLevel: 'healthy',
    ndvi: 0.78, moisture: 62,
    topProblem: 'None — Peak Health',
    emoji: '✅',
    issues: [
      { label: 'NDVI at peak 0.78',   severity: 'low', detail: 'Optimal heading stage performance' },
      { label: 'Good canopy closure', severity: 'low', detail: '95% canopy — minimal weed pressure' },
    ],
    recommendedActions: [
      'Maintain current irrigation schedule',
      'Apply K top-dressing at milky stage (7 days)',
      'Scout for stem borer in 10 days',
    ],
    recommendedActionsHi: [
      'वर्तमान सिंचाई कार्यक्रम बनाए रखें',
      'दुधिया चरण में K टॉप-ड्रेसिंग करें (7 दिन)',
      '10 दिनों में तना छेदक की निगरानी करें',
    ],
    aiConfidence: 91,
  },

  SW: {
    id: 'SW', label: 'South-West', direction: 'SW',
    centerX: -2.5, centerZ: 2.5,
    cameraPos: [-5.5, 5.5, 7.5],
    cameraTarget: [-2.5, 0, 2.5],
    healthScore: 34, healthLevel: 'critical',
    ndvi: 0.21, moisture: 44,
    topProblem: 'Rice Blast Fungus',
    emoji: '🔴',
    issues: [
      { label: 'Spore Density 840/cm²', severity: 'high',   detail: 'Magnaporthe oryzae — confirmed via NDVI + YOLOv11' },
      { label: 'NDVI Collapse −0.31',   severity: 'high',   detail: 'Severe tissue necrosis across 0.43 acres' },
      { label: 'Spread Risk: 7 days',   severity: 'high',   detail: '60% of field at risk if untreated today' },
      { label: 'Humidity 88%',          severity: 'medium', detail: 'Accelerating spore germination rate ×3' },
      { label: 'Compaction risk',       severity: 'medium', detail: 'Bulk density 1.52 g/cm³ in SW corner' },
    ],
    recommendedActions: [
      'Apply Tricyclazole 0.6g/L + Propiconazole 0.1% NOW',
      'Maintain 2cm standing water to slow spread',
      'Re-scout field in 5 days',
      'Avoid heavy machinery — worsens compaction',
    ],
    recommendedActionsHi: [
      'अभी Tricyclazole 0.6g/L + Propiconazole 0.1% डालें',
      'फैलाव धीमा करने के लिए 2 सेमी खड़ा पानी बनाए रखें',
      '5 दिनों में खेत की फिर से जांच करें',
      'भारी मशीनरी से बचें — संकुचन बढ़ता है',
    ],
    aiConfidence: 92,
  },
}

// Module → quadrant auto-fly mapping
export const MODULE_QUADRANT_MAP: Partial<Record<string, QuadrantId>> = {
  disease:    'SW',
  water:      'NE',
  fertilizer: 'NW',
  yield:      'SE',
}

// Health level → color
export const HEALTH_COLOR: Record<string, string> = {
  healthy:  '#22c55e',
  moderate: '#f59e0b',
  critical: '#ef4444',
}

// Quadrant store
interface QuadrantStore {
  selectedQuadrant: QuadrantId | null
  setSelectedQuadrant: (id: QuadrantId | null) => void
}

export const useQuadrantStore = create<QuadrantStore>((set) => ({
  selectedQuadrant: null,
  setSelectedQuadrant: (id) => set({ selectedQuadrant: id }),
}))
