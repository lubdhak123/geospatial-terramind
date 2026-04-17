/**
 * app/api/grid-ai/route.ts
 * AI endpoint for grid cell analysis + natural language navigation
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  GRID_FLAT, MOST_CRITICAL, TOP_CRITICAL,
  type GridCell,
} from '@/lib/gridStore'

// ── Keyword navigation map ───────────────────────────────────────────────
const NAV_KEYWORDS: Array<{
  patterns: string[]
  resolve: () => { cell: GridCell; reason: string }
}> = [
  {
    patterns: ['worst', 'critical', 'most problem', 'bad', 'danger', 'urgent', 'emergency', 'serious'],
    resolve: () => ({
      cell: MOST_CRITICAL,
      reason: `Most critical zone — highest combined stress score of ${MOST_CRITICAL.criticalScore}/100`,
    }),
  },
  {
    patterns: ['water', 'moisture', 'drought', 'dry', 'irrigation', 'thirst'],
    resolve: () => {
      const c = [...GRID_FLAT].sort((a, b) => a.moisture - b.moisture)[0]
      return { cell: c, reason: `Lowest moisture at ${c.moisture}% — severe drought stress` }
    },
  },
  {
    patterns: ['disease', 'blast', 'fungus', 'infection', 'pathogen', 'pest', 'sick'],
    resolve: () => {
      const order = { critical: 4, high: 3, medium: 2, low: 1, none: 0 }
      const c = [...GRID_FLAT].sort((a, b) => order[b.diseaseRisk] - order[a.diseaseRisk])[0]
      return { cell: c, reason: `Highest disease pressure — ${c.diseaseRisk} risk level` }
    },
  },
  {
    patterns: ['soil', 'degraded', 'compaction', 'structure', 'quality'],
    resolve: () => {
      const c = [...GRID_FLAT].sort((a, b) => a.soilQuality - b.soilQuality)[0]
      return { cell: c, reason: `Lowest soil quality at ${c.soilQuality}/100` }
    },
  },
  {
    patterns: ['yield', 'production', 'harvest', 'output', 'profit', 'best', 'healthy', 'good'],
    resolve: () => {
      const c = [...GRID_FLAT].sort((a, b) => b.yieldPrediction - a.yieldPrediction)[0]
      return { cell: c, reason: `Highest yield potential at ${c.yieldPrediction}% — optimal growing conditions` }
    },
  },
  {
    patterns: ['nitrogen', 'fertilizer', 'nutrient', 'npk'],
    resolve: () => {
      const c = [...GRID_FLAT].sort((a, b) => a.nitrogenLevel - b.nitrogenLevel)[0]
      return { cell: c, reason: `Lowest nitrogen at ${c.nitrogenLevel}/100 — critical deficiency` }
    },
  },
  {
    patterns: ['ph', 'acid', 'alkaline', 'lime'],
    resolve: () => {
      const c = [...GRID_FLAT].sort((a, b) => Math.abs(a.pH - 6.5) - Math.abs(b.pH - 6.5))[1]
      return { cell: c, reason: `Most extreme pH at ${c?.pH} — nutrient availability severely impacted` }
    },
  },
]

// ── Template AI explanation ──────────────────────────────────────────────
function buildExplanation(cell: GridCell): string {
  const parts: string[] = []

  if (cell.diseaseRisk === 'critical') {
    parts.push(`⚠️ CRITICAL: Active disease outbreak detected in Zone ${cell.id.toUpperCase()}. Immediate fungicide application required.`)
  } else if (cell.diseaseRisk === 'high') {
    parts.push(`Disease pressure is HIGH. Preventive fungicide recommended within 48 hours.`)
  }

  if (cell.moisture < 25) {
    parts.push(`Soil moisture is critically low at ${cell.moisture}%. Emergency irrigation of 40–50mm required immediately.`)
  } else if (cell.moisture < 45) {
    parts.push(`Moisture at ${cell.moisture}% is below optimal range. Schedule irrigation within 2–3 days.`)
  } else {
    parts.push(`Moisture levels are adequate at ${cell.moisture}%.`)
  }

  if (cell.soilQuality < 35) {
    parts.push(`Soil quality is severely degraded (${cell.soilQuality}/100). Deep tillage and organic matter addition recommended.`)
  } else if (cell.soilQuality < 55) {
    parts.push(`Soil quality is moderate (${cell.soilQuality}/100). Compost application will improve structure.`)
  }

  if (cell.nitrogenLevel < 30) {
    parts.push(`Nitrogen deficiency detected (${cell.nitrogenLevel}/100). Apply urea at 20 kg/acre immediately.`)
  }

  if (cell.pH < 5.5) {
    parts.push(`Soil is acidic (pH ${cell.pH}). Apply agricultural lime at 2 t/ha to correct.`)
  } else if (cell.pH > 7.5) {
    parts.push(`Soil alkalinity (pH ${cell.pH}) may limit nutrient uptake. Sulfur amendment recommended.`)
  }

  parts.push(`Yield prediction: ${cell.yieldPrediction}% of maximum potential.`)

  if (cell.criticalScore >= 60) {
    parts.push(`🔴 This zone requires IMMEDIATE intervention. Do not delay treatment.`)
  } else if (cell.criticalScore >= 30) {
    parts.push(`🟡 Schedule treatment within the next 5–7 days to prevent deterioration.`)
  } else {
    parts.push(`✅ This zone is performing well. Maintain current management practices.`)
  }

  return parts.join(' ')
}

// ── Global field summary ─────────────────────────────────────────────────
function buildFieldSummary(): string {
  const criticalCount = GRID_FLAT.filter(c => c.healthLevel === 'critical').length
  const moderateCount = GRID_FLAT.filter(c => c.healthLevel === 'moderate').length
  const healthyCount  = GRID_FLAT.filter(c => c.healthLevel === 'healthy').length
  const avgMoisture   = Math.round(GRID_FLAT.reduce((s, c) => s + c.moisture, 0) / GRID_FLAT.length)
  const avgYield      = Math.round(GRID_FLAT.reduce((s, c) => s + c.yieldPrediction, 0) / GRID_FLAT.length)

  return (
    `Field Overview: ${healthyCount} healthy zones (${healthyCount}%), ` +
    `${moderateCount} moderate zones, ${criticalCount} critical zones requiring immediate action. ` +
    `Average moisture: ${avgMoisture}%. Average yield potential: ${avgYield}%. ` +
    `Most critical zone is ${MOST_CRITICAL.id.toUpperCase()} ` +
    `(Score: ${MOST_CRITICAL.criticalScore}/100 — ${MOST_CRITICAL.diseaseRisk} disease risk, ` +
    `${MOST_CRITICAL.moisture}% moisture, ${MOST_CRITICAL.soilQuality}/100 soil). ` +
    `Top 5 critical zones: ${TOP_CRITICAL.map(c => c.id.toUpperCase()).join(', ')}.`
  )
}

// ── Gemini API call ───────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 350, temperature: 0.4 },
        }),
      }
    )
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
  } catch {
    return null
  }
}

// ── Route handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, cell, query } = body as {
    type: 'explain' | 'query' | 'summary'
    cell?: GridCell
    query?: string
  }

  // 1. Field summary
  if (type === 'summary') {
    const summary = buildFieldSummary()
    const gemini  = await callGemini(
      `You are an agricultural AI assistant. Provide a concise field health summary (3-4 sentences) based on this data: ${summary}`
    )
    return NextResponse.json({ response: gemini ?? summary })
  }

  // 2. Natural language navigation
  if (type === 'query' && query) {
    const q = query.toLowerCase()
    for (const entry of NAV_KEYWORDS) {
      if (entry.patterns.some(p => q.includes(p))) {
        const { cell: targetCell, reason } = entry.resolve()
        const explanation = buildExplanation(targetCell)
        const geminiPrompt = `You are an agricultural AI. The farmer asked: "${query}". ` +
          `Navigate them to zone ${targetCell.id.toUpperCase()} because: ${reason}. ` +
          `Cell data: Soil=${targetCell.soilQuality}/100, Moisture=${targetCell.moisture}%, ` +
          `Disease=${targetCell.diseaseRisk}, Yield=${targetCell.yieldPrediction}%. ` +
          `Give a 2-3 sentence natural explanation of why this zone needs attention.`
        const gemini = await callGemini(geminiPrompt)
        return NextResponse.json({
          response: gemini ?? `Navigating to Zone ${targetCell.id.toUpperCase()}. ${reason}. ${explanation}`,
          navigateTo: { row: targetCell.row, col: targetCell.col },
          reason,
        })
      }
    }
    // Fallback: send to most critical
    return NextResponse.json({
      response: `I'll show you the most critical zone. ${buildExplanation(MOST_CRITICAL)}`,
      navigateTo: { row: MOST_CRITICAL.row, col: MOST_CRITICAL.col },
      reason: 'Most critical zone in the field',
    })
  }

  // 3. Single cell explanation
  if (type === 'explain' && cell) {
    const explanation = buildExplanation(cell)
    const geminiPrompt =
      `You are an agricultural AI advisor. Analyze this farm zone and give a 3-4 sentence expert assessment:\n` +
      `Zone: ${cell.id.toUpperCase()}, Soil Quality: ${cell.soilQuality}/100, ` +
      `Moisture: ${cell.moisture}%, Disease Risk: ${cell.diseaseRisk}, ` +
      `Yield Prediction: ${cell.yieldPrediction}%, Temperature: ${cell.temperature}°C, ` +
      `Nitrogen: ${cell.nitrogenLevel}/100, pH: ${cell.pH}. ` +
      `Stress indicators: ${cell.cropStress.join(', ')}. ` +
      `Give specific, actionable recommendations a farmer can act on immediately.`
    const gemini = await callGemini(geminiPrompt)
    return NextResponse.json({ response: gemini ?? explanation })
  }

  return NextResponse.json({ response: 'Invalid request type' }, { status: 400 })
}
