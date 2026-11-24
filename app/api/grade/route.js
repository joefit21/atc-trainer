import Anthropic from '@anthropic-ai/sdk'
import { requireSubscribed } from '@/lib/require-auth'
import { gradeClearance } from '@/lib/clearance-grading.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// IFR clearance and ground taxi clearance readbacks. The model only quotes the words that need a
// phonetic ear (destination, routing, taxi route); every number is checked in code and the score
// and feedback are worked out in code (lib/clearance-grading.mjs), so a missing callsign always
// costs the same and a score can never contradict its feedback.
export async function POST(request) {
  try {
    const { clearance_text, readback_text, scenario_type, is_demo, callsign } = await request.json()

    if (!is_demo) {
      const { authError } = await requireSubscribed(request)
      if (authError) return authError
    }

    const result = await gradeClearance({ anthropic, clearance_text, readback_text, scenario_type, callsign })
    return Response.json(result)
  } catch (error) {
    console.error('Grade API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
