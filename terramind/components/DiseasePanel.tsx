'use client'

/**
 * components/DiseasePanel.tsx
 *
 * Farmer-friendly disease detection panel.
 *
 * Props:
 *   result  — DiseaseDetectionResult from detectDiseaseFromCell()
 *   compact — optional; renders a condensed single-card variant for
 *             embedding inside CellAnalysisPanel (default false)
 */

import { useState } from 'react'
import { type DiseaseDetectionResult } from '@/lib/diseaseDetection'

// ── Unsplash source URL builder (no API key needed for source.unsplash.com) ──
function unsplashUrl(query: string, w = 400, h = 280): string {
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}

// ── Risk badge ────────────────────────────────────────────────────────────
function RiskBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `${color}20`,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: '2px 8px',
        color,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.08em',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }}
      />
      {label.toUpperCase()}
    </span>
  )
}

// ── Confidence bar ────────────────────────────────────────────────────────
function ConfBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: `linear-gradient(90deg,${color}90,${color})`,
            borderRadius: 3,
            transition: 'width 0.6s ease',
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
      <span
        style={{
          color,
          fontSize: 10,
          fontWeight: 900,
          fontFamily: 'monospace',
          minWidth: 28,
          textAlign: 'right',
        }}
      >
        {value}%
      </span>
    </div>
  )
}

