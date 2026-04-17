'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden pb-24"
      style={{ background: '#121412' }}>

      {/* Verdant blur orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-[150px]" style={{ background: '#2e7d3218', opacity: 0.9 }} />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-[150px]" style={{ background: '#88d98210' }} />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[200px]" style={{ background: '#2e7d3208' }} />
      </div>

      <div className="relative z-10 flex flex-col items-start max-w-2xl w-full px-8">

        {/* Label */}
        <span className="text-xs font-bold uppercase tracking-[0.25em] mb-4" style={{ color: '#88d982' }}>
          Homestead View
        </span>

        {/* Hero headline */}
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight leading-none mb-4" style={{ color: '#e2e3df' }}>
          Terra<span style={{ color: '#88d982' }}>Mind</span>
        </h1>
        <p className="text-lg font-medium mb-2" style={{ color: '#bfcaba' }}>
          AI-Powered 3D Farm Intelligence
        </p>
        <p className="text-sm mb-12" style={{ color: '#8a9485' }}>
          Sentinel-2 satellite · Gemini AI analysis · Live 3D terrain
        </p>

        {/* Feature pill row */}
        <div className="flex flex-wrap gap-3 mb-12">
          {[
            { icon: 'satellite_alt', label: 'Sentinel-2 Satellite' },
            { icon: 'psychology',    label: 'Gemini AI Analysis' },
            { icon: 'terrain',       label: '3D Field Viewer' },
            { icon: 'trending_up',   label: 'Harvest Oracle' },
            { icon: 'water_drop',    label: 'Irrigation AI' },
            { icon: 'credit_score',  label: 'Farmer Loan AI' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(136,217,130,0.06)', border: '1px solid rgba(136,217,130,0.15)', color: '#88d982' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
              <span className="text-[11px] font-semibold tracking-wide">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => router.push('/draw')}
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#88d982,#2e7d32)', color: '#002204' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_location</span>
            Draw My Field
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <button onClick={() => router.push('/field')}
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(46,125,50,0.12)', border: '1px solid rgba(136,217,130,0.25)', color: '#88d982' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>terrain</span>
            View Demo Field
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <button onClick={() => router.push('/market')}
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(180,202,214,0.08)', border: '1px solid rgba(180,202,214,0.2)', color: '#b4cad6' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>storefront</span>
            Market Intel
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <button onClick={() => router.push('/chat')}
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(180,202,214,0.08)', border: '1px solid rgba(180,202,214,0.2)', color: '#b4cad6' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
            AI Assistant
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'rgba(255,177,199,0.08)', border: '1px solid rgba(255,177,199,0.25)', color: '#ffb1c7' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>credit_score</span>
            Loan Eligibility
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Sub-note */}
        <p className="mt-10 text-[11px]" style={{ color: '#40493d' }}>
          Demo · Ravi Kumar's Farm · Thanjavur, Tamil Nadu · Rice (Samba)
        </p>
      </div>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 z-50 rounded-t-3xl"
        style={{ background: 'rgba(13,15,13,0.85)', backdropFilter: 'blur(24px)', boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }}>
        {[
          { icon: 'potted_plant', label: 'Home',      href: '/',       active: true  },
          { icon: 'terrain',      label: 'Field',     href: '/field',  active: false },
          { icon: 'grid_view',    label: 'Grid',      href: '/grid',   active: false },
          { icon: 'storefront',   label: 'Market',    href: '/market', active: false },
          { icon: 'chat',         label: 'Assistant', href: '/chat',   active: false },
        ].map(({ icon, label, href, active }) => (
          <button key={label} onClick={() => router.push(href)}
            className="flex flex-col items-center justify-center gap-1 transition-all"
            style={active
              ? { background: 'linear-gradient(135deg,#88d982,#2e7d32)', borderRadius: '50%', padding: 12, color: '#002204', transform: 'scale(1.1)' }
              : { color: '#bfcaba', padding: 12 }
            }>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
            {!active && <span className="text-[9px] font-medium tracking-wide">{label}</span>}
          </button>
        ))}
      </nav>
    </main>
  )
}
