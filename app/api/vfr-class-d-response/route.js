import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request) {
  try {
    const { scenario, phase, pilot_said } = await request.json()

    let prompt

    if (phase === 'ground') {
      prompt = `You are ${scenario.airport_name} Ground Control (${scenario.airport_id}).
Aircraft calling you: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active departure runway: ${scenario.runway}

The pilot just said: "${pilot_said}"

Respond with a realistic ground taxi clearance. Rules:
- Start with the aircraft callsign (spoken form: ${scenario.callsign_spoken})
- Assign runway ${scenario.runway}
- Include a taxiway route using a single letter (Alpha, Bravo, or Charlie) — pick whichever sounds realistic
- About 50% of the time, add a hold short instruction for a runway crossing (pick a plausible runway number different from ${scenario.runway})
- Keep total response under 25 words
- Sound like a real controller: clipped, efficient, no pleasantries
- Do NOT say "good morning", "wilco", "roger", or anything conversational

Return raw JSON only, no markdown:
{"controller_text": "the full clearance as the controller would say it"}`

    } else {
      // tower
      const windStr = scenario.atis.wind_speed >= 5
        ? `, wind ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed}`
        : ', wind calm'

      prompt = `You are ${scenario.airport_name} Tower (${scenario.airport_id}).
Aircraft calling you: ${scenario.callsign_spoken} (${scenario.aircraft_type})
Active runway: ${scenario.runway}
Current wind: ${scenario.atis.wind_dir} at ${scenario.atis.wind_speed} knots
Departure frequency: ${scenario.departure_freq}

The pilot just said: "${pilot_said}"

Respond with a realistic takeoff clearance. Rules:
- Start with the aircraft callsign (spoken form: ${scenario.callsign_spoken})
- Assign runway ${scenario.runway}
- Say "cleared for takeoff"
- Include wind${windStr} if 5 knots or more, otherwise omit
- Include either "fly runway heading" or a specific heading (e.g., "turn left heading 270 when able")
- End with "contact departure ${scenario.departure_freq} when airborne" or "frequency change approved" if no departure control
- Keep total response under 35 words
- Sound like a real tower controller: professional, efficient, no pleasantries

Return raw JSON only, no markdown:
{"controller_text": "the full clearance as the controller would say it"}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(rawText)

    // Convert to speech
    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: parsed.controller_text,
      speed: 1.05,
    })

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const audioUrl    = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`

    return Response.json({
      controller_text: parsed.controller_text,
      audio_url: audioUrl,
    })

  } catch (error) {
    console.error('Class D response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
