// Runs one graded scenario: asks the model to QUOTE the words that satisfy each required element,
// checks the quotes against the transcript, applies the scenario's own code checks, and scores in
// code (lib/call-scoring.mjs). The response has the shape the practice lab already displays.
import { parseAIJson } from './parse-json.js'
import { modelKeys, scoreCall, summarize, quoteIsInTranscript, callsignIsAbsent, spokenDigits } from './call-scoring.mjs'

// calls: [{ step, phase, situation, pilot_said, controller_said? }]
// table / help: see the scenario files. rescue(present, call, scenario, answers): code checks that can only
// ever mark an element present (never absent) when the pilot plainly said it.
export async function gradeCalls({ anthropic, title, scenarioText, scenario, calls, table, help, extraRules = [], rescue, what = 'calls', cleanLabel }) {
  const helpFor = (key, call) => (typeof help[key] === 'function' ? help[key](scenario, call) : help[key])
  const callsText = calls.map((c, i) => {
    const keys = modelKeys(table, c.phase, c, scenario)
    return `Call ${i} (${c.phase.replace(/_/g, ' ')})
${c.controller_said ? `Controller said: "${c.controller_said}"\n` : ''}Pilot said: "${c.pilot_said || '(nothing recorded)'}"
Quote the pilot's words for: ${keys.length ? keys.map((k) => `${k} (${helpFor(k, c)})`).join('; ') : '(nothing to answer)'}`
  }).join('\n\n')

  const prompt = `You are a CFI and former air traffic controller checking a student pilot's radio calls (${title}). You are NOT scoring them. For each call, find the required elements in what the pilot said. A separate program does the scoring.

SCENARIO:
${scenarioText}

CALLS:
${callsText}

HOW TO ANSWER:
- For each element, copy WORD FOR WORD the part of the pilot's call that satisfies it. If the element is not there, answer null. Never quote words the pilot did not say, and never infer an element from context: an element that was not said is null, even if it was obvious or the controller said it.
- The pilot's words come from voice-to-text, which regularly mishears. If an element is there in any recognizable form (a phonetically close word, merged or split words, digits instead of words), quote what is there; that counts as present.
- Numbers may be numerals, words, merged or hyphenated: "13", "one three", "thirteen", "1-3" are the same. Runway digits may be merged with callsign digits (e.g. "runway 134521" = runway 13 plus a callsign).
- A runway number means actual digits or number words in the call. "Left downwind" with no number has no runway number: null.
- Where an element must match what the controller said, compare against the controller's words for that call. A different one than the controller gave is null.
- Abbreviated callsigns, the callsign at the start or the end, and leaving out anything not listed above are all fine and are not part of what you answer.
- Judge only whether the element was said, never delivery, order or style.${extraRules.map((r) => `\n- ${r}`).join('')}

Return raw JSON only, no markdown, with one entry per call in order, each giving exactly the elements asked for, each as the quoted words or null:
{"calls":[{"step":0,"elements":{"element_name":"quoted words"}}]}`

  let parsed
  for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1800,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    try {
      const r = parseAIJson(message.content[0].text)
      if (Array.isArray(r.calls) && r.calls.length >= calls.length) parsed = r
    } catch {
      console.error('Grader reply was not valid JSON:', message.content[0].text.slice(0, 300))
    }
  }
  if (!parsed) throw new Error('The grader reply could not be read')

  const csAbsent = (s) => callsignIsAbsent(s, scenario.callsign_spoken, scenario.callsign_display)
  const results = calls.map((call, i) => {
    const said = call.pilot_said || ''
    const answered = parsed.calls[i]?.elements || {}
    const present = { callsign: !csAbsent(said) }
    for (const e of table[call.phase] || []) {
      if (e.modelAnswers === false || (e.when && !e.when(call, scenario))) continue
      present[e.key] = quoteIsInTranscript(answered[e.key], said, e.where || null, csAbsent)
      // Elements that must contain a number (a runway) need an actual number in the quote.
      if (present[e.key] && e.needsNumber && !spokenDigits(answered[e.key])) present[e.key] = false
    }
    if (rescue) rescue(present, call, scenario, answered)
    return { call, scored: scoreCall(table, call.phase, present, said, call, scenario) }
  })

  const { overall_score, summary } = summarize(results.map((r) => r.scored), what, cleanLabel)
  return {
    overall_score,
    summary,
    call_feedback: results.map(({ call, scored }, i) => ({
      step: call.step ?? i,
      phase: call.phase,
      score: scored.score,
      what_you_said: call.pilot_said || '',
      feedback: scored.feedback,
      key_issue: scored.key_issue,
    })),
  }
}
