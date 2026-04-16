/**
 * lib/hierarchyStore.ts
 * Multi-resolution hierarchical farm grid system
 * Level 1: Field overview (10×10)
 * Level 2: Zone subdivision (5×5 child cells per Level-1 cell)
 * Level 3: Micro-zone (3×3 child cells per Level-2 cell)
 */

import { create } from 'zustand'

// ── Types ────────────────────────────────────────────────────────────────
export type DiseaseRisk = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type HealthLevel = 'healthy' | 'moderate' | 'critical'

export interface HierarchyCell {
  id: string              // e.g. "l1_r3c7", "l2_r3c7_r1c2"
  level: 1 | 2 | 3
  row: number             // row within current grid
  col: number             // col within current grid
  parentId: string | null

  // Agronomic data
  soilQuality: number     // 0–100
  moisture: number        // 0–100
  diseaseRisk: DiseaseRisk
  yieldPrediction: number // 0–100
  temperature: number     // °C
  nitrogenLevel: number   // 0–100
  pH: number              // 4.0–8.5
  criticalScore: number   // 0–100 (higher = worse)
  healthLevel: HealthLevel
  cropStress: string[]
  lastUpdated: string

  // Level-specific labels
  levelLabel: string      // "Field Zone" | "Sub-Zone" | "Micro-Zone"
  boundLabel: string      // e.g. "NW Sector" | "Central Patch" | "Root Zone A"
}

export interface DrillPath {
  cell: HierarchyCell
  gridSize: number // 10 | 5 | 3
}

