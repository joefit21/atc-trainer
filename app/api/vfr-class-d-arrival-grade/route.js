import Anthropic from '@anthropic-ai/sdk'
import { requireSubscribed } from '@/lib/require-auth'
import { gradeCalls } from '@/lib/call-grading.mjs'
import { ARRIVAL as S } from '@/lib/grading-scenarios.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// The model only quotes the words that satisfy each required element; the score and the
// feedback are worked out in code (lib/call-scoring.mjs, lib/grading-scenarios.mjs).
export async function POST(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const scenario = body.scenario
    const calls = body.exchanges
    const result = await gradeCalls({
      anthropic, title: S.title, scenarioText: S.scenarioText(scenario), scenario, calls,
      table: S.table, help: S.help, extraRules: S.extraRules, rescue: S.rescue, what: S.what, cleanLabel: S.cleanLabel,
    })
    return Response.json(result)
  } catch (error) {
    console.error('Class D arrival grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
