'use client'

import { useRouter } from 'next/navigation'
import { Leaf, Satellite, PenTool, ChevronRight, Zap, Eye, Grid3X3 } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#0D1B2A] px-6">

      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-800/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-950/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">

        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a6fdb] to-[#1a3f8a] shadow-lg shadow-blue-900/40">
            <Leaf size={28} className="text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Terra<span className="text-[#2a6fdb]">Mind</span>
            </h1>
            <p className="text-xs font-medium tracking-widest text-slate-500 uppercase">
              AI Precision Agriculture
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="mb-2 max-w-sm text-lg font-semibold text-white/90">
          AI-Powered 3D Farm Intelligence
        </p>
        <p className="mb-10 max-w-xs text-sm text-slate-500">
          From satellite to insight in 60 seconds
        </p>

        {/* Feature pills */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {[
            { icon: <Satellite size={11} />, label: 'Sentinel-2 Satellite' },
            { icon: <Zap size={11} />,       label: 'Gemini AI Analysis' },
            { icon: <Eye size={11} />,       label: '3D Field Viewer' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-blue-900/50 bg-blue-950/30 px-3 py-1 text-[11px] text-blue-300"
            >
              {icon}
              {label}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">

          {/* Primary: Draw My Field */}
          <button
            onClick={() => router.push('/draw')}
            className="group flex w-52 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#2a6fdb] to-[#1a4fa0] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-all duration-200 hover:from-[#3a7fea] hover:to-[#2359b8] hover:shadow-blue-800/50 active:scale-[0.98]"
          >
            <PenTool size={16} />
            <span>Draw My Field</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Secondary: View Demo */}
          <button
            onClick={() => router.push('/field')}
            className="group flex w-52 items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
          >
            <Eye size={16} />
            <span>View Demo Field</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Grid Intelligence */}
          <button
            onClick={() => router.push('/grid')}
            className="group flex w-52 items-center justify-center gap-2.5 rounded-2xl border border-emerald-900/50 bg-emerald-950/20 px-6 py-4 text-sm font-semibold text-emerald-300 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/60 hover:bg-emerald-900/20 hover:text-white active:scale-[0.98]"
          >
            <Grid3X3 size={16} />
            <span>Grid Intelligence</span>
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Sub-note */}
        <p className="mt-8 text-[11px] text-slate-700">
          Demo uses Ravi Kumar's Farm · Thanjavur, Tamil Nadu · Rice (Samba)
        </p>
      </div>
    </main>
  )
}