// ── Seeded noise ─────────────────────────────────────────────────────────
function hash(a: number, b: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

function hashStr(str: string, salt: number): number {
  let h = salt * 1000
  for (let i = 0; i < str.length; i++) h += str.charCodeAt(i) * (i + 1) * 31.7
  const s = Math.sin(h) * 43758.5453
  return s - Math.floor(s)
}

// ── Disease risk ─────────────────────────────────────────────────────────
function toRisk(score: number): DiseaseRisk {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  if (score >= 20) return 'low'
  return 'none'
}

function toHealth(critScore: number): HealthLevel {
  if (critScore >= 60) return 'critical'
  if (critScore >= 30) return 'moderate'
  return 'healthy'
}

// ── Stress indicators ─────────────────────────────────────────────────────
function stressors(c: {
  soilQuality: number; moisture: number
  diseaseRisk: DiseaseRisk; nitrogenLevel: number; pH: number
}): string[] {
  const s: string[] = []
  if (c.moisture < 25)          s.push('Severe water stress')
  else if (c.moisture < 45)     s.push('Moderate drought stress')
  if (c.soilQuality < 30)       s.push('Degraded soil structure')
  else if (c.soilQuality < 50)  s.push('Suboptimal soil quality')
  if (c.diseaseRisk === 'critical') s.push('Active disease outbreak')
  else if (c.diseaseRisk === 'high') s.push('High disease pressure')
  else if (c.diseaseRisk === 'medium') s.push('Disease risk detected')
  if (c.nitrogenLevel < 25)     s.push('Nitrogen deficiency')
  if (c.pH < 5.5)               s.push('Soil acidification')
  else if (c.pH > 7.5)          s.push('Alkaline stress')
  if (s.length === 0)           s.push('No active stressors')
  return s
}

// ── Bound labels ─────────────────────────────────────────────────────────
const L2_LABELS = [
  'NW Sector', 'N Sector', 'NE Sector',
  'W Sector', 'Central', 'E Sector',
  'SW Sector', 'S Sector', 'SE Sector', 'Far Edge',
  'Upper Left', 'Upper Right', 'Lower Left', 'Lower Right', 'Mid Strip',
  'Alpha Patch', 'Beta Patch', 'Gamma Patch', 'Delta Patch', 'Edge Strip',
  'Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E',
]

const L3_LABELS = [
  'Root Zone A', 'Root Zone B', 'Root Zone C',
  'Canopy A', 'Canopy B', 'Canopy C',
  'Sub-surface A', 'Sub-surface B', 'Sub-surface C',
]

// ── Level-1 generation (10×10) ───────────────────────────────────────────
export function generateLevel1(): HierarchyCell[][] {
  const diseaseHotspot = { r: 7.5, c: 1.5 }
  const droughtHotspot  = { r: 1.5, c: 8.0 }
  const healthyZone     = { r: 7.5, c: 8.0 }

  const grid: HierarchyCell[][] = []
  for (let row = 0; row < 10; row++) {
    const rowArr: HierarchyCell[] = []
    for (let col = 0; col < 10; col++) {
      const distDisease = Math.hypot(row - diseaseHotspot.r, col - diseaseHotspot.c) / 10
      const distDrought  = Math.hypot(row - droughtHotspot.r, col - droughtHotspot.c) / 10
      const distHealthy  = Math.hypot(row - healthyZone.r,   col - healthyZone.c)   / 10

      const dInf = Math.max(0, 1 - distDisease * 2.2)
      const wInf = Math.max(0, 1 - distDrought * 2.2)
      const hInf = Math.max(0, 1 - distHealthy * 2.2)

      const n = [1,2,3,4,5,6].map(s => hash(row, col, s))

      const moisture      = Math.round(Math.max(5,  Math.min(95,  70 - wInf*55 + hInf*20 + (n[0]-0.5)*20)))
      const soilQuality   = Math.round(Math.max(8,  Math.min(97,  72 - dInf*40 + hInf*15 + (n[1]-0.5)*18)))
      const diseaseRaw    = Math.round(Math.max(0,  Math.min(100, dInf*85 + (n[2]-0.5)*25 + (moisture < 35 ? 15 : 0))))
      const yieldPred     = Math.round(Math.max(10, Math.min(98,  (soilQuality*0.4 + moisture*0.3 + (100-diseaseRaw)*0.3)*(0.85+n[3]*0.25))))
      const temperature   = parseFloat((26 + dInf*4 + (n[4]-0.5)*4).toFixed(1))
      const nitrogenLevel = Math.round(Math.max(10, Math.min(95,  65 - dInf*30 + hInf*20 + (n[5]-0.5)*22)))
      const pHRaw         = 5.5 + dInf*1.8 + (n[0]-0.5)*1.2
      const pH            = parseFloat(Math.max(4.2, Math.min(8.2, pHRaw)).toFixed(1))
      const criticalScore = Math.round(((100-soilQuality)*0.3) + ((100-moisture)*0.25) + (diseaseRaw*0.35) + ((100-nitrogenLevel)*0.10))
      const disease = toRisk(diseaseRaw)
      const health  = toHealth(criticalScore)

      rowArr.push({
        id: `l1_r${row}c${col}`,
        level: 1, row, col, parentId: null,
        soilQuality, moisture, diseaseRisk: disease, yieldPrediction: yieldPred,
        temperature, nitrogenLevel, pH, criticalScore, healthLevel: health,
        cropStress: stressors({ soilQuality, moisture, diseaseRisk: disease, nitrogenLevel, pH }),
        lastUpdated: new Date(Date.now() - Math.floor(n[0] * 3600000)).toISOString(),
        levelLabel: 'Field Zone',
        boundLabel: `Grid ${row+1}–${col+1}`,
      })
    }
    grid.push(rowArr)
  }
  return grid
}

// ── Level-2 generation (5×5 children of a Level-1 cell) ─────────────────
export function generateLevel2(parent: HierarchyCell): HierarchyCell[][] {
  const SIZE = 5
  const grid: HierarchyCell[][] = []

  for (let row = 0; row < SIZE; row++) {
    const rowArr: HierarchyCell[] = []
    for (let col = 0; col < SIZE; col++) {
      // Inherit from parent with ±variation
      const noiseKey = parent.id + row + col
      const n = [1,2,3,4,5,6,7].map(s => hashStr(noiseKey, s))

      const variation = (v: number, range: number) =>
        Math.round(Math.max(0, Math.min(100, v + (n[Math.floor(v % 7)] - 0.5) * range)))

      const moisture      = variation(parent.moisture, 24)
      const soilQuality   = variation(parent.soilQuality, 20)
      const diseaseRaw    = variation(
        { none:0, low:20, medium:50, high:75, critical:95 }[parent.diseaseRisk],
        28
      )
      const nitrogenLevel = variation(parent.nitrogenLevel, 22)
      const pHBase        = parent.pH + (n[4] - 0.5) * 0.9
      const pH            = parseFloat(Math.max(4.2, Math.min(8.2, pHBase)).toFixed(1))
      const yieldPred     = variation(parent.yieldPrediction, 20)
      const temperature   = parseFloat((parent.temperature + (n[5] - 0.5) * 2).toFixed(1))
      const criticalScore = Math.round(((100-soilQuality)*0.3) + ((100-moisture)*0.25) + (diseaseRaw*0.35) + ((100-nitrogenLevel)*0.10))
      const disease = toRisk(diseaseRaw)
      const health  = toHealth(criticalScore)
      const labelIdx = (row * SIZE + col) % L2_LABELS.length

      rowArr.push({
        id: `${parent.id}_l2_r${row}c${col}`,
        level: 2, row, col, parentId: parent.id,
        soilQuality, moisture, diseaseRisk: disease, yieldPrediction: yieldPred,
        temperature, nitrogenLevel, pH, criticalScore, healthLevel: health,
        cropStress: stressors({ soilQuality, moisture, diseaseRisk: disease, nitrogenLevel, pH }),
        lastUpdated: new Date(Date.now() - Math.floor(n[0] * 1800000)).toISOString(),
        levelLabel: 'Sub-Zone',
        boundLabel: L2_LABELS[labelIdx],
      })
    }
    grid.push(rowArr)
  }
  return grid
}

// ── Level-3 generation (3×3 children of a Level-2 cell) ─────────────────
export function generateLevel3(parent: HierarchyCell): HierarchyCell[][] {
  const SIZE = 3
  const grid: HierarchyCell[][] = []

  for (let row = 0; row < SIZE; row++) {
    const rowArr: HierarchyCell[] = []
    for (let col = 0; col < SIZE; col++) {
      const noiseKey = parent.id + row + col + '_micro'
      const n = [1,2,3,4,5,6,7,8].map(s => hashStr(noiseKey, s))

      const variation = (v: number, range: number) =>
        Math.round(Math.max(0, Math.min(100, v + (n[Math.floor(v % 8)] - 0.5) * range)))

      const moisture      = variation(parent.moisture, 16)
      const soilQuality   = variation(parent.soilQuality, 14)
      const diseaseRaw    = variation(
        { none:0, low:20, medium:50, high:75, critical:95 }[parent.diseaseRisk],
        18
      )
      const nitrogenLevel = variation(parent.nitrogenLevel, 15)
      const pHBase        = parent.pH + (n[4] - 0.5) * 0.5
      const pH            = parseFloat(Math.max(4.2, Math.min(8.2, pHBase)).toFixed(1))
      const yieldPred     = variation(parent.yieldPrediction, 14)
      const temperature   = parseFloat((parent.temperature + (n[5] - 0.5) * 1).toFixed(1))
      const criticalScore = Math.round(((100-soilQuality)*0.3) + ((100-moisture)*0.25) + (diseaseRaw*0.35) + ((100-nitrogenLevel)*0.10))
      const disease = toRisk(diseaseRaw)
      const health  = toHealth(criticalScore)
      const labelIdx = (row * SIZE + col) % L3_LABELS.length

      rowArr.push({
        id: `${parent.id}_l3_r${row}c${col}`,
        level: 3, row, col, parentId: parent.id,
        soilQuality, moisture, diseaseRisk: disease, yieldPrediction: yieldPred,
        temperature, nitrogenLevel, pH, criticalScore, healthLevel: health,
        cropStress: stressors({ soilQuality, moisture, diseaseRisk: disease, nitrogenLevel, pH }),
        lastUpdated: new Date(Date.now() - Math.floor(n[0] * 900000)).toISOString(),
        levelLabel: 'Micro-Zone',
        boundLabel: L3_LABELS[labelIdx],
      })
    }
    grid.push(rowArr)
  }
  return grid
}

// ── Precompute Level-1 data ───────────────────────────────────────────────
export const LEVEL1_DATA: HierarchyCell[][] = generateLevel1()
export const LEVEL1_FLAT: HierarchyCell[] = LEVEL1_DATA.flat()

export const L1_MOST_CRITICAL: HierarchyCell = [...LEVEL1_FLAT].sort(
  (a, b) => b.criticalScore - a.criticalScore
)[0]

export const L1_TOP_CRITICAL: HierarchyCell[] = [...LEVEL1_FLAT]
  .sort((a, b) => b.criticalScore - a.criticalScore)
  .slice(0, 5)

// ── Colors ────────────────────────────────────────────────────────────────
export const HEALTH_COLOR: Record<HealthLevel, string> = {
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

// ── Zustand store ────────────────────────────────────────────────────────
interface HierarchyStore {
  // Current drill path: array of {cell, gridSize} pairs the user drilled through
  drillPath: DrillPath[]
  // Current grid being displayed (changes when drilling)
  currentGrid: HierarchyCell[][]
  // Current grid size
  currentGridSize: number
  // Selected cell in current grid
  selectedCell: HierarchyCell | null
  hoveredCell: HierarchyCell | null
  // UI
  activeLayer: 'health' | 'moisture' | 'disease' | 'yield' | 'soil' | 'nitrogen'
  aiResponse: string | null
  aiLoading: boolean
  showCriticalPath: boolean
  // Transition direction for animation
  transitionDir: 'in' | 'out'

  setSelectedCell: (c: HierarchyCell | null) => void
  setHoveredCell: (c: HierarchyCell | null) => void
  setActiveLayer: (l: HierarchyStore['activeLayer']) => void
  setAiResponse: (r: string | null) => void
  setAiLoading: (v: boolean) => void
  setShowCriticalPath: (v: boolean) => void

  // Drill into a cell (go deeper)
  drillInto: (cell: HierarchyCell) => void
  // Go back one level
  drillOut: () => void
  // Navigate to a specific depth in the drill path (0 = back to level 1)
  navigateToDepth: (depth: number) => void
  // Reset to level 1
  resetToLevel1: () => void
}

export const useHierarchyStore = create<HierarchyStore>((set, get) => ({
  drillPath: [],
  currentGrid: LEVEL1_DATA,
  currentGridSize: 10,
  selectedCell: null,
  hoveredCell: null,
  activeLayer: 'health',
  aiResponse: null,
  aiLoading: false,
  showCriticalPath: false,
  transitionDir: 'in',

  setSelectedCell: (c) => set({ selectedCell: c }),
  setHoveredCell: (c) => set({ hoveredCell: c }),
  setActiveLayer: (l) => set({ activeLayer: l }),
  setAiResponse: (r) => set({ aiResponse: r }),
  setAiLoading: (v) => set({ aiLoading: v }),
  setShowCriticalPath: (v) => set({ showCriticalPath: v }),

  drillInto: (cell) => {
    const { drillPath } = get()
    if (cell.level >= 3) return // Already at max depth

    let newGrid: HierarchyCell[][]
    let newSize: number

    if (cell.level === 1) {
      newGrid = generateLevel2(cell)
      newSize = 5
    } else {
      newGrid = generateLevel3(cell)
      newSize = 3
    }

    set({
      drillPath: [...drillPath, { cell, gridSize: cell.level === 1 ? 10 : 5 }],
      currentGrid: newGrid,
      currentGridSize: newSize,
      selectedCell: null,
      aiResponse: null,
      transitionDir: 'in',
    })
  },

  drillOut: () => {
    const { drillPath } = get()
    if (drillPath.length === 0) return

    const newPath = [...drillPath]
    const last = newPath.pop()!

    let newGrid: HierarchyCell[][]
    let newSize: number

    if (newPath.length === 0) {
      // Back to level 1
      newGrid = LEVEL1_DATA
      newSize = 10
    } else {
      const parentEntry = newPath[newPath.length - 1]
      if (last.cell.level === 2) {
        newGrid = generateLevel2(parentEntry.cell)
        newSize = 5
      } else {
        newGrid = generateLevel3(parentEntry.cell)
        newSize = 3
      }
    }

    set({
      drillPath: newPath,
      currentGrid: newGrid,
      currentGridSize: newSize,
      selectedCell: last.cell,
      aiResponse: null,
      transitionDir: 'out',
    })
  },

  resetToLevel1: () => {
    set({
      drillPath: [],
      currentGrid: LEVEL1_DATA,
      currentGridSize: 10,
      selectedCell: null,
      hoveredCell: null,
      aiResponse: null,
      transitionDir: 'out',
    })
  },

  navigateToDepth: (depth: number) => {
    const { drillPath } = get()
    if (depth <= 0 || depth > drillPath.length) {
      // Go home
      set({
        drillPath: [],
        currentGrid: LEVEL1_DATA,
        currentGridSize: 10,
        selectedCell: null,
        hoveredCell: null,
        aiResponse: null,
        transitionDir: 'out',
      })
      return
    }

    // Slice path to target depth
    const newPath = drillPath.slice(0, depth)
    const targetEntry = newPath[newPath.length - 1]

    // Regenerate the grid at that depth
    let newGrid: HierarchyCell[][]
    let newSize: number

    if (targetEntry.cell.level === 1) {
      newGrid = generateLevel2(targetEntry.cell)
      newSize = 5
    } else {
      newGrid = generateLevel3(targetEntry.cell)
      newSize = 3
    }

    set({
      drillPath: newPath,
      currentGrid: newGrid,
      currentGridSize: newSize,
      selectedCell: null,
      hoveredCell: null,
      aiResponse: null,
      transitionDir: 'out',
    })
  },
}))
