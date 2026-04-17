/**
 * app/api/analyze-quadrant/route.ts
 * Gemini 1.5 Flash powered quadrant analysis.
 * Falls back to keyword-matched template answers if no API key.
 *
 * Set GEMINI_API_KEY in .env.local to enable live AI responses.
 */

import { NextRequest, NextResponse } from 'next/server'

interface QuadrantIssue {
  label: string
  severity: string
  detail: string
}

interface RequestBody {
  quadrantId: string
  question: string
  quadrantData: {
    label: string
    healthScore: number
    healthLevel: string
    ndvi: number
    moisture: number
    topProblem: string
    issues: QuadrantIssue[]
    recommendedActions: string[]
    aiConfidence: number
  }
}

export async function POST(req: NextRequest) {
  const body: RequestBody = await req.json()
  const { quadrantId, question, quadrantData: q } = body

  const systemPrompt = `You are TerraMind, an expert AI agricultural advisor for Indian rice farmers.
You have real satellite data about a specific field quadrant. Answer the farmer's question with:
1. A direct, practical answer in 2-3 sentences
2. One specific action they can take today
3. Add "हिंदी: [Hindi translation of the key action]" at the end
Keep language simple — the farmer may not be highly educated. Use Indian farming context (ICAR, Tamil Nadu, Samba rice).`

  const contextPrompt = `
Quadrant: ${quadrantId} (${q.label})
Health Score: ${q.healthScore}/100 (${q.healthLevel})
NDVI: ${q.ndvi} | Soil Moisture: ${q.moisture}%
Top Problem: ${q.topProblem}
Issues detected: ${q.issues.map(i => `${i.label} (${i.severity}): ${i.detail}`).join('; ')}
Recommended actions: ${q.recommendedActions.join('; ')}
AI Confidence: ${q.aiConfidence}%

Farmer's question: ${question}

Answer concisely and practically. Do not repeat the question.`

  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${contextPrompt}` }] }],
            generationConfig: {
              temperature: 0.45,
              maxOutputTokens: 350,
              topP: 0.85,
            },
          }),
          signal: AbortSignal.timeout(9000),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return NextResponse.json({ answer: text.trim(), source: 'gemini' })
        }
      }
    } catch {
      // Fall through to template
    }
  }

  // ── Template fallback ──────────────────────────────────────────────────
  const answer = generateTemplateResponse(quadrantId, question, q)
  return NextResponse.json({ answer, source: 'template' })
}

function generateTemplateResponse(
  quadrantId: string,
  question: string,
  q: RequestBody['quadrantData']
): string {
  const ql = question.toLowerCase()

  // Water / irrigation questions
  if (/water|irrigat|moisture|dry|thirst|पानी|सिंचाई/.test(ql)) {
    if (q.moisture < 35) {
      return `Your ${quadrantId} quadrant is critically dry at ${q.moisture}% soil moisture — well below the 35% threshold your rice crop needs right now. Irrigate this section immediately with at least 40mm of water using your field channel. Delaying by even 2 days will cause irreversible yield loss in this zone.\n\nहिंदी: तुरंत 40mm सिंचाई करें — 2 दिन और रुके तो उपज का नुकसान होगा।`
    }
    return `Moisture in the ${quadrantId} quadrant is at ${q.moisture}% which is within acceptable range. Continue your current irrigation schedule and recheck in 5 days. If moisture drops below 35%, irrigate immediately.\n\nहिंदी: नमी ठीक है। 5 दिनों में फिर जांचें।`
  }

  // Disease / fungus questions
  if (/disease|fungus|blast|spot|blight|rot|insect|pest|रोग|कीड़|फंगस/.test(ql)) {
    const diseaseIssue = q.issues.find(i => i.severity === 'high')
    if (diseaseIssue) {
      return `The ${quadrantId} quadrant has a serious problem: ${diseaseIssue.label}. ${diseaseIssue.detail}. You need to act today — apply the recommended fungicide before it spreads to healthy areas of your field. Every day of delay allows the infection to double in coverage.\n\nहिंदी: आज ही दवाई डालें — देरी से नुकसान दोगुना होगा।`
    }
    return `No serious disease detected in the ${quadrantId} quadrant right now. NDVI readings are normal at ${q.ndvi.toFixed(2)}. Continue monitoring every 7 days and watch for leaf spots during humid weather.\n\nहिंदी: अभी कोई गंभीर रोग नहीं है। 7 दिनों में फिर जांचें।`
  }

  // Fertilizer / nutrient questions
  if (/fertil|nutrient|urea|npk|nitrogen|potassium|phosphorus|खाद|यूरिया|उर्वरक/.test(ql)) {
    return `For the ${quadrantId} quadrant, ${q.recommendedActions[0] ?? 'continue current fertilizer schedule'}. Your soil health score here is ${q.healthScore}/100. The top nutrient concern is ${q.topProblem}. Apply fertilizer in split doses — never broadcast before rain as it leaches away without reaching the roots.\n\nहिंदी: बारिश से पहले उर्वरक न डालें। विभाजित खुराक में दें।`
  }

  // Yield / harvest questions
  if (/yield|harvest|crop|income|earn|profit|उपज|फसल|कमाई/.test(ql)) {
    const yieldEst = q.healthScore > 70 ? '48–52 qtl/acre' : q.healthScore > 50 ? '38–44 qtl/acre' : '25–32 qtl/acre'
    return `Based on current satellite data, the ${quadrantId} quadrant is on track for approximately ${yieldEst} if you address ${q.topProblem} immediately. Health score here is ${q.healthScore}/100. Taking the recommended actions could improve yield by 15–20% in this section.\n\nहिंदी: अभी सुधार करें तो इस हिस्से में 15-20% अधिक उपज संभव है।`
  }

  // General / what to do
  if (/what|how|should|help|advice|problem|क्या|कैसे|क्या करूं/.test(ql)) {
    return `The most urgent issue in your ${quadrantId} quadrant is: ${q.topProblem}. Your action today should be: ${q.recommendedActions[0]}. This quadrant has a health score of ${q.healthScore}/100 — address the top issue first before moving to others.\n\nहिंदी: सबसे पहले करें: ${q.recommendedActions[0] ?? 'अनुशंसित कार्रवाई करें'}।`
  }

  // Default
  return `Your ${quadrantId} quadrant (${q.label}) has a health score of ${q.healthScore}/100 with NDVI at ${q.ndvi.toFixed(2)} and soil moisture at ${q.moisture}%. The primary concern here is ${q.topProblem}. Recommended action: ${q.recommendedActions[0] ?? 'continue monitoring'}.

हिंदी: ${q.label} का स्वास्थ्य स्कोर ${q.healthScore}/100 है। मुख्य समस्या: ${q.topProblem}।`
}
