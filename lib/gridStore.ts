/**
 * lib/gridStore.ts
 * 10x10 farm grid data model + Zustand store
 */

import { create } from 'zustand'

export type DiseaseRisk = 'none' | 'low' | 'medium' | 'high' | 'critical'

export interface GridCell {
  row: number
  col: number
  id: string                // "r3c7"
  soilQuality: number       // 0–100
  moisture: number          // 0–100 (%)
  diseaseRisk: DiseaseRisk
  yieldPrediction: number   // 0–100 (% of max yield)
  temperature: number       // °C
  nitrogenLevel: number     // 0–100
  pH: number                // 4.0–8.5
  criticalScore: number     // computed weighted score (higher = worse)
  healthLevel: 'healthy' | 'moderate' | 'critical'
  cropStress: string[]      // detected stress indicators
  lastUpdated: string       // timestamp string
}

// ── Seeded deterministic noise ──────────────────────────────────────────
function hash(row: number, col: number, salt: number): number {
  const s = Math.sin(row * 127.1 + col * 311.7 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

// ── Disease risk from score ─────────────────────────────────────────────
function riskLevel(score: number): DiseaseRisk {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'none'
}

function healthLevel(critScore: number): 'healthy' | 'moderate' | 'critical' {
  if (critScore >= 60) return 'critical'
  if (critScore >= 30) return 'moderate'
  return 'healthy'
}

// ── Crop stress indicators based on cell values ─────────────────────────
function stressIndicators(cell: {
  soilQuality: number; moisture: number;
  diseaseRisk: DiseaseRisk; nitrogenLevel: number; pH: number
}): string[] {
  const s: string[] = []
  if (cell.moisture < 25)       s.push('Severe water stress')
  else if (cell.moisture < 45)  s.push('Moderate drought stress')
  if (cell.soilQuality < 30)    s.push('Degraded soil structure')
  else if (cell.soilQuality < 50) s.push('Suboptimal soil quality')
  if (cell.diseaseRisk === 'critical') s.push('Active disease outbreak')
  else if (cell.diseaseRisk === 'high') s.push('High disease pressure')
  else if (cell.diseaseRisk === 'medium') s.push('Disease risk detected')
  if (cell.nitrogenLevel < 25)  s.push('Nitrogen deficiency')
  if (cell.pH < 5.5)            s.push('Soil acidification')
  else if (cell.pH > 7.5)       s.push('Alkaline stress')
  if (s.length === 0)           s.push('No active stressors')
  return s
}

// ── Generate full 10x10 grid with realistic spatial clustering ──────────
function generateGrid(): GridCell[][] {
  // Create "hotspot" centers that simulate real field patterns
  // SW corner: disease cluster; NE: drought; NW: fertilizer issue; Center: moderate
  const diseaseHotspot  = { r: 7.5, c: 1.5 } // SW area
  const droughtHotspot  = { r: 1.5, c: 8.0 } // NE area
  const healthyZone     = { r: 7.5, c: 8.0 } // SE area

  const grid: GridCell[][] = []

  for (let row = 0; row < 10; row++) {
    const rowArr: GridCell[] = []
    for (let col = 0; col < 10; col++) {
      // Proximity to hotspots (0–1, higher = closer)
      const distDisease  = Math.hypot(row - diseaseHotspot.r, col - diseaseHotspot.c) / 10
      const distDrought  = Math.hypot(row - droughtHotspot.r, col - droughtHotspot.c) / 10
      const distHealthy  = Math.hypot(row - healthyZone.r,   col - healthyZone.c)   / 10

      const diseaseInfluence = Math.max(0, 1 - distDisease * 2.2)
      const droughtInfluence = Math.max(0, 1 - distDrought * 2.2)
      const healthyInfluence = Math.max(0, 1 - distHealthy * 2.2)

      // Base values with noise
      const noiseA = hash(row, col, 1)
      const noiseB = hash(row, col, 2)
      const noiseC = hash(row, col, 3)
      const noiseD = hash(row, col, 4)
      const noiseE = hash(row, col, 5)
      const noiseF = hash(row, col, 6)

      const moisture = Math.round(
        Math.max(5, Math.min(95,
          70 - droughtInfluence * 55 + healthyInfluence * 20 + (noiseA - 0.5) * 20
        ))
      )

      const soilQuality = Math.round(
        Math.max(8, Math.min(97,
          72 - diseaseInfluence * 40 + healthyInfluence * 15 + (noiseB - 0.5) * 18
        ))
      )

      const diseaseRaw = Math.round(
        Math.max(0, Math.min(100,
          diseaseInfluence * 85 + (noiseC - 0.5) * 25 + (moisture < 35 ? 15 : 0)
        ))
      )

      const yieldPrediction = Math.round(
        Math.max(10, Math.min(98,
          (soilQuality * 0.4 + moisture * 0.3 + (100 - diseaseRaw) * 0.3)
            * (0.85 + noiseD * 0.25)
        ))
      )

      const temperature = parseFloat(
        (26 + diseaseInfluence * 4 + (noiseE - 0.5) * 4).toFixed(1)
      )

      const nitrogenLevel = Math.round(
        Math.max(10, Math.min(95,
          65 - diseaseInfluence * 30 + healthyInfluence * 20 + (noiseF - 0.5) * 22
        ))
      )

      const pHRaw = 5.5 + diseaseInfluence * 1.8 + (noiseA - 0.5) * 1.2
      const pH = parseFloat(Math.max(4.2, Math.min(8.2, pHRaw)).toFixed(1))

      // Critical score: higher = worse (0–100)
      const criticalScore = Math.round(
        ((100 - soilQuality) * 0.3) +
        ((100 - moisture) * 0.25) +
        (diseaseRaw * 0.35) +
        ((100 - nitrogenLevel) * 0.10)
      )

      const disease = riskLevel(diseaseRaw)
      const health  = healthLevel(criticalScore)

      const partial = { soilQuality, moisture, diseaseRisk: disease, nitrogenLevel, pH }

      rowArr.push({
        row, col,
        id: `r${row}c${col}`,
        soilQuality,
        moisture,
        diseaseRisk: disease,
        yieldPrediction,
        temperature,
        nitrogenLevel,
        pH,
        criticalScore,
        healthLevel: health,
        cropStress: stressIndicators(partial),
        lastUpdated: new Date(Date.now() - Math.floor(noiseA * 3600000)).toISOString(),
      })
    }
    grid.push(rowArr)
  }

  return grid
}

export const GRID_DATA: GridCell[][] = generateGrid()

// Flat list for easy scanning
export const GRID_FLAT: GridCell[] = GRID_DATA.flat()

// Most critical cell
export const MOST_CRITICAL: GridCell = [...GRID_FLAT].sort(
  (a, b) => b.criticalScore - a.criticalScore
)[0]

// Top 5 critical cells
export const TOP_CRITICAL: GridCell[] = [...GRID_FLAT]
  .sort((a, b) => b.criticalScore - a.criticalScore)
  .slice(0, 5)

// Health color
export const HEALTH_COLOR: Record<string, string> = {
  healthy:  '#22c55e',
  moderate: '#f59e0b',
  critical: '#ef4444',
}

export const DISEASE_COLOR: Record<DiseaseRisk, string> = {
  none:     '#22c55e',
  low:      '#84cc16',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
}

// ── Store ────────────────────────────────────────────────────────────────
interface GridStore {
  selectedCell: GridCell | null
  hoveredCell: GridCell | null
  activeLayer: 'health' | 'moisture' | 'disease' | 'yield' | 'soil' | 'nitrogen'
  aiQuery: string
  aiResponse: string | null
  aiLoading: boolean
  showCriticalPath: boolean
  setSelectedCell: (cell: GridCell | null) => void
  setHoveredCell: (cell: GridCell | null) => void
  setActiveLayer: (layer: GridStore['activeLayer']) => void
  setAiQuery: (q: string) => void
  setAiResponse: (r: string | null) => void
  setAiLoading: (v: boolean) => void
  setShowCriticalPath: (v: boolean) => void
}

export const useGridStore = create<GridStore>((set) => ({
  selectedCell: null,
  hoveredCell: null,
  activeLayer: 'health',
  aiQuery: '',
  aiResponse: null,
  aiLoading: false,
  showCriticalPath: false,
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setAiQuery: (q) => set({ aiQuery: q }),
  setAiResponse: (r) => set({ aiResponse: r }),
  setAiLoading: (v) => set({ aiLoading: v }),
  setShowCriticalPath: (v) => set({ showCriticalPath: v }),
}))
