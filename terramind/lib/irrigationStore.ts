/**
 * lib/irrigationStore.ts
 * Simulated underground irrigation network — soil moisture, pipe flow,
 * blockage detection, dry-zone propagation.
 *
 * Grid: 10×10 cells matching the terrain (–5..5 in both axes).
 * Pipes run as a mainline (W→E along z=0) plus north/south laterals
 * branching every 2 cells.  Each cell has soil moisture and a pipe
 * segment that feeds it.
 */

import { create } from 'zustand'

// ── Types ────────────────────────────────────────────────────────────────
export type SoilType   = 'loamy' | 'clay' | 'sandy'
export type PipeStatus = 'active' | 'blocked' | 'dry' | 'overflow'
export type FlowLevel  = 'high' | 'normal' | 'low' | 'none'

export interface SoilCell {
  id: string           // "r{row}c{col}"
  row: number
  col: number
  // Terrain-space center position
  x: number
  z: number
  // Soil data
  moisture: number     // 0–1
  soilType: SoilType
  permeability: number // 0–1
  // Derived
  isDry: boolean       // moisture < 0.3
  isSaturated: boolean // moisture > 0.75
}

export interface PipeNode {
  id: string
  x: number
  y: number            // underground depth (negative)
  z: number
}

export interface PipeSegment {
  id: string
  from: PipeNode
  to: PipeNode
  // Which soil cells this segment feeds
  feedsCells: string[]
  // Status
  status: PipeStatus
  blocked: boolean
  blockagePct: number  // 0–100
  blockageCause: string
  // Flow
  flowRate: number     // 0–1 normalized
  flowLevel: FlowLevel
  // Diagnostics
  pressureKPa: number
  lastInspected: string
}

export interface IrrigationNetwork {
  cells: SoilCell[][]       // 10×10
  cellsFlat: SoilCell[]
  pipes: PipeSegment[]
  mainlineNodes: PipeNode[]
  // Summary
  totalCells: number
  dryCells: number
  blockedPipes: number
  avgMoisture: number
  coveragePct: number
}

// ── Seeded noise ────────────────────────────────────────────────────────
function sn(a: number, b: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.3) * 43758.5453
  return s - Math.floor(s)
}

// ── Grid constants ──────────────────────────────────────────────────────
const GRID      = 10
const CELL_SIZE = 1        // each cell is 1×1 in terrain units
const PIPE_Y    = -0.22    // underground depth
const TERRAIN_HALF = 5     // terrain goes –5 → +5

