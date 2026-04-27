import OpenAI from 'openai'
import { requireSubscribed } from '@/lib/require-auth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Squawk codes use ONLY octal digits 0–7
function randomSquawk() {
  const reserved = new Set(['0000', '7500', '7600', '7700'])
  let code
  do {
    code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8)).join('')
  } while (reserved.has(code))
  return code
}

function digitSpoken(d) {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'][parseInt(d)]
}

// "4521" → "four five two one"
function squawkSpoken(code) {
  return code.split('').map(digitSpoken).join(' ')
}

// "30.17" → "three zero one seven"  (decimal implied in aviation, never spoken)
function altimeterSpoken(alt) {
  return alt.replace('.', '').split('').map(digitSpoken).join(' ')
}

// Last 3 words of spoken callsign (abbreviated form)
function callsignAbbrev(spoken) {
  const parts = spoken.trim().split(/\s+/)
  return parts.slice(-3).join(' ')
}

export async function POST(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  try {
    const { scenario, phase } = await request.json()
    const abbrev = callsignAbbrev(scenario.callsign_spoken)
    let controllerText
    let squawkCode = null

    if (phase === 'initial_contact') {
      // Issue squawk code + altimeter (with station ID)
      squawkCode = randomSquawk()
      const codeSpoken = squawkSpoken(squawkCode)
      const altSpoken  = altimeterSpoken(scenario.altimeter)
      const station    = scenario.altimeter_station || scenario.facility_name
      controllerText = `${abbrev}, ${scenario.facility_name}, squawk ${codeSpoken}, ${station} altimeter ${altSpoken}.`

    } else if (phase === 'go_ahead') {
      // After pilot reads back squawk
      controllerText = `${abbrev}, go ahead with your request.`

    } else {
      // radar_contact — after pilot states full request
      controllerText = `${abbrev}, radar contact, ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}, say altitude.`
    }

    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: controllerText,
      speed: 1.05,
    })

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const audioUrl    = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`

    return Response.json({ controller_text: controllerText, squawk_code: squawkCode, audio_url: audioUrl })

  } catch (error) {
    console.error('Flight following response error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
