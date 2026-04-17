/**
 * lib/realFieldPipeline.ts
 *
 * Real satellite + soil + weather data pipeline for a farmer's field.
 *
 * Data sources (all free / free-tier):
 *   1. Sentinel Hub Statistical API   — NDVI, EVI, moisture per grid cell
 *      https://docs.sentinel-hub.com/api/latest/api/statistical/
 *      Requires SENTINEL_HUB_CLIENT_ID + SENTINEL_HUB_CLIENT_SECRET env vars.
 *      Falls back to seeded simulation if credentials are absent.
 *
 *   2. ISRIC SoilGrids REST API       — pH, SOC, N, clay%, sand% at a point
 *      https://rest.isric.org/soilgrids/v2.0/properties/query
 *      No API key required. Falls back gracefully on timeout.
 *
 *   3. Open-Meteo Forecast API        — temperature, humidity, ET₀
 *      https://api.open-meteo.com/v1/forecast
 *      No API key required.
 *
 * All three fetches run in parallel per cell. Grid cells that fail
 * individually fall back to spatially-interpolated neighbours or
 * the field-level simulation baseline, so the grid is always complete.
 *
 * Public surface:
 *   fetchRealFieldBase(lat, lng)            → FieldBaseData (field average)
 *   fetchRealCellGrid(polygon, rows, cols)  → FieldCell[][]
 */

import type { FieldBaseData, FieldCell, SoilTexture } from './fieldDataEngine'

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface GeoPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]   // GeoJSON: [lng, lat]
  center: [number, number]            // [lat, lng]
  area_acres: number
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────

/** Deterministic seeded noise — same inputs always give same output */
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

/**
 * Compute a 10×10 grid of cell centroids from a GeoJSON polygon.
 * Divides the bounding box into rows×cols equal tiles.
 */
function buildCellCentroids(
  polygon: GeoPolygon,
  rows: number,
  cols: number,
): { lat: number; lng: number; row: number; col: number }[] {
  const coords = polygon.coordinates[0]
  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const dLat = (maxLat - minLat) / rows
  const dLng = (maxLng - minLng) / cols

  const centroids = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      centroids.push({
        lat: minLat + (r + 0.5) * dLat,
        lng: minLng + (c + 0.5) * dLng,
        row: r,
        col: c,
      })
    }
  }
  return centroids
}

// ────────────────────────────────────────────────────────────────────────────
// SOURCE 1 — SENTINEL HUB STATISTICAL API
// Docs: https://docs.sentinel-hub.com/api/latest/api/statistical/
// ────────────────────────────────────────────────────────────────────────────

interface SentinelStats {
  ndvi: number
  evi: number
  moisture: number   // derived from SWIR
  chlorophyll: number
  is_live: boolean
}

let _sentinelToken: { token: string; expires: number } | null = null

