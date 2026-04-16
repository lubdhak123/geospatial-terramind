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

interface PipelineStore {
  result:    PipelineResult | null
  loading:   boolean
  error:     string | null
  setResult: (r: PipelineResult) => void
  setLoading:(v: boolean) => void
  setError:  (e: string | null) => void
  clear:     () => void
}

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set) => ({
      result:    null,
      loading:   false,
      error:     null,
      setResult: (r) => set({ result: r, loading: false, error: null }),
      setLoading:(v) => set({ loading: v }),
      setError:  (e) => set({ error: e, loading: false }),
      clear:     ()  => set({ result: null, error: null, loading: false }),
    }),
    {
      name:    'terramind-pipeline',   // localStorage key
      // Only persist the result, not loading/error transient state
      partialize: (s) => ({ result: s.result }),
    }
  )
)
