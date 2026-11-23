import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DEMO_SCENARIOS = {
  ground: {
    callsign: 'N4521H',
    airport: 'KPHX – Phoenix Sky Harbor',
    clearance_text: 'November four five two one Hotel, Phoenix Ground, runway eight, taxi via Bravo, Delta, hold short of runway eight.',
  },
  ifr: {
    callsign: 'N7823K',
    airport: 'KDFW – Dallas Fort Worth',
    destination: 'KIAH – Houston Intercontinental',
    clearance_text: 'November seven eight two tree Kilo is cleared to the Houston Intercontinental Airport via the DARTZ Niner departure, then as filed. Climb and maintain one one thousand, expect one five thousand one zero minutes after departure. Departure frequency one two four point tree, squawk four five tree two.',
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'ground'
  const scenario = DEMO_SCENARIOS[type] || DEMO_SCENARIOS.ground

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: scenario.clearance_text,
      speed: 1.1,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    const base64 = buffer.toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64}`

    return Response.json({ ...scenario, audio_url: audioUrl })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
