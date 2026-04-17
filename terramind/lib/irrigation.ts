/**
 * lib/irrigation.ts
 * Irrigation pipeline detection + drainage blockage analysis
 *
 * Real sources used:
 *  - Sentinel-1 SAR C-band (VV/VH) → water surface detection via backscatter
 *  - Sentinel-2 NDWI (B3–B8) / MNDWI (B3–B11) → surface water extent
 *  - SRTM DEM 30m → flow direction, slope, watershed delineation
 *  - ISRO Bhuvan LULC → canal / drainage network layer
 *  - OSM Overpass API → existing canal / watercourse geometry
 *  - Open-Meteo rainfall → runoff estimation
 *
 * For demo: returns rich mock data that matches real API shape
 */

export interface PipelineSegment {
  id: string
  type: 'main_canal' | 'field_channel' | 'drainage' | 'pipe_underground'
  status: 'active' | 'blocked' | 'dry' | 'overflow' | 'damaged'
  startCoord: [number, number]   // [lat, lng]
  endCoord:   [number, number]
  length_m:   number
  width_m:    number
  flow_ls:    number             // litres/second detected
  blockage_pct: number          // 0-100
  blockage_cause?: string
  last_active: string
  detectionMethod: string
  confidence: number
}

export interface DrainageIssue {
  id: string
  type: 'construction_block' | 'silt_deposit' | 'vegetation_overgrowth' | 'structural_damage' | 'overflow'
  severity: 'critical' | 'high' | 'medium' | 'low'
  location: [number, number]
  zone: string
  description: string
  affectedArea_acres: number
  waterlog_risk: boolean
  detected_by: string
  recommendation: string
  cost_to_fix: string
  revenue_risk: string
}

export interface SoilMoistureGrid {
  gridId: string
  row: number
  col: number
  lat: number
  lng: number
  moisture_pct: number       // volumetric water content %
  field_capacity: number     // % at field capacity
  wilting_point: number      // permanent wilting point %
  status: 'optimal' | 'low' | 'critical' | 'saturated' | 'waterlogged'
  trend: 'rising' | 'falling' | 'stable'
  depth_cm: number           // measurement depth
}

export interface IrrigationResult {
  farm_id: string
  analyzed_at: string
  is_live: boolean
  coverage_pct: number       // % of field with irrigation coverage

  // Pipeline map
  segments: PipelineSegment[]

  // Drainage issues
  drainage_issues: DrainageIssue[]

  // Moisture grid (4x4 = 16 cells across the field)
  moisture_grid: SoilMoistureGrid[]

  // Summary
  summary: {
    total_canal_length_m: number
    active_segments: number
    blocked_segments: number
    avg_moisture: number
    critical_zones: number
    next_irrigation_days: number
    water_use_efficiency: number   // %
    estimated_seepage_loss_ls: number
  }

  // Satellite metadata
  sar_date: string | null
  ndwi_date: string | null
}

// ── Mock grid generator (mirrors real SMAP 9km downscaled to field level) ──
function generateMoistureGrid(centerLat: number, centerLng: number): SoilMoistureGrid[] {
  const COLS = 4, ROWS = 4
  const STEP_LAT = 0.0005
  const STEP_LNG = 0.0005

  // Base moisture map — NE is dry, SW has fungus (high moisture), centre good
  const BASE: number[][] = [
    [38, 42, 45, 28],   // row 0 (north) — NE dry
    [44, 68, 72, 34],   // row 1
    [58, 74, 71, 42],   // row 2
    [52, 65, 61, 48],   // row 3 (south)
  ]

  const grid: SoilMoistureGrid[] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const moisture = BASE[r][c] + (Math.random() * 4 - 2)
      const status: SoilMoistureGrid['status'] =
        moisture < 30 ? 'critical' :
        moisture < 40 ? 'low' :
        moisture > 75 ? 'waterlogged' :
        moisture > 65 ? 'saturated' : 'optimal'
      grid.push({
        gridId: `G${r}${c}`,
        row: r, col: c,
        lat: centerLat + (1.5 - r) * STEP_LAT,
        lng: centerLng + (c - 1.5) * STEP_LNG,
        moisture_pct: Math.round(moisture * 10) / 10,
        field_capacity: 65,
        wilting_point: 28,
        status,
        trend: moisture < 40 ? 'falling' : moisture > 68 ? 'rising' : 'stable',
        depth_cm: 30,
      })
    }
  }
  return grid
}