// ── Build network ────────────────────────────────────────────────────────
export function buildIrrigationNetwork(): IrrigationNetwork {
  // ── 1. Soil cells ─────────────────────────────────────────────────────
  const SOIL_TYPES: SoilType[] = ['loamy', 'clay', 'sandy']

  // Moisture map: NE corner dry (drought hotspot), SW wet (disease hotspot)
  const cells: SoilCell[][] = []
  for (let row = 0; row < GRID; row++) {
    const rowArr: SoilCell[] = []
    for (let col = 0; col < GRID; col++) {
      const n   = [1,2,3,4].map(s => sn(row, col, s))
      // Base moisture: NE = dry, SW = wet, rest moderate
      const neInfluence = Math.max(0, 1 - Math.hypot(row - 1, col - 8) / 7) * 0.4
      const swInfluence = Math.max(0, 1 - Math.hypot(row - 8, col - 1) / 7) * 0.3
      const base = 0.45 - neInfluence + swInfluence + (n[0] - 0.5) * 0.2
      const moisture = Math.max(0.1, Math.min(0.92, base))

      const soilIdx   = Math.floor(n[1] * 3)
      const soilType  = SOIL_TYPES[soilIdx]
      const perm      = soilType === 'sandy' ? 0.7 + n[2]*0.2
                      : soilType === 'loamy' ? 0.45 + n[2]*0.2
                      : 0.2 + n[2]*0.15

      rowArr.push({
        id:          `r${row}c${col}`,
        row, col,
        x: -TERRAIN_HALF + col * CELL_SIZE + CELL_SIZE / 2,
        z: -TERRAIN_HALF + row * CELL_SIZE + CELL_SIZE / 2,
        moisture,
        soilType,
        permeability: parseFloat(perm.toFixed(2)),
        isDry:       moisture < 0.3,
        isSaturated: moisture > 0.75,
      })
    }
    cells.push(rowArr)
  }
  const cellsFlat = cells.flat()

  // ── 2. Pipe topology ──────────────────────────────────────────────────
  // Layout:
  //   • 1 mainline: runs E→W along z = –4..+4 at x = –4.5
  //   • 5 lateral lines: branch southward from mainline every 2 columns
  //   • Each lateral feeds the 10 cells in its column pair

  const pipes: PipeSegment[] = []
  const mainlineNodes: PipeNode[] = []

  // Mainline nodes across top (z = –4.5, column centres)
  for (let col = 0; col <= GRID; col++) {
    const nx = -TERRAIN_HALF + col * CELL_SIZE
    mainlineNodes.push({ id: `mn${col}`, x: nx, y: PIPE_Y, z: -4.5 })
  }

  // Mainline segments
  for (let col = 0; col < GRID; col++) {
    const seg = buildPipeSegment(
      `ML${col}`,
      mainlineNodes[col],
      mainlineNodes[col + 1],
      [],          // mainline doesn't directly feed cells
      row => false, // mainline never blocked in this sim
      col, -1,
    )
    // Mainline always has high pressure / active flow
    seg.status    = 'active'
    seg.blocked   = false
    seg.flowRate  = 0.85 + sn(col, 0, 9) * 0.12
    seg.flowLevel = 'high'
    seg.pressureKPa = 280 + Math.round(sn(col, 0, 8) * 40)
    pipes.push(seg)
  }

  // Lateral lines: 5 laterals, one per pair of columns (cols 0–1, 2–3, 4–5, 6–7, 8–9)
  for (let lat = 0; lat < 5; lat++) {
    const col = lat * 2   // centre column of the lateral
    const nx  = -TERRAIN_HALF + col * CELL_SIZE + CELL_SIZE   // mid of col pair

    // Lateral entry node (connects to mainline)
    const entryNode: PipeNode = { id: `lt${lat}_entry`, x: nx, y: PIPE_Y, z: -4.5 }

    // Determine blockage for this lateral
    const isBlocked  = sn(lat, 5, 3) > 0.82      // ~18% chance per lateral
    const blockPct   = isBlocked ? Math.round(60 + sn(lat, 6, 4) * 35) : Math.round(sn(lat, 7, 5) * 10)
    const causeIdx   = Math.floor(sn(lat, 8, 6) * BLOCKAGE_CAUSES.length)

    for (let row = 0; row < GRID; row++) {
      const fromZ = -TERRAIN_HALF + row * CELL_SIZE - 0.5 + (row === 0 ? 1 : 0)
      const toZ   = -TERRAIN_HALF + (row + 1) * CELL_SIZE - 0.5
      const fromNode: PipeNode = { id: `lt${lat}_r${row}_from`, x: nx, y: PIPE_Y, z: fromZ }
      const toNode:   PipeNode = { id: `lt${lat}_r${row}_to`,   x: nx, y: PIPE_Y, z: toZ   }

      // Cells fed by this sub-segment (left and right of lateral)
      const fedCells: string[] = []
      for (const c of [col, col + 1]) {
        if (c < GRID) fedCells.push(`r${row}c${c}`)
      }

      const blocked = isBlocked && row >= Math.floor(GRID / 2)   // blockage hits downstream half
      const cell0   = cells[row]?.[col]
      const needFlow = cell0 ? (1 - cell0.moisture) : 0.5

      // Determine pipe status
      let status: PipeStatus = 'active'
      let flowRate = needFlow * (0.7 + sn(lat, row, 7) * 0.25)
      let flowLevel: FlowLevel = 'normal'

      if (blocked) {
        status    = 'blocked'
        flowRate  = Math.max(0, flowRate * (1 - blockPct / 100))
        flowLevel = flowRate < 0.05 ? 'none' : 'low'
      } else if (cell0?.isDry && flowRate > 0.7) {
        flowLevel = 'high'
      } else if (cell0?.isSaturated) {
        status    = 'overflow'
        flowLevel = 'high'
      } else if (flowRate < 0.15) {
        status    = 'dry'
        flowLevel = 'none'
      }

      pipes.push({
        id: `LT${lat}_R${row}`,
        from: fromNode,
        to:   toNode,
        feedsCells: fedCells,
        status,
        blocked,
        blockagePct: blocked ? blockPct : 0,
        blockageCause: blocked ? BLOCKAGE_CAUSES[causeIdx] : '',
        flowRate: parseFloat(flowRate.toFixed(3)),
        flowLevel,
        pressureKPa: blocked ? Math.round(sn(lat, row, 11) * 60)
                             : Math.round(140 + needFlow * 160 + sn(lat, row, 12) * 30),
        lastInspected: blocked ? `${Math.floor(sn(lat, row, 13) * 14) + 3} days ago` : 'Today',
      })
    }
  }

  // ── 3. Downstream dry propagation ─────────────────────────────────────
  // Mark cells as dry if their feeding lateral is blocked
  for (const seg of pipes) {
    if (seg.blocked) {
      for (const cid of seg.feedsCells) {
        const [r, c] = cid.slice(1).split('c').map(Number)
        if (cells[r]?.[c]) {
          const cell = cells[r][c]
          // Reduce moisture on blocked cells
          cell.moisture   = Math.max(0.1, cell.moisture * 0.45)
          cell.isDry      = cell.moisture < 0.3
          cell.isSaturated = false
        }
      }
    }
  }

  // Recompute summary
  const flatCells      = cells.flat()
  const dryCells       = flatCells.filter(c => c.isDry).length
  const blockedPipes   = pipes.filter(p => p.blocked).length
  const avgMoisture    = parseFloat((flatCells.reduce((s, c) => s + c.moisture, 0) / flatCells.length).toFixed(3))
  const coveredCells   = flatCells.filter(c => !c.isDry).length

  return {
    cells,
    cellsFlat: flatCells,
    pipes,
    mainlineNodes,
    totalCells:   GRID * GRID,
    dryCells,
    blockedPipes,
    avgMoisture,
    coveragePct: Math.round((coveredCells / (GRID * GRID)) * 100),
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
const BLOCKAGE_CAUSES = [
  'Construction debris from road widening project',
  'Silt deposit after monsoon runoff',
  'Root intrusion from border trees',
  'Corroded joint — pipe age >15 years',
  'Sand ingress — filter screen failure',
  'Mineral scale buildup (calcium carbonate)',
]

function buildPipeSegment(
  id: string,
  from: PipeNode,
  to: PipeNode,
  feedsCells: string[],
  isBlocked: (row: number) => boolean,
  col: number,
  row: number,
): PipeSegment {
  return {
    id, from, to, feedsCells,
    status: 'active',
    blocked: false,
    blockagePct: 0,
    blockageCause: '',
    flowRate: 0.5,
    flowLevel: 'normal',
    pressureKPa: 200,
    lastInspected: 'Today',
  }
}

// ── Flow helpers (exported for UI) ──────────────────────────────────────
export function getFlowDemand(moisture: number): number {
  // Low moisture = high flow demand
  return parseFloat(Math.max(0, Math.min(1, 1 - moisture)).toFixed(2))
}

export function analyzeCell(cell: SoilCell, pipes: PipeSegment[]): {
  status: string
  detail: string
  color: string
} {
  const feeder = pipes.find(p => p.feedsCells.includes(cell.id))

  if (feeder?.blocked) {
    return {
      status: 'Blockage detected',
      detail: `Water supply disrupted. Pipe ${feeder.id} is ${feeder.blockagePct}% blocked. Cause: ${feeder.blockageCause}`,
      color:  '#ef4444',
    }
  }
  if (cell.isDry) {
    return {
      status: 'Irrigation required',
      detail: `Moisture critically low (${Math.round(cell.moisture * 100)}%). Soil type: ${cell.soilType}. Schedule irrigation within 24h.`,
      color:  '#f59e0b',
    }
  }
  if (cell.isSaturated) {
    return {
      status: 'Overflow risk',
      detail: `Moisture at ${Math.round(cell.moisture * 100)}% — above field capacity. Reduce irrigation or check drainage.`,
      color:  '#3b82f6',
    }
  }
  return {
    status: 'Normal',
    detail: `Moisture ${Math.round(cell.moisture * 100)}%. Flow demand: ${Math.round(getFlowDemand(cell.moisture) * 100)}%. No intervention needed.`,
    color:  '#22c55e',
  }
}

// ── Precomputed network ──────────────────────────────────────────────────
export const IRRIGATION_NETWORK: IrrigationNetwork = buildIrrigationNetwork()

// ── Zustand store ────────────────────────────────────────────────────────
interface IrrigationState {
  network: IrrigationNetwork
  selectedCell: SoilCell | null
  selectedPipe: PipeSegment | null
  showPipes: boolean
  showMoistureOverlay: boolean
  showFlowParticles: boolean
  setSelectedCell: (c: SoilCell | null) => void
  setSelectedPipe: (p: PipeSegment | null) => void
  setShowPipes: (v: boolean) => void
  setShowMoistureOverlay: (v: boolean) => void
  setShowFlowParticles: (v: boolean) => void
}

export const useIrrigationStore = create<IrrigationState>((set) => ({
  network:              IRRIGATION_NETWORK,
  selectedCell:         null,
  selectedPipe:         null,
  showPipes:            true,
  showMoistureOverlay:  true,
  showFlowParticles:    true,
  setSelectedCell:         (c) => set({ selectedCell: c }),
  setSelectedPipe:         (p) => set({ selectedPipe: p }),
  setShowPipes:            (v) => set({ showPipes: v }),
  setShowMoistureOverlay:  (v) => set({ showMoistureOverlay: v }),
  setShowFlowParticles:    (v) => set({ showFlowParticles: v }),
}))
