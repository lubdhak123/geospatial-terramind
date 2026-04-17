/**
 * app/api/analyze-field/route.ts
 *
 * POST /api/analyze-field
 *
 * Body: {
 *   type:         'Polygon',
 *   coordinates:  [[[lng, lat], ...]],   // GeoJSON ring
 *   center:       [lat, lng],
 *   area_acres:   number,
 * }
 *
 * Response: {
 *   grid:         AnalyzedCell[][],      // 10×10
 *   base:         FieldBaseData,
 *   is_live:      boolean,
 *   capture_date: string,
 *   stats: {
 *     avg_ndvi, avg_moisture, avg_yield,
 *     critical_cells, dry_cells, disease_cells
 *   }
 * }
 *
 * Environment variables (optional — falls back to simulation if absent):
 *   SENTINEL_HUB_CLIENT_ID
 *   SENTINEL_HUB_CLIENT_SECRET
 *
 * Both ISRIC SoilGrids and Open-Meteo are called unconditionally (no key needed).
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchRealCellGrid, fetchRealFieldBase, type GeoPolygon } from '@/lib/realFieldPipeline'
import { analyzeCell } from '@/lib/fieldDataEngine'
import type { AnalyzedCell } from '@/lib/fieldDataEngine'

export const runtime = 'nodejs'      // needs node fetch + env vars
export const maxDuration = 60        // SoilGrids can be slow; allow 60s

export async function POST(req: NextRequest) {
  let body: GeoPolygon

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.coordinates || !body?.center) {
    return NextResponse.json({ error: 'Missing coordinates or center' }, { status: 400 })
  }

  const [centerLat, centerLng] = body.center
  const clientId     = process.env.SENTINEL_HUB_CLIENT_ID
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET

  console.log(`[analyze-field] Request: center=(${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}) area=${body.area_acres}ac sentinel=${!!clientId}`)

  try {
    // ── 1. Fetch field-level base (weather + soil for centre) ──
    const base = await fetchRealFieldBase(centerLat, centerLng)

    // ── 2. Fetch 10×10 cell grid (satellite + soil + weather per cell) ──
    const rawGrid = await fetchRealCellGrid(body, 10, 10, clientId, clientSecret)

    // ── 3. Run full 7-problem analysis engine on every cell ──
    const analyzedGrid: AnalyzedCell[][] = rawGrid.map(row =>
      row.map(cell => ({ ...cell, analysis: analyzeCell(cell) }))
    )

    // ── 4. Update base with real grid averages ──
    const flat = analyzedGrid.flat()
    const avg  = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100

    base.ndvi_mean         = avg(flat.map(c => c.ndvi))
    base.evi_mean          = avg(flat.map(c => c.evi))
    base.moisture_mean     = avg(flat.map(c => c.moisture))
    base.nitrogen_kg_ha    = Math.round(avg(flat.map(c => c.nitrogen)))
    base.phosphorus_kg_ha  = Math.round(avg(flat.map(c => c.phosphorus)))
    base.potassium_kg_ha   = Math.round(avg(flat.map(c => c.potassium)))
    base.ph_mean           = avg(flat.map(c => c.ph))
    base.temperature_c     = avg(flat.map(c => c.temperature))
    base.humidity_pct      = Math.round(avg(flat.map(c => c.humidity)))

    // ── 5. Build stats summary ──
    const stats = {
      avg_ndvi:       base.ndvi_mean,
      avg_moisture:   base.moisture_mean,
      avg_yield:      avg(flat.map(c => c.analysis.yield_qtl_acre)),
      critical_cells: flat.filter(c => c.analysis.health_status === 'critical').length,
      dry_cells:      flat.filter(c => c.analysis.irrigation_needed).length,
      disease_cells:  flat.filter(c => c.analysis.disease_risk !== 'none').length,
    }

    console.log(`[analyze-field] Done. NDVI=${stats.avg_ndvi} Yield=${stats.avg_yield}qtl live=${base.is_live}`)

    return NextResponse.json({
      grid:         analyzedGrid,
      base,
      is_live:      base.is_live,
      capture_date: base.capture_date,
      stats,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyze-field] Pipeline error:', msg)
    return NextResponse.json({ error: `Pipeline failed: ${msg}` }, { status: 500 })
  }
}