// ── Mock pipeline segments ──────────────────────────────────────────────
function generateSegments(centerLat: number, centerLng: number): PipelineSegment[] {
  return [
    {
      id: 'SEG-001',
      type: 'main_canal',
      status: 'active',
      startCoord: [centerLat + 0.003, centerLng - 0.005],
      endCoord:   [centerLat + 0.003, centerLng + 0.005],
      length_m: 420, width_m: 2.4, flow_ls: 38.5,
      blockage_pct: 0, last_active: 'Now',
      detectionMethod: 'Sentinel-1 SAR VV backscatter',
      confidence: 94,
    },
    {
      id: 'SEG-002',
      type: 'field_channel',
      status: 'active',
      startCoord: [centerLat + 0.003, centerLng - 0.001],
      endCoord:   [centerLat - 0.002, centerLng - 0.001],
      length_m: 280, width_m: 0.8, flow_ls: 12.2,
      blockage_pct: 8, last_active: 'Now',
      detectionMethod: 'Sentinel-2 NDWI + SAR',
      confidence: 89,
    },
    {
      id: 'SEG-003',
      type: 'field_channel',
      status: 'blocked',
      startCoord: [centerLat + 0.001, centerLng + 0.002],
      endCoord:   [centerLat - 0.002, centerLng + 0.002],
      length_m: 175, width_m: 0.6, flow_ls: 0.8,
      blockage_pct: 74,
      blockage_cause: 'Construction debris from road widening project',
      last_active: '6 days ago',
      detectionMethod: 'SAR temporal change + NDWI anomaly',
      confidence: 91,
    },
    {
      id: 'SEG-004',
      type: 'drainage',
      status: 'overflow',
      startCoord: [centerLat - 0.002, centerLng - 0.003],
      endCoord:   [centerLat - 0.002, centerLng + 0.004],
      length_m: 380, width_m: 1.2, flow_ls: 28.1,
      blockage_pct: 35,
      blockage_cause: 'Heavy silt deposit + overflow from upstream',
      last_active: 'Now',
      detectionMethod: 'Sentinel-1 SAR coherence + DEM slope',
      confidence: 86,
    },
    {
      id: 'SEG-005',
      type: 'pipe_underground',
      status: 'dry',
      startCoord: [centerLat + 0.0005, centerLng - 0.003],
      endCoord:   [centerLat + 0.0005, centerLng + 0.001],
      length_m: 210, width_m: 0.3, flow_ls: 0,
      blockage_pct: 100,
      blockage_cause: 'Suspected pipe fracture — SAR surface moisture anomaly',
      last_active: '12 days ago',
      detectionMethod: 'SAR subsurface moisture anomaly + DEM depression',
      confidence: 78,
    },
  ]
}

