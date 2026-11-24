import { parseAIJson } from '@/lib/parse-json'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { requireSubscribed } from '@/lib/require-auth'
import { stripWindReport } from '@/lib/controller-text.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Converts runway number to individual spoken digits for TTS
// 13 → "one three", 31 → "three one", 5 → "five", 29 → "two niner"
function runwaySpoken(rwy) {
  const digitWords = { '0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'niner' }
  return rwy.toString().split('').map(c => digitWords[c] || c).join(' ')
}

export async function POST(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  try {
    const { scenario, phase, pilot_said } = await request.json()

    const rwySpoken = runwaySpoken(scenario.runway)
    let prompt

    // A hold short or crossing may only name a real runway at this airport (never the
    // active runway's own strip). Scenarios without the list keep the older wording.
    const candidates = scenario.hold_short_candidates
    const holdShort = scenario.hold_short_runway // a runway number, null for none, or undefined (older scenario)
    const crossingRule = holdShort !== undefined
      ? holdShort
        ? `- Add a hold short instruction for runway ${runwaySpoken(holdShort)}, written as spoken digits: "hold short runway ${runwaySpoken(holdShort)}". Do not mention any other runway except the departure runway.`
        : '- Issue a simple taxi clearance with NO hold short and NO crossing instruction. Do not mention any runway except the departure runway.'
      : Array.isArray(candidates)
      ? candidates.length > 0
        ? `- About 1 out of 3 times (roughly 33%) add a hold short instruction for a runway crossing, naming ONLY one of these real runways at this airport, as spoken digits: ${candidates.map((c) => `"runway ${runwaySpoken(c)}"`).join(' or ')}. The other 2 out of 3 times issue a simple taxi clearance with no hold short or crossing instruction.`
        : '- This airport has only one runway, so never mention a hold short or a crossing for any other runway. Issue a simple taxi clearance.'
      : '- About 1 out of 3 times (roughly 33%) add a hold short instruction for a runway crossing (use a different runway number, also as spoken digits). The other 2 out of 3 times issue a simple taxi clearance with no hold short or crossing instruction.'

    if (phase === 'ground') {
      prompt = `You are ${scenario.airport_name} Ground Control (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active departure runway: ${scenario.runway} (spoken: "${rwySpoken}")
Pilot's intended departure: ${scenario.departure_intention}

The pilot just called: "${pilot_said}"

Respond with a realistic ground taxi clearance. Rules:
- Start with the aircraft callsign in spoken form: ${scenario.callsign_spoken}
- Assign runway ${scenario.runway} — write it as spoken digits: "runway ${rwySpoken}"
- Include a taxiway route using a single letter (Alpha, Bravo, or Charlie)
${crossingRule}
- Keep response under 25 words
- Professional controller cadence — no pleasantries
- NEVER include a wind report, altimeter, or any weather: Ground Control does not issue those (the pilot already has the ATIS)

CRITICAL: Write ALL runway numbers as individual spoken digits. Examples:
- Runway 13 → "runway one three"
- Runway 31 → "runway three one"
- Runway 5 → "runway five"
- Runway 29 → "runway two niner"

Return raw JSON only, no markdown:
{"controller_text": "the full clearance exactly as spoken"}`

    } else {
      const windStr = parseInt(scenario.atis.wind_speed) >= 5
        ? `wind ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed}`
        : 'wind calm'

      prompt = `You are ${scenario.airport_name} Tower (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active runway: ${scenario.runway} (spoken: "${rwySpoken}")
Wind: ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed} knots
Pilot's intended departure: ${scenario.departure_intention}

The pilot just called: "${pilot_said}"

Respond with a realistic takeoff clearance using EXACTLY this format (elements after callsign may be in any order):
1. Callsign FIRST: ${scenario.callsign_spoken}
2. Wind (${windStr}) — include ONLY if wind speed is 5 knots or greater
3. "Cleared for takeoff runway ${rwySpoken}"
4. Departure approval: state the departure direction from the pilot's intended departure — e.g., "northbound departure approved", "westbound departure approved", "closed traffic approved"

DO NOT include any heading instruction. DO NOT include any frequency change. DO NOT include "fly runway heading."
Keep response under 25 words. Professional tower controller cadence.

CRITICAL: Write ALL runway numbers as individual spoken digits:
- Runway 13 → "runway one three"
- Runway 31 → "runway three one"
- Runway 5 → "runway five"
- Runway 23 → "runway two three"

Return raw JSON only, no markdown:
{"controller_text": "the full clearance exactly as spoken"}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].text
    const parsed  = parseAIJson(rawText)
    // Ground never gives a wind report; only Tower does, with the takeoff clearance.
    if (phase === 'ground') parsed.controller_text = stripWindReport(parsed.controller_text)

    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: parsed.controller_text,
      speed: 1.05,
    })

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const audioUrl    = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`

    return Response.json({ controller_text: parsed.controller_text, audio_url: audioUrl })

  } catch (error) {
    console.error('Class D response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
