'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: number
  role: 'ai' | 'user'
  text: string
  time: string
  card?: { title: string; badge: string; detail: string }
}

const CANNED_RESPONSES: Record<string, Message['card'] & { text: string }> = {
  default: {
    text: "I've analyzed your field data. NDVI is at 0.68 — that's healthy for the heading stage. Is there anything specific you'd like me to check?",
    title: 'Field Status: Healthy',
    badge: 'Safe & Healthy',
    detail: 'NDVI 0.68 · Moisture 42% · Temp 31°C · Rice Heading Stage',
  },
  irrigation: {
    text: "Water stress detected in the NE quadrant. Soil moisture is at 28% — below the 35% threshold. I recommend irrigating 40mm within the next 24 hours.",
    title: 'NE Quadrant — Water Stress',
    badge: 'Action Required',
    detail: 'Moisture 28% · 40mm needed · No rain forecast 6 days',
  },
  disease: {
    text: "Low disease risk today. Blast fungus probability is 18% based on current temperature (31°C) and humidity (62%). Keep monitoring the SW corner over the next 48 hours.",
    title: 'Disease Risk: Low',
    badge: 'Monitoring',
    detail: 'Blast probability 18% · SW zone · Check in 48h',
  },
  harvest: {
    text: "The Harvest Oracle recommends holding your crop until October 22nd. Mandi prices are projected to peak at ₹22.4/kg — that's 15% higher than today's ₹19.5/kg. Estimated uplift: ₹7,400/acre.",
    title: 'Harvest Oracle: Oct 22',
    badge: '+15% Price Peak',
    detail: '847 farms scanned · Agmarknet forecast · ₹7,400/acre uplift',
  },
  soil: {
    text: "Nitrogen levels are at 142 kg/ha — below the optimal 180 kg/ha. I can see yellowing in the central strip from the satellite image. Apply 10 kg Urea per acre this week for best results.",
    title: 'Soil: Low Nitrogen',
    badge: 'Apply Urea',
    detail: 'N: 142 kg/ha · Optimal: 180 · pH 6.4 (good)',
  },
}

function getResponse(input: string): typeof CANNED_RESPONSES.default {
  const lower = input.toLowerCase()
  if (lower.includes('irrigat') || lower.includes('water') || lower.includes('moisture')) return CANNED_RESPONSES.irrigation
  if (lower.includes('disease') || lower.includes('fungus') || lower.includes('blast') || lower.includes('leaf')) return CANNED_RESPONSES.disease
  if (lower.includes('harvest') || lower.includes('sell') || lower.includes('mandi') || lower.includes('price') || lower.includes('oracle')) return CANNED_RESPONSES.harvest
  if (lower.includes('soil') || lower.includes('nitrogen') || lower.includes('urea') || lower.includes('nutrient')) return CANNED_RESPONSES.soil
  return CANNED_RESPONSES.default
}