// ── Mock drainage issues ────────────────────────────────────────────────
function generateDrainageIssues(centerLat: number, centerLng: number): DrainageIssue[] {
  return [
    {
      id: 'DRN-001',
      type: 'construction_block',
      severity: 'critical',
      location: [centerLat + 0.001, centerLng + 0.002],
      zone: 'NE Channel (SEG-003)',
      description: 'Road widening construction on NH-226 has dumped ~12 tonnes of debris into the east field channel. Flow reduced 74%. Connected 0.58 acres now waterlogging risk.',
      affectedArea_acres: 0.58,
      waterlog_risk: true,
      detected_by: 'SAR temporal coherence change detected 6 days ago',
      recommendation: 'File complaint with PWD Thanjavur (Ref: TN-PWD-2024-1872). Clear 40m stretch manually. Estimated 2 days labour.',
      cost_to_fix: '₹3,200',
      revenue_risk: '₹9,400',
    },
    {
      id: 'DRN-002',
      type: 'silt_deposit',
      severity: 'high',
      location: [centerLat - 0.002, centerLng + 0.0005],
      zone: 'South Drainage (SEG-004)',
      description: 'Monsoon runoff deposited 0.4m silt layer across 35% of south drainage channel. Post-harvest flooding risk if October rains >80mm in 48h.',
      affectedArea_acres: 0.72,
      waterlog_risk: true,
      detected_by: 'SRTM DEM vs current elevation diff + SAR backscatter',
      recommendation: 'De-silt 140m stretch before October monsoon. Use JCB mini-excavator. File for MGNREGS canal maintenance work.',
      cost_to_fix: '₹8,500',
      revenue_risk: '₹14,200',
    },
    {
      id: 'DRN-003',
      type: 'vegetation_overgrowth',
      severity: 'medium',
      location: [centerLat - 0.001, centerLng - 0.002],
      zone: 'West Field Channel',
      description: 'Thick aquatic vegetation (water hyacinth) blocking 28% of west channel. Reduces flow efficiency. Not yet critical but will worsen in 3 weeks.',
      affectedArea_acres: 0.31,
      waterlog_risk: false,
      detected_by: 'Sentinel-2 NDVI false colour + near-IR vegetation index',
      recommendation: 'Remove water hyacinth manually (2 days work). Consider herbicide Glyphosate 2% — consult local KVK.',
      cost_to_fix: '₹1,800',
      revenue_risk: '₹3,100',
    },
    {
      id: 'DRN-004',
      type: 'structural_damage',
      severity: 'high',
      location: [centerLat + 0.0005, centerLng - 0.001],
      zone: 'Underground Pipe (SEG-005)',
      description: 'Underground irrigation pipe fracture suspected. SAR moisture anomaly shows 0.15 acre surface saturation with no active irrigation. Pipe inactive 12 days.',
      affectedArea_acres: 0.15,
      waterlog_risk: false,
      detected_by: 'SAR subsurface anomaly + NDWI spot elevation mismatch',
      recommendation: 'Excavate at GPS: 10.7875°N 79.1393°E for visual inspection. Contact TNAU Agricultural Engineering dept.',
      cost_to_fix: '₹12,000',
      revenue_risk: '₹5,800',
    },
  ]
}

// ── Main fetch function ──────────────────────────────────────────────────
export async function analyzeIrrigation(
  lat: number,
  lng: number,
): Promise<IrrigationResult> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800))

  const segments = generateSegments(lat, lng)
  const grid     = generateMoistureGrid(lat, lng)
  const issues   = generateDrainageIssues(lat, lng)

  const activeSegs   = segments.filter(s => s.status === 'active').length
  const blockedSegs  = segments.filter(s => s.status === 'blocked' || s.status === 'dry').length
  const avgMoisture  = Math.round(grid.reduce((s, g) => s + g.moisture_pct, 0) / grid.length)
  const criticalZones = grid.filter(g => g.status === 'critical' || g.status === 'waterlogged').length

  return {
    farm_id:      'farm_001',
    analyzed_at:  new Date().toISOString(),
    is_live:      false,
    coverage_pct: 68,

    segments,
    drainage_issues: issues,
    moisture_grid:   grid,

    summary: {
      total_canal_length_m:     segments.reduce((s, seg) => s + seg.length_m, 0),
      active_segments:          activeSegs,
      blocked_segments:         blockedSegs,
      avg_moisture:             avgMoisture,
      critical_zones:           criticalZones,
      next_irrigation_days:     3,
      water_use_efficiency:     62,
      estimated_seepage_loss_ls: 4.8,
    },

    sar_date:  '2024-10-08',
    ndwi_date: '2024-10-06',
  }
}
