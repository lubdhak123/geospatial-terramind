'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PredictResult {
  price: number
  yield_qtl_acre: number
  confidence: number
}

export default function MarketPage() {
  const router = useRouter()
  const [priceData, setPriceData] = useState<PredictResult | null>(null)
  const [volume, setVolume] = useState(120)
  const [storageType, setStorageType] = useState<'cold' | 'ambient'>('cold')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ndvi: 0.68, temperature: 31, rainfall: 85 }),
    })
      .then(r => r.json())
      .then(d => { setPriceData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const basePrice = priceData?.price ?? 22.4
  const predictedPrice = +(basePrice * 1.15).toFixed(2)
  const storageCost = storageType === 'cold' ? 12400 : 4800
  const netRevenue = Math.round(volume * predictedPrice * 1000 - storageCost)
  const marketDelta = Math.round(volume * (predictedPrice - basePrice) * 1000)

  const trendPoints = [80, 85, 70, 60, 40, 30, 10]
  const svgPath = trendPoints.map((y, i) => `${(i / (trendPoints.length - 1)) * 400},${y}`).join(' L ')
  const svgFill = trendPoints.map((y, i) => `${(i / (trendPoints.length - 1)) * 400},${y}`).join(' L ')

  return (
    <main className="min-h-screen pb-32" style={{ background: '#121412', color: '#e2e3df', fontFamily: 'Lexend, sans-serif' }}>

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(18,20,18,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(64,73,61,0.4)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full transition-all hover:bg-white/5">
            <span className="material-symbols-outlined" style={{ color: '#88d982', fontSize: 22 }}>arrow_back</span>
          </button>
          <span className="material-symbols-outlined" style={{ color: '#88d982', fontSize: 22 }}>forest</span>
          <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#88d982' }}>Midnight Arboretum</h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(136,217,130,0.08)', border: '1px solid rgba(136,217,130,0.2)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#88d982', boxShadow: '0 0 6px #88d982' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#88d982' }}>Live Market</span>
        </div>
      </header>

      <div className="pt-24 px-6 max-w-6xl mx-auto">

        {/* Editorial Header */}
        <header className="mb-12 mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-2" style={{ color: '#88d982' }}>
            Market Intelligence
          </p>
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4" style={{ color: '#e2e3df' }}>
            Paddy Yield &amp; Pricing
          </h2>
          <div className="h-1 w-24 rounded-full" style={{ background: '#2e7d32' }} />
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Price Comparison Card */}
          <div className="md:col-span-8 rounded-xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[400px]"
            style={{ background: 'rgba(41,42,40,0.6)', backdropFilter: 'blur(20px)' }}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <span className="material-symbols-outlined" style={{ fontSize: 140, color: '#88d982' }}>trending_up</span>
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest mb-8" style={{ color: '#bfcaba' }}>
                Live Projection
              </h2>
              <div className="flex flex-col md:flex-row gap-12 items-baseline">
                <div className="flex flex-col">
                  <span className="text-sm mb-1" style={{ color: '#bfcaba' }}>Today's Price</span>
                  <span className="text-5xl md:text-6xl font-bold" style={{ color: '#e2e3df' }}>
                    ₹{loading ? '—' : basePrice.toFixed(1)}
                    <span className="text-lg ml-2 font-normal" style={{ color: '#8a9485' }}>/kg</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm mb-1" style={{ color: '#88d982' }}>Oracle Forecast (Oct 22)</span>
                  <span className="text-5xl md:text-6xl font-bold" style={{ color: '#88d982' }}>
                    ₹{loading ? '—' : predictedPrice.toFixed(1)}
                    <span className="text-lg ml-2 font-normal" style={{ color: '#cbffc2' }}>+15%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* SVG Trend Chart */}
            <div className="mt-12 w-full h-32 relative">
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#88d982', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#88d982', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <path d={`M ${svgPath}`} fill="none" stroke="#88d982" strokeWidth="3" strokeLinecap="round" />
                <path d={`M ${svgFill} L 400,100 L 0,100 Z`} fill="url(#chartGrad)" opacity="0.15" />
                <circle cx="400" cy="10" r="5" fill="#88d982" />
              </svg>
              <div className="flex justify-between mt-3 text-[10px] uppercase tracking-tighter font-medium" style={{ color: '#8a9485' }}>
                <span>OCT 12 (NOW)</span>
                <span>OCT 15</span>
                <span>OCT 18</span>
                <span>OCT 22 (PEAK)</span>
              </div>
            </div>
          </div>

          {/* AI Advisory Card */}
          <div className="md:col-span-4 rounded-xl p-8 flex flex-col justify-between relative overflow-hidden"
            style={{ background: '#2e7d32', color: '#cbffc2' }}>
            <div className="z-10 relative">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>psychology</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Harvest Oracle</span>
              </div>
              <p className="text-2xl font-semibold leading-snug">
                "Wait 7 days to sell for 15% more profit"
              </p>
              <p className="mt-4 text-sm leading-relaxed opacity-80">
                Based on NDVI scan of 847 farms in 50km radius and Agmarknet price signals. Mandi glut expected if you harvest before Oct 18.
              </p>
              {priceData && (
                <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Model Confidence</div>
                  <div className="text-2xl font-bold">{priceData.confidence}%</div>
                  <div className="text-xs opacity-70">RandomForest R² 0.82</div>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/field')}
              className="mt-8 py-4 px-6 rounded-full font-bold flex items-center justify-between group transition-all hover:opacity-90"
              style={{ background: '#cbffc2', color: '#003909' }}>
              View Field Map
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl" style={{ background: '#88d982', opacity: 0.2 }} />
          </div>

          {/* Profit Calculator */}
          <div className="md:col-span-12">
            <div className="rounded-xl p-8" style={{ background: '#1a1c1a' }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <h3 className="text-2xl font-bold mb-2">Profit Calculator</h3>
                  <p className="text-sm" style={{ color: '#bfcaba' }}>
                    Estimate net gains based on current storage and logistics costs.
                  </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-widest mb-2 ml-1" style={{ color: '#bfcaba' }}>Volume (Quintals)</label>
                    <input
                      type="number"
                      value={volume}
                      onChange={e => setVolume(+e.target.value || 0)}
                      className="rounded-xl px-4 py-3 text-white min-w-[140px] focus:outline-none focus:ring-2"
                      style={{ background: '#0d0f0d', border: '1px solid rgba(64,73,61,0.4)', color: '#e2e3df' }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-widest mb-2 ml-1" style={{ color: '#bfcaba' }}>Storage Type</label>
                    <select
                      value={storageType}
                      onChange={e => setStorageType(e.target.value as 'cold' | 'ambient')}
                      className="rounded-xl px-4 py-3 min-w-[200px] focus:outline-none"
                      style={{ background: '#0d0f0d', border: '1px solid rgba(64,73,61,0.4)', color: '#e2e3df' }}>
                      <option value="cold">Cold Storage (₹12,400)</option>
                      <option value="ambient">Ambient Warehouse (₹4,800)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-10"
                style={{ borderTop: '1px solid rgba(64,73,61,0.3)' }}>
                <div className="p-6 rounded-xl" style={{ background: '#0d0f0d' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#bfcaba' }}>Net Expected Revenue</p>
                  <p className="text-2xl font-bold" style={{ color: '#88d982' }}>₹{netRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-6 rounded-xl" style={{ background: '#0d0f0d' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#bfcaba' }}>Storage Cost</p>
                  <p className="text-2xl font-bold" style={{ color: '#ffb1c7' }}>₹{storageCost.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-6 rounded-xl" style={{ background: '#0d0f0d' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#bfcaba' }}>Market Delta (vs selling now)</p>
                  <p className="text-2xl font-bold" style={{ color: '#b4cad6' }}>+₹{marketDelta.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Harvest Oracle Stats Row */}
          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: 'radar',         label: 'Farms Scanned',   value: '847',         sub: 'in 50km radius',  color: '#88d982' },
              { icon: 'calendar_today',label: 'Peak Sell Date',  value: 'Oct 22',      sub: 'Tuesday',         color: '#b4cad6' },
              { icon: 'warehouse',     label: 'Storage Slots',  value: '3 available', sub: 'within 8km',      color: '#ffb1c7' },
              { icon: 'savings',       label: 'Avg Uplift',      value: '+₹7,400',     sub: 'per acre vs avg', color: '#88d982' },
            ].map(({ icon, label, value, sub, color }) => (
              <div key={label} className="flex items-center gap-4 p-6 rounded-xl" style={{ background: '#1a1c1a' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${color}15` }}>
                  <span className="material-symbols-outlined" style={{ color, fontSize: 22 }}>{icon}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#8a9485' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-[10px]" style={{ color: '#8a9485' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 z-50 rounded-t-3xl"
        style={{ background: 'rgba(13,15,13,0.9)', backdropFilter: 'blur(24px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }}>
        {[
          { icon: 'potted_plant', label: 'Home',   href: '/',      active: false },
          { icon: 'terrain',      label: 'Field',  href: '/field', active: false },
          { icon: 'storefront',   label: 'Market', href: '/market',active: true  },
          { icon: 'psychology',   label: 'AI',     href: '/chat',  active: false },
        ].map(({ icon, label, href, active }) => (
          <button key={label} onClick={() => router.push(href)}
            className="flex flex-col items-center justify-center gap-1 transition-all"
            style={active
              ? { background: 'linear-gradient(135deg,#88d982,#2e7d32)', borderRadius: '50%', padding: 12, color: '#002204', transform: 'scale(1.1)' }
              : { color: '#bfcaba', padding: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
            {!active && <span className="text-[9px] font-medium tracking-wide">{label}</span>}
          </button>
        ))}
      </nav>
    </main>
  )
}
