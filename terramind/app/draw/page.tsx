'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Leaf, Trash2, MapPin, ChevronRight, X, Info } from 'lucide-react'
import { usePipelineStore } from '@/lib/pipelineStore'

// ── Types ─────────────────────────────────────────────────────────────
type LatLng = [number, number] // [lat, lng]

// ── Area calculation (Shoelace → acres) ───────────────────────────────
function calculateArea(coords: LatLng[]): number {
  if (coords.length < 3) return 0
  let area = 0
  const n = coords.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += coords[i][1] * coords[j][0] // lng * lat_next
    area -= coords[j][1] * coords[i][0]
  }
  area = Math.abs(area) / 2
  // degrees² → m² → acres (at ~10.8° N latitude)
  const LAT_DEG_M = 111320
  const LNG_DEG_M = 111320 * Math.cos(10.787 * (Math.PI / 180))
  return parseFloat(((area * LAT_DEG_M * LNG_DEG_M) / 4047).toFixed(2))
}

function calcCenter(coords: LatLng[]): LatLng {
  if (coords.length === 0) return [10.787, 79.139]
  const lat = coords.reduce((s, c) => s + c[0], 0) / coords.length
  const lng = coords.reduce((s, c) => s + c[1], 0) / coords.length
  return [lat, lng]
}

// ── Map component (client-only, loaded dynamically) ───────────────────
interface MapDrawProps {
  points:    LatLng[]
  closed:    boolean
  onAddPoint:  (latlng: LatLng) => void
  onCloseClick: () => void
}

// This component imports Leaflet and renders the map.
// It's imported with ssr:false below.
function MapDrawInner({ points, closed, onAddPoint, onCloseClick }: MapDrawProps) {
  // We can safely import here because this module is never server-rendered.
  const { MapContainer, TileLayer, useMapEvents, Polyline, Polygon, CircleMarker } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-leaflet') as typeof import('react-leaflet')

  // Fix default marker icons (Next.js SSR strips _getIconUrl)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require('leaflet') as typeof import('leaflet')
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl:       '/leaflet/marker-icon.png',
      shadowUrl:     '/leaflet/marker-shadow.png',
    })
  }, [])

  // Click handler inside map
  function ClickHandler() {
    useMapEvents({
      click(e) {
        if (closed) return
        const pt: LatLng = [e.latlng.lat, e.latlng.lng]

        // If clicking near first point (within ~10m) → close
        if (points.length >= 3) {
          const dy = (pt[0] - points[0][0]) * 111320
          const dx = (pt[1] - points[0][1]) * 111320 * Math.cos(pt[0] * Math.PI / 180)
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            onCloseClick()
            return
          }
        }
        onAddPoint(pt)
      },
    })
    return null
  }

  // Build polyline path: open or closed
  const linePts: LatLng[] =
    points.length >= 2 ? [...points, ...(closed ? [points[0]] : [])] : points

  return (
    <MapContainer
      center={[10.787, 79.139]}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      {/* Google Satellite tiles */}
      <TileLayer
        url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3'] as unknown as string}
        maxZoom={21}
        attribution="Imagery © Google"
      />

      <ClickHandler />

      {/* Polygon fill when closed */}
      {closed && points.length >= 3 && (
        <Polygon
          positions={points}
          pathOptions={{
            color:       '#2a6fdb',
            weight:      2.5,
            fillColor:   '#2a6fdb',
            fillOpacity: 0.25,
          }}
        />
      )}

      {/* Edge lines (open drawing) */}
      {!closed && linePts.length >= 2 && (
        <Polyline
          positions={linePts}
          pathOptions={{ color: '#2a6fdb', weight: 2.5, dashArray: '6 4' }}
        />
      )}

      {/* Vertices */}
      {points.map((pt, i) => (
        <CircleMarker
          key={i}
          center={pt}
          radius={i === 0 ? 8 : 5}
          pathOptions={{
            color:       i === 0 ? '#fff' : '#2a6fdb',
            weight:      i === 0 ? 2.5 : 1.5,
            fillColor:   i === 0 ? '#2a6fdb' : '#60a5fa',
            fillOpacity: 1,
          }}
        />
      ))}
    </MapContainer>
  )
}

// SSR-safe wrapper
const MapDraw = dynamic(
  () => Promise.resolve(MapDrawInner),
  { ssr: false, loading: () => <MapLoadingShell /> }
)

function MapLoadingShell() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a1628]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-[#2a6fdb]" />
        <p className="font-mono text-xs text-slate-500 tracking-widest">LOADING MAP…</p>
      </div>
    </div>
  )
}