// ── Image card ────────────────────────────────────────────────────────────
function DiseaseImageCard({ query, color }: { query: string; color: string }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const src = unsplashUrl(query)

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${color}30`,
        background: 'rgba(255,255,255,0.03)',
        position: 'relative',
        aspectRatio: '4/3',
      }}
    >
      {!errored ? (
        <img
          src={src}
          alt={query}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      ) : null}

      {/* Skeleton while loading */}
      {!loaded && !errored && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
      )}

      {/* Fallback placeholder */}
      {errored && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            color: '#475569',
          }}
        >
          <span style={{ fontSize: 20 }}>🌿</span>
          <span style={{ fontSize: 7, fontWeight: 700 }}>Reference image</span>
        </div>
      )}

      {/* Caption overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '6px 6px 5px',
          background: 'linear-gradient(transparent,rgba(3,13,26,0.82))',
          fontSize: 7,
          color: '#94a3b8',
          lineHeight: 1.3,
        }}
      >
        {query}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// FULL PANEL — used on the region page right sidebar
// ════════════════════════════════════════════════════════════════════════

export function DiseasePanelFull({ result }: { result: DiseaseDetectionResult }) {
  const { info, riskColor, riskLabel, confidence, explanation, detected } = result
  const [imgIdx, setImgIdx] = useState(0)

  // ── No disease ───────────────────────────────────────────────────────
  if (!detected) {
    return (
      <div
        style={{
          borderRadius: 12,
          padding: '16px',
          background: '#22c55e08',
          border: '1px solid #22c55e25',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <div>
            <div style={{ color: '#22c55e', fontSize: 11, fontWeight: 900, letterSpacing: '0.06em' }}>
              NO DISEASE DETECTED
            </div>
            <div style={{ color: '#64748b', fontSize: 9, marginTop: 1 }}>
              Sensor readings are within healthy ranges
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {info.actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ color: '#22c55e', fontSize: 9, marginTop: 1 }}>✓</span>
              <span style={{ color: '#94a3b8', fontSize: 9, lineHeight: 1.5 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Disease detected ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Header card ── */}
      <div
        style={{
          borderRadius: 12,
          padding: '14px 16px',
          background: `${riskColor}10`,
          border: `1px solid ${riskColor}35`,
          boxShadow: `0 0 20px ${riskColor}10`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{info.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>{info.name}</span>
              <RiskBadge label={riskLabel} color={riskColor} />
            </div>
            <div style={{ color: '#94a3b8', fontSize: 9, lineHeight: 1.55 }}>
              {explanation}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 2 }}>
          <div style={{ color: '#475569', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 5 }}>
            AI CONFIDENCE
          </div>
          <ConfBar value={confidence} color={riskColor} />
        </div>
      </div>

      {/* ── Reference images ── */}
      {info.imageQueries.length > 0 && (
        <div
          style={{
            borderRadius: 12,
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', marginBottom: 10 }}>
            📸 HOW IT LOOKS
          </div>

          {/* Main featured image */}
          <div style={{ marginBottom: 8 }}>
            <DiseaseImageCard query={info.imageQueries[imgIdx]} color={riskColor} />
          </div>

          {/* Thumbnail strip */}
          {info.imageQueries.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {info.imageQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: `1.5px solid ${i === imgIdx ? riskColor : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                    padding: 0,
                    background: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <img
                    src={unsplashUrl(q, 120, 80)}
                    alt={q}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Symptoms ── */}
      <div
        style={{
          borderRadius: 12,
          padding: '12px 14px',
          background: `${riskColor}08`,
          border: `1px solid ${riskColor}20`,
        }}
      >
        <div
          style={{
            color: riskColor,
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          🌿 SYMPTOMS TO LOOK FOR
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {info.symptoms.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <span style={{ color: riskColor, fontSize: 10, lineHeight: 1.2, flexShrink: 0 }}>•</span>
              <span style={{ color: '#cbd5e1', fontSize: 10, lineHeight: 1.55 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div
        style={{
          borderRadius: 12,
          padding: '12px 14px',
          background: '#22c55e08',
          border: '1px solid #22c55e25',
        }}
      >
        <div
          style={{
            color: '#22c55e',
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          🛠 WHAT TO DO NOW
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {info.actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#22c55e18',
                  border: '1px solid #22c55e40',
                  color: '#22c55e',
                  fontSize: 8,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: '#e2e8f0', fontSize: 10, lineHeight: 1.55 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why it happened (triggers) ── */}
      {info.triggers.length > 0 && (
        <div
          style={{
            borderRadius: 12,
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              color: '#64748b',
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: '0.12em',
              marginBottom: 7,
            }}
          >
            ⚙ WHY THIS HAPPENED
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {info.triggers.map((t, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 5,
                  padding: '2px 7px',
                  color: '#64748b',
                  fontSize: 8,
                  lineHeight: 1.5,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// COMPACT CARD — embedded inside CellAnalysisPanel (240 px wide)
// ════════════════════════════════════════════════════════════════════════

export function DiseasePanelCompact({ result }: { result: DiseaseDetectionResult }) {
  const { info, riskColor, riskLabel, confidence, detected } = result

  if (!detected) {
    return (
      <div
        style={{
          background: '#22c55e08',
          border: '1px solid #22c55e25',
          borderRadius: 8,
          padding: '7px 9px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ color: '#22c55e', fontSize: 8, fontWeight: 800 }}>No disease risk detected</span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: `${riskColor}0d`,
        border: `1px solid ${riskColor}35`,
        borderRadius: 8,
        padding: '8px 10px',
      }}
    >
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Name + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{info.emoji}</span>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, flex: 1 }}>{info.name}</span>
        <RiskBadge label={riskLabel} color={riskColor} />
      </div>

      {/* Confidence */}
      <ConfBar value={confidence} color={riskColor} />

      {/* Top 2 symptoms */}
      <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {info.symptoms.slice(0, 2).map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <span style={{ color: riskColor, fontSize: 8, flexShrink: 0 }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: 7, lineHeight: 1.45 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Top action */}
      {info.actions[0] && (
        <div
          style={{
            marginTop: 6,
            background: '#22c55e0a',
            border: '1px solid #22c55e25',
            borderRadius: 5,
            padding: '4px 7px',
          }}
        >
          <span style={{ color: '#22c55e', fontSize: 7, fontWeight: 800 }}>
            → {info.actions[0]}
          </span>
        </div>
      )}

      {/* Single reference image */}
      {info.imageQueries[0] && (
        <div style={{ marginTop: 7 }}>
          <DiseaseImageCard query={info.imageQueries[0]} color={riskColor} />
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT — picks full vs compact automatically
// ════════════════════════════════════════════════════════════════════════

export default function DiseasePanel({
  result,
  compact = false,
}: {
  result: DiseaseDetectionResult
  compact?: boolean
}) {
  return compact
    ? <DiseasePanelCompact result={result} />
    : <DiseasePanelFull result={result} />
}