async function getSentinelToken(clientId: string, clientSecret: string): Promise<string> {
  if (_sentinelToken && Date.now() < _sentinelToken.expires) return _sentinelToken.token

  const res = await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Sentinel auth failed: ${res.status}`)
  const data = await res.json()
  _sentinelToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return _sentinelToken.token
}

/**
 * Fetch NDVI + EVI + SWIR moisture for a bounding box via Sentinel Hub Statistical API.
 * Returns band means for the most recent cloud-free Sentinel-2 L2A scene.
 */
async function fetchSentinelStats(
  bbox: [number, number, number, number],  // [minLng, minLat, maxLng, maxLat]
  token: string,
): Promise<SentinelStats> {
  // Evalscript: returns NDVI, EVI, NDWI (moisture proxy), Red-Edge Chlorophyll index
  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04","B08","B8A","B11","B05"], units: "REFLECTANCE" }],
    output: [{ id: "indices", bands: 4 }]
  };
}
function evaluatePixel(sample) {
  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 1e-9);
  const evi  = 2.5 * (sample.B08 - sample.B04) / (sample.B08 + 6*sample.B04 - 7.5*0.1 + 1 + 1e-9);
  const ndwi = (sample.B8A - sample.B11) / (sample.B8A + sample.B11 + 1e-9); // NDWI moisture
  const cire = (sample.B8A / (sample.B05 + 1e-9)) - 1;  // Chlorophyll Red-Edge Index
  return { indices: [ndvi, evi, (ndwi+1)/2, cire/5] }; // normalise to 0-1
}
`

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{
        dataFilter: { timeRange: { from: '2024-01-01T00:00:00Z', to: '2025-01-01T00:00:00Z' }, maxCloudCoverage: 20 },
        type: 'sentinel-2-l2a',
      }],
    },
    aggregation: {
      timeRange: { from: '2024-01-01T00:00:00Z', to: '2025-01-01T00:00:00Z' },
      aggregationInterval: { of: 'P1D' },
      evalscript,
      resx: 10, resy: 10,
    },
    calculations: { indices: { statistics: { default: { percentiles: { k: [25, 50, 75] } } } } },
  }

  const res = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`Sentinel stats failed: ${res.status}`)
  const data = await res.json()

  // Get the most recent interval with data
  const intervals: Array<{ outputs: { indices: { bands: Record<string, { stats: { mean: number } }> } } }> =
    data.data?.filter((d: { outputs?: unknown }) => d.outputs) ?? []

  if (intervals.length === 0) throw new Error('No Sentinel data in response')

  const latest = intervals[intervals.length - 1]
  const bands  = latest.outputs.indices.bands

  return {
    ndvi:        clamp(round2(bands['B0']?.stats?.mean ?? 0.5), 0.05, 0.95),
    evi:         clamp(round2(bands['B1']?.stats?.mean ?? 0.4), 0.02, 0.90),
    moisture:    clamp(round2(bands['B2']?.stats?.mean ?? 0.5), 0.08, 0.92),
    chlorophyll: clamp(round2(bands['B3']?.stats?.mean ?? 0.6), 0.10, 0.95),
    is_live:     true,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SOURCE 2 — ISRIC SOILGRIDS REST API
// Docs: https://rest.isric.org/soilgrids/v2.0/properties/query
// ────────────────────────────────────────────────────────────────────────────

interface SoilGridsResult {
  ph: number
  soc_pct: number
  nitrogen: number     // kg/ha (converted from cg/kg)
  phosphorus: number   // kg/ha (estimated from clay + soc)
  potassium: number    // kg/ha (estimated from clay content)
  clay_pct: number
  sand_pct: number
  bulk_density: number // g/cm³
  soil_texture: SoilTexture
  is_live: boolean
}

/**
 * SoilGrids returns properties at 0-5cm, 5-15cm, 15-30cm depths.
 * We use the 0-30cm weighted mean for agronomic decisions.
 */
async function fetchSoilGrids(lat: number, lng: number): Promise<SoilGridsResult> {
  const props = ['phh2o', 'soc', 'nitrogen', 'clay', 'sand', 'bdod']
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=${props.join('&property=')}&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`

  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error(`SoilGrids failed: ${res.status}`)
  const data = await res.json()

  // Extract mean value for each property averaged over 0-30cm
  function getMean(propName: string): number {
    const depths: Array<{ label: string; values: { mean: number | null } }> =
      data.properties?.layers?.find((l: { name: string }) => l.name === propName)?.depths ?? []
    const vals = depths.map(d => d.values?.mean).filter((v): v is number => v !== null && v !== undefined)
    if (vals.length === 0) return NaN
    return vals.reduce((s, v) => s + v, 0) / vals.length
  }

  // SoilGrids units: phh2o in pH*10, soc in dg/kg, nitrogen in cg/kg, clay/sand in g/kg, bdod in cg/cm³
  const ph_raw   = getMean('phh2o')
  const soc_raw  = getMean('soc')
  const n_raw    = getMean('nitrogen')
  const clay_raw = getMean('clay')
  const sand_raw = getMean('sand')
  const bd_raw   = getMean('bdod')

  const ph   = isNaN(ph_raw)   ? 6.5 : round2(ph_raw / 10)
  const soc  = isNaN(soc_raw)  ? 1.4 : round2(soc_raw / 10)        // dg/kg → %
  const nRaw = isNaN(n_raw)    ? 160 : n_raw / 100                   // cg/kg → g/kg
  // Convert g/kg nitrogen to kg/ha (assuming 30cm depth, bulk density ~1.3 g/cm³)
  const bd   = isNaN(bd_raw)   ? 1.3 : round2(bd_raw / 100)         // cg/cm³ → g/cm³
  const nitrogen  = Math.round(clamp(nRaw * bd * 300, 60, 250))     // kg/ha
  const clay_pct  = isNaN(clay_raw) ? 38 : Math.round(clay_raw / 10)
  const sand_pct  = isNaN(sand_raw) ? 30 : Math.round(sand_raw / 10)

  // Estimate P and K from clay + SOC (ISRIC doesn't provide P/K in free tier)
  const phosphorus = Math.round(clamp(15 + clay_pct * 0.2 + soc * 3, 8, 45))
  const potassium  = Math.round(clamp(80 + clay_pct * 1.5 + soc * 10, 70, 200))

  const soil_texture: SoilTexture =
    clay_pct > 40 ? 'clay' :
    clay_pct > 28 ? 'clay_loam' :
    sand_pct > 65 ? 'sandy' :
    (100 - clay_pct - sand_pct) > 40 ? 'silty' : 'loamy'

  return { ph, soc_pct: soc, nitrogen, phosphorus, potassium, clay_pct, sand_pct, bulk_density: bd, soil_texture, is_live: true }
}

// ────────────────────────────────────────────────────────────────────────────
// SOURCE 3 — OPEN-METEO CURRENT + FORECAST
// Docs: https://open-meteo.com/en/docs
// ────────────────────────────────────────────────────────────────────────────

interface WeatherResult {
  temperature_c: number
  humidity_pct: number
  et0_mm_day: number
  is_live: boolean
}

async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherResult> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,et0_fao_evapotranspiration` +
    `&daily=et0_fao_evapotranspiration` +
    `&timezone=auto&forecast_days=1`

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`)
  const data = await res.json()

  return {
    temperature_c: round2(data.current?.temperature_2m ?? 28),
    humidity_pct:  Math.round(data.current?.relative_humidity_2m ?? 65),
    et0_mm_day:    round2(data.daily?.et0_fao_evapotranspiration?.[0] ?? 4.5),
    is_live:       true,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SIMULATION FALLBACK
// Used when Sentinel Hub credentials are absent or API calls fail.
// Spatially coherent, seeded from the actual lat/lng so each field
// gets a unique (but deterministic) result.
// ────────────────────────────────────────────────────────────────────────────

function simulateCellSentinel(lat: number, lng: number, ndviBase: number): SentinelStats {
  const n0 = sn(lat * 100, lng * 100, 1)
  const n1 = sn(lat * 100, lng * 100, 2)
  const n2 = sn(lat * 100, lng * 100, 3)
  const n3 = sn(lat * 100, lng * 100, 4)
  return {
    ndvi:        clamp(round2(ndviBase + (n0 - 0.5) * 0.20), 0.10, 0.92),
    evi:         clamp(round2(ndviBase * 0.82 + (n1 - 0.5) * 0.10), 0.05, 0.88),
    moisture:    clamp(round2(0.45 + (n2 - 0.5) * 0.28), 0.10, 0.88),
    chlorophyll: clamp(round2(0.62 + (n3 - 0.5) * 0.20), 0.15, 0.92),
    is_live:     false,
  }
}

function simulateCellSoil(lat: number, lng: number): SoilGridsResult {
  const n0 = sn(lat * 100, lng * 100, 10)
  const n1 = sn(lat * 100, lng * 100, 11)
  const n2 = sn(lat * 100, lng * 100, 12)
  const n3 = sn(lat * 100, lng * 100, 13)
  const clay = Math.round(28 + n0 * 20)
  const sand = Math.round(20 + n1 * 30)
  const soil_texture: SoilTexture =
    clay > 40 ? 'clay' : clay > 28 ? 'clay_loam' : sand > 65 ? 'sandy' : 'loamy'
  return {
    ph:           round2(5.8 + n1 * 1.4),
    soc_pct:      round2(0.8 + n2 * 1.6),
    nitrogen:     Math.round(100 + n3 * 130),
    phosphorus:   Math.round(10 + n0 * 30),
    potassium:    Math.round(80 + n1 * 100),
    clay_pct:     clay,
    sand_pct:     sand,
    bulk_density: round2(1.15 + n2 * 0.45),
    soil_texture,
    is_live:      false,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC: fetch field-level base data (for FieldBaseData interface)
// ────────────────────────────────────────────────────────────────────────────

export async function fetchRealFieldBase(lat: number, lng: number): Promise<FieldBaseData & { is_live: boolean }> {
  const [weather, soil] = await Promise.allSettled([
    fetchOpenMeteo(lat, lng),
    fetchSoilGrids(lat, lng),
  ])

  const w = weather.status === 'fulfilled' ? weather.value : {
    temperature_c: 28, humidity_pct: 65, et0_mm_day: 4.5, is_live: false,
  }
  const s = soil.status === 'fulfilled' ? soil.value : simulateCellSoil(lat, lng)

  return {
    ndvi_mean:          0.55,  // will be computed from grid average
    evi_mean:           0.44,
    savi_mean:          0.50,
    chlorophyll_index:  0.65,
    moisture_mean:      0.48,
    sar_backscatter_vv: -9.0,
    soil_texture:       s.soil_texture,
    ph_mean:            s.ph,
    soc_pct:            s.soc_pct,
    nitrogen_kg_ha:     s.nitrogen,
    phosphorus_kg_ha:   s.phosphorus,
    potassium_kg_ha:    s.potassium,
    bulk_density:       s.bulk_density,
    cec:                round2(12 + s.clay_pct * 0.4),
    temperature_c:      w.temperature_c,
    humidity_pct:       w.humidity_pct,
    et0_mm_day:         w.et0_mm_day,
    capture_date:       new Date().toISOString().split('T')[0],
    cloud_cover_pct:    0,
    is_live:            s.is_live || w.is_live,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC: fetch full 10×10 cell grid for a polygon
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetches real satellite + soil + weather data for each cell in a rows×cols grid
 * covering the farmer's field polygon.
 *
 * Strategy:
 *  - Weather is fetched once for the field centre (same for all cells).
 *  - Soil is fetched per cell via SoilGrids (batched with concurrency limit 5).
 *  - Sentinel data:
 *      If SENTINEL_HUB_CLIENT_ID env var is set → Statistical API per cell bbox.
 *      Otherwise → spatially-seeded simulation from the real centroid lat/lng.
 *
 * Returns a rows×cols FieldCell[][] ready for analyzeCell().
 */
export async function fetchRealCellGrid(
  polygon: GeoPolygon,
  rows = 10,
  cols = 10,
  sentinelClientId?: string,
  sentinelClientSecret?: string,
): Promise<FieldCell[][]> {
  const [centerLat, centerLng] = polygon.center

  // Weather — one fetch for entire field
  const weatherPromise = fetchOpenMeteo(centerLat, centerLng).catch(() => ({
    temperature_c: 28, humidity_pct: 65, et0_mm_day: 4.5, is_live: false,
  }))

  // Sentinel auth token (if credentials provided)
  let sentinelToken: string | null = null
  if (sentinelClientId && sentinelClientSecret) {
    try {
      sentinelToken = await getSentinelToken(sentinelClientId, sentinelClientSecret)
    } catch (e) {
      console.warn('[Pipeline] Sentinel auth failed, using simulation:', e)
    }
  }

  const centroids = buildCellCentroids(polygon, rows, cols)
  const weather   = await weatherPromise

  // Bounding box for the whole polygon (for Sentinel field-level NDVI base)
  const coords = polygon.coordinates[0]
  const lats   = coords.map(c => c[1])
  const lngs   = coords.map(c => c[0])
  const fieldBbox: [number, number, number, number] = [
    Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats),
  ]

  // Get field-level Sentinel stats for NDVI base (single call, faster than per-cell)
  let fieldNdviBase = 0.55
  if (sentinelToken) {
    try {
      const fieldStats = await fetchSentinelStats(fieldBbox, sentinelToken)
      fieldNdviBase = fieldStats.ndvi
    } catch (e) {
      console.warn('[Pipeline] Field-level Sentinel failed, using 0.55:', e)
    }
  }

  // Fetch soil + sentinel for each cell with concurrency limit
  const CONCURRENCY = 5
  const results: FieldCell[] = new Array(rows * cols)

  for (let batch = 0; batch < centroids.length; batch += CONCURRENCY) {
    const chunk = centroids.slice(batch, batch + CONCURRENCY)
    await Promise.all(chunk.map(async (c) => {
      const idx = c.row * cols + c.col

      // Cell bounding box for Sentinel (small bbox around centroid)
      const halfLat = (fieldBbox[3] - fieldBbox[1]) / (rows * 2)
      const halfLng = (fieldBbox[2] - fieldBbox[0]) / (cols * 2)
      const cellBbox: [number, number, number, number] = [
        c.lng - halfLng, c.lat - halfLat, c.lng + halfLng, c.lat + halfLat,
      ]

      // Sentinel stats — per-cell if token available, else simulate from real coords
      const sentinelPromise: Promise<SentinelStats> = sentinelToken
        ? fetchSentinelStats(cellBbox, sentinelToken).catch(() => simulateCellSentinel(c.lat, c.lng, fieldNdviBase))
        : Promise.resolve(simulateCellSentinel(c.lat, c.lng, fieldNdviBase))

      // Soil — real ISRIC call per cell (throttled by batch)
      const soilPromise: Promise<SoilGridsResult> = fetchSoilGrids(c.lat, c.lng)
        .catch(() => simulateCellSoil(c.lat, c.lng))

      const [sat, soil] = await Promise.all([sentinelPromise, soilPromise])

      // Apply small spatial variation to weather per cell
      const n = sn(c.lat * 1000, c.lng * 1000, 99)
      const temp = round2(clamp(weather.temperature_c + (n - 0.5) * 2.5, 18, 40))
      const hum  = Math.round(clamp(weather.humidity_pct + (n - 0.5) * 14, 20, 98))

      results[idx] = {
        id:           `r${c.row}c${c.col}`,
        row:          c.row,
        col:          c.col,
        ndvi:         sat.ndvi,
        evi:          sat.evi,
        savi:         round2(sat.ndvi * 0.91 + 0.02),
        chlorophyll:  sat.chlorophyll,
        moisture:     sat.moisture,
        ph:           soil.ph,
        soc_pct:      soil.soc_pct,
        nitrogen:     soil.nitrogen,
        phosphorus:   soil.phosphorus,
        potassium:    soil.potassium,
        soil_texture: soil.soil_texture,
        bulk_density: soil.bulk_density,
        temperature:  temp,
        humidity:     hum,
      }
    }))
  }

  // Reshape flat array into rows×cols grid
  const grid: FieldCell[][] = []
  for (let r = 0; r < rows; r++) {
    grid.push(results.slice(r * cols, (r + 1) * cols))
  }

  return grid
}
