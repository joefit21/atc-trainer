import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function runwaySpoken(rwy) {
  const digitWords = { '0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'niner' }
  return rwy.toString().split('').map(c => digitWords[c] || c).join(' ')
}

export async function POST(request) {
  try {
    const { scenario, phase, pilot_said } = await request.json()

    const rwySpoken = runwaySpoken(scenario.runway)
    let prompt

    if (phase === 'initial_call') {
      prompt = `You are ${scenario.airport_name} Tower (${scenario.airport_id}).
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active runway: ${scenario.runway} (spoken: "${rwySpoken}"), ${scenario.pattern} traffic pattern
Pilot is inbound from the ${scenario.approach_direction}.

The pilot just called inbound: "${pilot_said}"

Respond with a realistic pattern entry instruction. Choose the most realistic option given the approach direction:
- "[Callsign], enter [left/right] downwind runway ${rwySpoken}, report turning final"
- "[Callsign], enter [left/right] base runway ${rwySpoken}, report final"
- "[Callsign], report [2 or 3]-mile final runway ${rwySpoken}"

Rules:
- Start with callsign: ${scenario.callsign_spoken}
- Use the correct pattern direction: ${scenario.pattern}
- Keep response under 20 words
- Professional tower cadence — no pleasantries

CRITICAL: Write ALL runway numbers as individual spoken digits:
- Runway 13 → "runway one three"
- Runway 31 → "runway three one"
- Runway 5 → "runway five"
- Runway 29 → "runway two niner"

Return raw JSON only, no markdown:
{"controller_text": "the full instruction exactly as spoken"}`

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
    console.error('Class D arrival response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