function now() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const SUGGESTIONS = [
  'Check irrigation status',
  'Disease risk today?',
  'When should I harvest?',
  'Soil nitrogen levels',
]

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: 'ai', time: now(),
      text: "Vanakkam! I'm monitoring Ravi Kumar's Farm in Thanjavur. Soil moisture is slightly low in the NE quadrant. Would you like me to check the irrigation schedule?",
      card: { title: "Field: Ravi Kumar's Farm", badge: 'Live Monitoring', detail: 'NDVI 0.68 · Moisture 42% · 31°C' },
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [lang, setLang] = useState<'EN' | 'HI' | 'TA'>('EN')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: Date.now(), role: 'user', text, time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const resp = getResponse(text)
      const aiMsg: Message = {
        id: Date.now() + 1, role: 'ai', time: now(),
        text: resp.text,
        card: { title: resp.title, badge: resp.badge, detail: resp.detail },
      }
      setMessages(prev => [...prev, aiMsg])
      setTyping(false)
    }, 1200)
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: '#121412', color: '#e2e3df', fontFamily: 'Lexend, sans-serif' }}>

      {/* Top App Bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 z-50"
        style={{ background: 'rgba(18,20,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(64,73,61,0.4)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full transition-all hover:bg-white/5">
            <span className="material-symbols-outlined" style={{ color: '#88d982', fontSize: 22 }}>arrow_back</span>
          </button>
          <span className="material-symbols-outlined" style={{ color: '#88d982', fontSize: 22 }}>forest</span>
          <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#88d982' }}>TerraMind AI</h1>
        </div>

        {/* Language toggle */}
        <div className="flex p-1 rounded-full gap-0.5" style={{ background: '#1a1c1a', border: '1px solid rgba(64,73,61,0.4)' }}>
          {(['EN', 'HI', 'TA'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="px-3 py-1 rounded-full text-[10px] font-bold transition-all"
              style={lang === l
                ? { background: '#88d982', color: '#003909' }
                : { color: '#bfcaba' }}>
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#292a28 transparent' }}>

        {/* Verdant blur decoration */}
        <div className="fixed top-1/4 right-0 w-96 h-96 rounded-full blur-[150px] pointer-events-none -z-10"
          style={{ background: 'rgba(46,125,50,0.06)' }} />

        {messages.map(msg => (
          <div key={msg.id}
            className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'items-start'}`}>

            {msg.role === 'ai' && (
              <div className="flex items-center gap-2 mb-2 ml-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#2e7d32' }}>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>psychology</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#88d982' }}>Terra Mind</span>
              </div>
            )}

            <div className={`p-5 rounded-2xl shadow-xl ${msg.role === 'ai' ? 'rounded-tl-none' : 'rounded-tr-none'}`}
              style={msg.role === 'ai'
                ? { background: '#292a28', color: '#e2e3df' }
                : { background: '#2e7d32', color: '#cbffc2' }}>

              <p className="leading-relaxed">{msg.text}</p>

              {msg.role === 'ai' && msg.card && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold" style={{ color: '#88d982' }}>{msg.card.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(136,217,130,0.15)', color: '#88d982' }}>
                      {msg.card.badge}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: '#8a9485' }}>{msg.card.detail}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(136,217,130,0.1)', color: '#88d982' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>volume_up</span>
                      Listen
                    </button>
                    <button onClick={() => router.push('/field')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:opacity-80"
                      style={{ background: 'rgba(136,217,130,0.1)', color: '#88d982' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>terrain</span>
                      View Field
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-[10px] mt-1.5 mx-4" style={{ color: 'rgba(191,202,186,0.4)' }}>{msg.time}</span>
          </div>
        ))}

        {typing && (
          <div className="flex flex-col items-start max-w-[85%]">
            <div className="flex items-center gap-2 mb-2 ml-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#2e7d32' }}>
                <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>psychology</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#88d982' }}>Terra Mind</span>
            </div>
            <div className="px-5 py-4 rounded-2xl rounded-tl-none" style={{ background: '#292a28' }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#88d982', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {messages.length <= 2 && (
        <div className="shrink-0 px-4 md:px-12 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(136,217,130,0.08)', border: '1px solid rgba(136,217,130,0.2)', color: '#88d982', whiteSpace: 'nowrap' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-4 md:px-12 pb-6 pt-3"
        style={{ background: 'rgba(18,20,18,0.95)', borderTop: '1px solid rgba(64,73,61,0.3)' }}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-3xl max-w-4xl mx-auto"
          style={{ background: 'rgba(41,42,40,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(64,73,61,0.3)' }}>
          <button className="p-2 transition-colors hover:opacity-70" style={{ color: '#8a9485' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add_circle</span>
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={lang === 'HI' ? 'अपनी फसल के बारे में पूछें...' : lang === 'TA' ? 'உங்கள் பயிர்களைப் பற்றி கேளுங்கள்...' : 'Ask about your crops...'}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            style={{ color: '#e2e3df' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#88d982,#2e7d32)', color: '#002204' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>mic</span>
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="shrink-0 flex justify-around items-center px-4 pb-6 pt-3"
        style={{ background: 'rgba(13,15,13,0.9)', backdropFilter: 'blur(24px)' }}>
        {[
          { icon: 'potted_plant', label: 'Home',   href: '/',      active: false },
          { icon: 'terrain',      label: 'Field',  href: '/field', active: false },
          { icon: 'storefront',   label: 'Market', href: '/market',active: false },
          { icon: 'psychology',   label: 'AI',     href: '/chat',  active: true  },
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
