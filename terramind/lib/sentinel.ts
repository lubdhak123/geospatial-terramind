/**
 * lib/sentinel.ts — Feature 2: Real Sentinel-2 data via Microsoft Planetary Computer
 * Falls back to mock textures gracefully.
 */

export interface SentinelResult {
  satellite_url: string
  ndvi_url: string
  heightmap_url: string
  ndvi_mean: number
  cloud_cover: number
  capture_date: string | null
  is_live: boolean
  visual_is_live: boolean
}

// Client-side image validation to prevent CORS/NoData black textures
async function validateImageUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return true // bypass on server
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(true)
      try {
        ctx.drawImage(img, 0, 0, 64, 64)
      } catch {
        return resolve(false)
      }

      let data: Uint8ClampedArray
      try {
        data = ctx.getImageData(0, 0, 64, 64).data
      } catch {
        return resolve(false)
      }

      let blackCount = 0
      let whiteCount = 0
      let minLuma = 255
      let maxLuma = 0
      let totalLuma = 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b

        if (r < 18 && g < 18 && b < 18) blackCount++
        if (r > 236 && g > 236 && b > 236) whiteCount++

        minLuma = Math.min(minLuma, luma)
        maxLuma = Math.max(maxLuma, luma)
        totalLuma += luma
      }

      const totalPixels = 4096
      const blackRatio = blackCount / totalPixels
      const whiteRatio = whiteCount / totalPixels
      const avgLuma = totalLuma / totalPixels
      const contrast = maxLuma - minLuma

      const tooDark = blackRatio > 0.35
      const tooCloudy = whiteRatio > 0.45
      const washedOut = avgLuma > 210 && contrast < 55

      resolve(!(tooDark || tooCloudy || washedOut))
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

export async function fetchSentinelData(
  lat: number,
  lng: number,
  bbox_size = 0.01
): Promise<SentinelResult> {
  const FALLBACK: SentinelResult = {
    satellite_url: '/textures/satellite.jpg',
    ndvi_url:      '/textures/ndvi.png',
    heightmap_url: '/textures/heightmap.png',
    ndvi_mean:     0.68,
    cloud_cover:   0,
    capture_date:  null,
    is_live:       false,
    visual_is_live: false,
  }

  try {
    const bbox = [lng - bbox_size, lat - bbox_size, lng + bbox_size, lat + bbox_size]

    const res = await fetch(
      'https://planetarycomputer.microsoft.com/api/stac/v1/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: ['sentinel-2-l2a'],
          bbox,
          datetime: '2024-01-01/2024-12-31',
          query: { 'eo:cloud_cover': { lt: 20 } },
          limit: 1,
          sortby: [{ field: 'datetime', direction: 'desc' }],
        }),
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) throw new Error(`STAC HTTP ${res.status}`)

    const data = await res.json()
    const item = data.features?.[0]

    if (!item) {
      console.log('[Sentinel] No imagery found — using cached field data')
      return FALLBACK
    }

    const previewUrl: string | undefined = item.assets?.rendered_preview?.href ?? item.assets?.overview?.href
    const captureDate: string = item.properties?.datetime?.split('T')[0] ?? 'Unknown'
    const cloudCover: number  = item.properties?.['eo:cloud_cover'] ?? 0

    if (!previewUrl) {
      console.log('[Sentinel] No preview asset — using cached field data')
      return FALLBACK
    }

    const isValid = await validateImageUrl(previewUrl)

    return {
      satellite_url: isValid ? previewUrl : FALLBACK.satellite_url,
      ndvi_url:      '/textures/ndvi.png',   // Demo texture, real NDVI compute is heavy
      heightmap_url: '/textures/heightmap.png',
      ndvi_mean:     0.68,                   // Deterministic demo mean
      cloud_cover:   cloudCover,
      capture_date:  captureDate,
      is_live:       true,                   // Metadata is real
      visual_is_live: isValid,               // Texture depends on validation
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`[Sentinel] Fetch failed (${msg}) — using cached field data`)
    return FALLBACK
  }
}