// ── Hint overlay ──────────────────────────────────────────────────────
function HintBanner({ points, closed }: { points: LatLng[]; closed: boolean }) {
  if (closed) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-blue-800/50 bg-[#0D1B2A]/88 px-4 py-2.5 backdrop-blur-md">
        <Info size={13} className="shrink-0 text-blue-400" />
        <p className="text-xs text-slate-300">
          {points.length === 0
            ? 'Click on the map to start drawing your field boundary'
            : points.length < 3
            ? `Add ${3 - points.length} more point${3 - points.length > 1 ? 's' : ''} to form a polygon`
            : 'Click first point (white circle) or "Close Polygon" to finish'}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────
export default function DrawPage() {
  const router = useRouter()

  const [points,    setPoints]    = useState<LatLng[]>([])
  const [closed,    setClosed]    = useState(false)

  const area   = calculateArea(points)
  const center = calcCenter(points)
  const canAnalyze = closed && points.length >= 3

  const addPoint = useCallback((latlng: LatLng) => {
    setPoints(prev => [...prev, latlng])
  }, [])

  const closePolygon = useCallback(() => {
    if (points.length >= 3) setClosed(true)
  }, [points.length])

  const clearAll = useCallback(() => {
    setPoints([])
    setClosed(false)
  }, [])

  // ── INSTANT NAVIGATE — no API calls here ────────────────────────────
  const analyze = useCallback(() => {
    if (!canAnalyze) return

    const payload = {
      type:        'Polygon' as const,
      coordinates: [points.map(([lat, lng]) => [lng, lat] as [number, number])],
      center:      center as [number, number],
      area_acres:  area,
    }

    // Store polygon so the field page can read it on mount
    localStorage.setItem('farm_polygon', JSON.stringify(payload))

    // Clear any stale pipeline result so the field page knows to re-fetch
    // (import is at the top of the file — pipelineStore)
    usePipelineStore.getState().clear()

    // Navigate instantly — /field will fetch data in the background
    router.push('/field')
  }, [canAnalyze, points, area, center, router])

  // Load leaflet CSS client-side only
  useEffect(() => {
    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    return () => { document.head.removeChild(link) }
  }, [])

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0D1B2A]">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="z-20 flex shrink-0 items-center gap-4 border-b border-white/5 bg-[#0D1B2A]/95 px-5 py-3 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2a6fdb] to-[#1a4fa0]">
            <Leaf size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold tracking-tight text-white">TerraMind</span>
            <p className="text-[10px] text-slate-500 -mt-0.5">AI Precision Agriculture</p>
          </div>
        </div>

        <div className="mx-4 h-5 w-px bg-white/10" />

        <div>
          <h1 className="text-sm font-semibold text-white">Draw Your Field</h1>
          <p className="text-[10px] text-slate-500">Tap map to place boundary points</p>
        </div>

        <div className="flex-1" />

        {/* Step indicators */}
        {(['Place Points', 'Close Polygon', 'Analyze'] as const).map((step, i) => {
          const done =
            i === 0 ? points.length >= 3 :
            i === 1 ? closed :
            canAnalyze
          return (
            <div key={step} className="hidden items-center gap-1.5 sm:flex">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                done ? 'bg-[#2a6fdb] text-white' : 'border border-white/15 text-slate-600'
              }`}>
                {i + 1}
              </div>
              <span className={`text-[11px] ${done ? 'text-slate-300' : 'text-slate-600'}`}>{step}</span>
              {i < 2 && <ChevronRight size={12} className="text-slate-700" />}
            </div>
          )
        })}
      </header>

      {/* ── MAP ────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <MapDraw
          points={points}
          closed={closed}
          onAddPoint={addPoint}
          onCloseClick={closePolygon}
        />
        <HintBanner points={points} closed={closed} />

        {/* Point count badge */}
        {points.length > 0 && (
          <div className="pointer-events-none absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-lg border border-blue-800/40 bg-[#0D1B2A]/90 px-3 py-1.5 backdrop-blur-sm">
            <MapPin size={12} className="text-blue-400" />
            <span className="text-xs text-slate-300">
              <span className="font-semibold text-white">{points.length}</span> vertices
            </span>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ─────────────────────────────────────────────── */}
      <footer className="z-20 shrink-0 border-t border-white/[0.06] bg-[#0D1B2A]/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest text-slate-600">Area</p>
              <p className="text-sm font-bold text-white">
                {points.length >= 3 ? `${area} ac` : '—'}
              </p>
            </div>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest text-slate-600">Points</p>
              <p className="text-sm font-bold text-white">{points.length}</p>
            </div>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest text-slate-600">Status</p>
              <p className={`text-xs font-semibold ${closed ? 'text-green-400' : points.length > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                {closed ? 'Closed ✓' : points.length > 0 ? 'Drawing…' : 'Waiting'}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Clear */}
            <button
              onClick={clearAll}
              disabled={points.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 transition-all hover:border-red-900/60 hover:bg-red-950/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={13} />
              Clear
            </button>

            {/* Close Polygon */}
            {!closed && points.length >= 3 && (
              <button
                onClick={closePolygon}
                className="flex items-center gap-1.5 rounded-lg border border-blue-700/50 bg-blue-950/40 px-3 py-2 text-xs text-blue-300 transition-all hover:bg-blue-900/40"
              >
                <X size={13} />
                Close Polygon
              </button>
            )}

            {/* Analyze CTA — instant navigation, no API blocking */}
            <button
              onClick={analyze}
              disabled={!canAnalyze}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                canAnalyze
                  ? 'bg-gradient-to-r from-[#2a6fdb] to-[#1a4fa0] text-white shadow-lg shadow-blue-900/30 hover:from-[#3a7fea] hover:to-[#2359b8]'
                  : 'cursor-not-allowed bg-white/5 text-slate-600'
              }`}
            >
              Analyze My Field
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Coordinates preview */}
        {closed && (
          <div className="border-t border-white/[0.04] px-4 py-1.5">
            <p className="font-mono text-[10px] text-slate-600">
              Center: {center[0].toFixed(5)}° N · {center[1].toFixed(5)}° E
              {' · '}Vertices: {points.length}
              {' · '}Area: {area} acres
            </p>
          </div>
        )}
      </footer>
    </main>
  )
}

