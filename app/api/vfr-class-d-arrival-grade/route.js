import { parseAIJson } from '@/lib/parse-json'
import Anthropic from '@anthropic-ai/sdk'
import { requireSubscribed } from '@/lib/require-auth'
import {
  modelKeys, quoteIsInTranscript, scoreExchange, summarize, callsignIsAbsent,
  hasRunwayNumber, hasReportPoint, hasEntry,
} from '@/lib/arrival-scoring.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// What each element means, for the model. The model only answers true or false for each;
// the score and the feedback are worked out in lib/arrival-scoring.mjs.
const ELEMENT_HELP = {
  tower_name: "addressed the airport's Tower by name (any phonetically close version of the name counts)",
  position: 'initial_call: gave a distance AND a direction from the airport (e.g. "10 miles northwest"). position_report: reported the position the controller asked for (e.g. "midfield left downwind", "3-mile final")',
  atis: 'said the ATIS letter (the current one); "landing with <letter>" counts',
  intent: 'said they want to land or are inbound ("landing", "inbound", "full stop")',
  entry: 'read back the entry the controller gave: left or right downwind, or straight in, matching what the controller said',
  runway: 'said the runway number, as numerals or words (13, one three, thirteen all count); the word "runway" is not needed',
  report_point: 'read back the reporting point the controller gave ("midfield", or "three-mile final")',
  cleared_to_land: 'read back the landing clearance with the runway (e.g. "cleared to land runway 13", "cleared to land 13")',
  ground_name: 'addressed Ground (any close version of "<airport> Ground")',
  clear_runway: 'said a SPECIFIC runway number they are clear of. "Clear of the active" or "clear of the runway" with no number is false',
  request_taxi: 'asked for taxi to parking or to a destination',
  taxiway: 'read back the taxiway(s) the controller issued',
  destination: 'read back where they are taxiing (GA ramp, FBO, transient ramp, ...)',
}

export async function POST(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  try {
    const { scenario, exchanges } = await request.json()

    const callsText = exchanges.map((ex, i) => {
      const keys = modelKeys(ex.phase)
      return `Call ${i} (${ex.phase.replace(/_/g, ' ')})
${ex.controller_said ? `Controller said: "${ex.controller_said}"\n` : ''}Pilot said: "${ex.pilot_said || '(nothing recorded)'}"
Quote the pilot's words for: ${keys.length ? keys.map((k) => `${k} (${ELEMENT_HELP[k]})`).join('; ') : '(nothing to answer)'}`
    }).join('\n\n')

    const prompt = `You are a CFI and former air traffic controller checking a student pilot's radio calls during a Class D airport arrival. You are NOT scoring them. For each call, find the required elements in what the pilot said. A separate program does the scoring.

SCENARIO:
Airport: ${scenario.airport_name} (${scenario.airport_id}), Class D
Active runway: ${scenario.runway}, ${scenario.pattern} traffic
ATIS: Information ${scenario.atis.letter}
Callsign: ${scenario.callsign_display}

CALLS:
${callsText}

HOW TO ANSWER:
- For each element, copy WORD FOR WORD the part of the pilot's call that satisfies it. If the element is not there, answer null. Never quote words the pilot did not say, and never infer an element from context: an element that was not said is null, even if it was obvious or the controller said it.
- The pilot's words come from voice-to-text, which regularly mishears. If an element is there in any recognizable form (a phonetically close word, merged or split words, digits instead of words), quote what is there; that counts as present.
- Numbers may be numerals, words, merged or hyphenated: "13", "one three", "thirteen", "1-3" are the same. Runway digits may be merged with callsign digits (e.g. "runway 134521" = runway 13 plus a callsign).
- A runway number means actual digits or number words in the call. "Left downwind" with no number has no runway number: null.
- Where an element must match what the controller said (entry, reporting point, position), compare against the controller's words for that call. A different entry or reporting point than the controller gave is null.
- Abbreviated callsigns, the callsign at the start or the end, and omitting aircraft type or wind are all fine and are not part of what you answer.
- Judge only whether the element was said, never delivery, order or style.

Return raw JSON only, no markdown, with one entry per call in order, each giving exactly the elements asked for, each as the quoted words or null:
{"calls":[{"step":0,"elements":{"tower_name":"Palo Alto Tower"}}]}`

    let parsed
    for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      })
      try {
        const r = parseAIJson(message.content[0].text)
        if (Array.isArray(r.calls) && r.calls.length >= exchanges.length) parsed = r
      } catch {
        console.error('Arrival grade: reply was not valid JSON', message.content[0].text.slice(0, 300))
      }
    }
    if (!parsed) throw new Error('The grader reply could not be read')

    const results = exchanges.map((ex, i) => {
      const said = ex.pilot_said || ''
      const answered = parsed.calls[i]?.elements || {}
      const present = { callsign: !callsignIsAbsent(said, scenario.callsign_spoken, scenario.callsign_display) }
      // A "yes" only counts if the quoted words really are in the transcript.
      for (const k of modelKeys(ex.phase)) present[k] = quoteIsInTranscript(answered[k], said)

      // The model's yes/no can be wrong, so what code can see for itself is checked too: an element
      // the pilot plainly said is never marked missing.
      const rwy = hasRunwayNumber(said, scenario.runway, scenario.callsign_display)
      // Anything about a runway needs an actual runway number in the call.
      for (const k of ['runway', 'clear_runway', 'cleared_to_land']) if (k in present && !rwy) present[k] = false
      if (!present.runway && rwy) present.runway = true
      if (!present.clear_runway && rwy && /clear/i.test(said)) present.clear_runway = true
      if (!present.cleared_to_land && rwy && /clear/i.test(said) && /land/i.test(said)) present.cleared_to_land = true
      if (!present.entry && ex.phase === 'pattern_readback' && hasEntry(said, ex.controller_said)) present.entry = true
      if (!present.report_point && ex.phase === 'pattern_readback' && hasReportPoint(said, ex.controller_said)) present.report_point = true

      return { ex, scored: scoreExchange(ex.phase, present, said) }
    })

    const { overall_score, summary } = summarize(results.map((r) => r.scored))
    return Response.json({
      overall_score,
      summary,
      call_feedback: results.map(({ ex, scored }, i) => ({
        step: ex.step ?? i,
        phase: ex.phase,
        score: scored.score,
        what_you_said: ex.pilot_said || '',
        feedback: scored.feedback,
        key_issue: scored.key_issue,
      })),
    })
  } catch (error) {
    console.error('Class D arrival grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
