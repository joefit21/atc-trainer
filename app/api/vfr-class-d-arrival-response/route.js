import { parseAIJson } from '@/lib/parse-json'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { requireSubscribed } from '@/lib/require-auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

    if (phase === 'initial_call') {
      // Randomly pick one of the two approved pattern entry formats
      const useDownwind = Math.random() < 0.5

      prompt = `You are ${scenario.airport_name} Tower (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active runway: ${scenario.runway} (spoken: "${rwySpoken}"), ${scenario.pattern} traffic pattern

The pilot just called inbound: "${pilot_said}"

${useDownwind
  ? `Respond with a downwind entry instruction in EXACTLY this format:
"[Callsign], enter ${scenario.pattern} downwind runway ${rwySpoken}, report midfield."
Use exactly those words — no variations.`
  : `Respond with a straight-in instruction in EXACTLY this format:
"[Callsign], enter straight in runway ${rwySpoken}, report three-mile final."
Use exactly those words — no variations.`
}

Rules:
- Start with callsign: ${scenario.callsign_spoken}
- Keep it to that one instruction only — no additional instructions
- Professional tower cadence — no pleasantries

CRITICAL: Write ALL runway numbers as individual spoken digits:
- Runway 13 → "runway one three"
- Runway 31 → "runway three one"
- Runway 5 → "runway five"
- Runway 29 → "runway two niner"

Return raw JSON only, no markdown:
{"controller_text": "the full instruction exactly as spoken"}`

    } else if (phase === 'taxi_to_parking') {
      // Pilot called Ground clear of runway and requested taxi to parking
      prompt = `You are ${scenario.airport_name} Ground Control (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Aircraft just cleared runway ${scenario.runway} and is requesting taxi to ${scenario.parking_destination}.

The pilot just called: "${pilot_said}"

Respond with a taxi-to-parking clearance:
- Start with callsign: ${scenario.callsign_spoken}
- Assign a single taxiway letter (Alpha, Bravo, or Charlie)
- Direct them to ${scenario.parking_destination}
- Keep response under 20 words
- Professional ground controller cadence — no pleasantries

Return raw JSON only, no markdown:
{"controller_text": "the full clearance exactly as spoken"}`

    } else {
      // position_report — issue landing clearance
      const windStr = parseInt(scenario.atis.wind_speed) >= 5
        ? `wind ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed}`
        : 'wind calm'

      prompt = `You are ${scenario.airport_name} Tower (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active runway: ${scenario.runway} (spoken: "${rwySpoken}")
Wind: ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed} knots

The pilot just reported their position: "${pilot_said}"

Respond with a landing clearance:
- Start with callsign: ${scenario.callsign_spoken}
- "Cleared to land runway ${rwySpoken}"
- Include wind (${windStr}) only if wind speed is 5 knots or greater
- Do NOT include taxi instructions
- Keep response under 20 words
- Professional tower cadence

CRITICAL: Write ALL runway numbers as individual spoken digits.

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
    console.error('Class D arrival response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
