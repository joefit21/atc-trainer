import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Converts runway number to individual spoken digits for TTS
// 13 → "one three", 31 → "three one", 5 → "five", 29 → "two niner"
function runwaySpoken(rwy) {
  const digitWords = { '0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'niner' }
  return rwy.toString().split('').map(c => digitWords[c] || c).join(' ')
}

export async function POST(request) {
  try {
    const { scenario, phase, pilot_said } = await request.json()

    const rwySpoken = runwaySpoken(scenario.runway)
    let prompt

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
- About 50% of the time add a hold short instruction for a runway crossing (use a different runway number, also as spoken digits)
- Keep response under 25 words
- Professional controller cadence — no pleasantries

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

Respond with a realistic takeoff clearance. Rules:
- Start with the aircraft callsign: ${scenario.callsign_spoken}
- Assign runway ${scenario.runway} — write it as: "runway ${rwySpoken}"
- Say "cleared for takeoff"
- Include wind (${windStr}) only if 5 knots or greater
- Include a departure instruction: "fly runway heading" OR a specific heading (e.g., "turn left heading two seven zero")
- Do NOT include any frequency change or departure control contact instruction
- Keep response under 30 words
- Professional tower controller cadence

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

    const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(rawText)

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
