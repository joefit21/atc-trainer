import OpenAI from 'openai'
import { GROUND, IFR_DEMO, IFR_LANDING } from '@/lib/demo-clearances.mjs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// The sample clearances live in lib/demo-clearances.mjs. The practice lab's IFR demo and
// the home page's IFR sample are different clearances: the home page asks with for=landing.
const DEMO_SCENARIOS = { ground: GROUND, ifr: IFR_DEMO }

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'ground'
  const scenario = type === 'ifr' && searchParams.get('for') === 'landing' ? IFR_LANDING : DEMO_SCENARIOS[type] || DEMO_SCENARIOS.ground

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
