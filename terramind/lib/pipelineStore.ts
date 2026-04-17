/**
 * lib/pipelineStore.ts
 *
 * Zustand store that holds the result of a real /api/analyze-field call.
 * Persisted to localStorage so it survives page navigation between /draw → /field.
 *
 * Usage:
 *   // In draw page — after API response:
 *   usePipelineStore.getState().setResult(data)
 *
 *   // In field page / TerrainScene:
 *   const grid = usePipelineStore(s => s.result?.grid)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnalyzedCell, FieldBaseData } from './fieldDataEngine'

export interface PipelineResult {
  grid:         AnalyzedCell[][]
  base:         FieldBaseData & { is_live: boolean }
  is_live:      boolean
  capture_date: string
  stats: {
    avg_ndvi:       number
    avg_moisture:   number
    avg_yield:      number
    critical_cells: number
    dry_cells:      number
    disease_cells:  number
  }
  /** GeoJSON center stored so field page knows the real location */
  center:       [number, number]   // [lat, lng]
  area_acres:   number
}

export type LoadingStage =
  | 'navigating'
  | 'fetching_satellite'
  | 'fetching_soil'
  | 'computing_grid'
  | 'running_models'
  | 'done'

interface PipelineStore {
  result:       PipelineResult | null
  loading:      boolean
  stage:        LoadingStage | null
  error:        string | null
  /** Hash of the polygon that produced the cached result */
  polygonHash:  string | null
  setResult:    (r: PipelineResult) => void
  setLoading:   (v: boolean) => void
  setStage:     (s: LoadingStage | null) => void
  setError:     (e: string | null) => void
  setPolygonHash: (h: string | null) => void
  clear:        () => void
}

/**
 * Produce a fast, deterministic hash of a polygon payload so we can
 * skip re-fetching when the user navigates back to the same field.
 */
export function hashPolygon(payload: {
  coordinates: [number, number][][]
  center: [number, number]
  area_acres: number
}): string {
  const key = `${payload.center[0].toFixed(6)}_${payload.center[1].toFixed(6)}_${payload.area_acres}_${payload.coordinates[0]?.length ?? 0}`
  // Simple numeric hash (DJB2)
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0
  }
  return `poly_${Math.abs(h).toString(36)}`
}

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set) => ({
      result:      null,
      loading:     false,
      stage:       null,
      error:       null,
      polygonHash: null,
      setResult:   (r) => set({ result: r, loading: false, stage: 'done', error: null }),
      setLoading:  (v) => set({ loading: v }),
      setStage:    (s) => set({ stage: s }),
      setError:    (e) => set({ error: e, loading: false, stage: null }),
      setPolygonHash: (h) => set({ polygonHash: h }),
      clear:       ()  => set({ result: null, error: null, loading: false, stage: null, polygonHash: null }),
    }),
    {
      name:    'terramind-pipeline',   // localStorage key
      // Only persist the result + polygon hash, not loading/error transient state
      partialize: (s) => ({ result: s.result, polygonHash: s.polygonHash }),
    }
  )
)
