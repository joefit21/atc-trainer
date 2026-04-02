import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function randomSquawk() {
  const reserved = ['0000', '7500', '7600', '7700']
  let code
  do {
    code = Math.floor(Math.random() * 7778).toString().padStart(4, '0')
  } while (reserved.includes(code) || code.startsWith('77'))
  return code
}

function squawkSpoken(code) {
  const words = { '0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'niner' }
  return code.split('').map(d => words[d] || d).join(' ')
}

export async function POST(request) {
  try {
    const { scenario, phase, pilot_said } = await request.json()
    let prompt

    if (phase === 'squawk_assignment') {
      const code       = randomSquawk()
      const codeSpoken = squawkSpoken(code)

      prompt = `You are ${scenario.facility_name}, a radar facility.
Aircraft: ${scenario.callsign_spoken} (${scenario.aircraft_type})
The pilot just requested flight following: "${pilot_said}"

Respond with a squawk assignment. Use EXACTLY this format:
"[Callsign], [Facility], squawk [spoken code], ident."

- Callsign: ${scenario.callsign_spoken}
- Facility: ${scenario.facility_name}
- Squawk code (spoken digit by digit): ${codeSpoken}
- End with "ident"

Keep it under 15 words. Professional ATC cadence — no pleasantries.

Return raw JSON only, no markdown:
{"controller_text": "the response exactly as spoken", "squawk_code": "${code}"}`

    } else {
      // radar_contact
      prompt = `You are ${scenario.facility_name}, a radar facility.
Aircraft: ${scenario.callsign_spoken}
The pilot just read back the squawk code: "${pilot_said}"
Aircraft is ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference} at ${scenario.altitude} ft MSL.
Current altimeter: ${scenario.altimeter}

Respond with a radar contact confirmation. Use EXACTLY this format:
"[Callsign], radar contact, [X] miles [direction] of [reference], altimeter [XX.XX]."

- Callsign (abbreviated to last 3 is fine): use last portion of ${scenario.callsign_spoken}
- Position: ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}
- Altimeter: ${scenario.altimeter}

Keep it under 20 words. Professional ATC cadence.

Return raw JSON only, no markdown:
{"controller_text": "the response exactly as spoken"}`
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

    return Response.json({
      controller_text: parsed.controller_text,
      squawk_code:     parsed.squawk_code || null,
      audio_url:       audioUrl,
    })

  } catch (error) {
    console.error('Flight following response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
