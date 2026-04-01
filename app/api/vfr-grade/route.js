import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { scenario, calls } = await request.json()

    const callsText = calls.map((c, i) =>
      `Call ${i + 1} — ${c.situation}\nPilot said: "${c.transcription || '(no audio recorded)'}"`
    ).join('\n\n')

    const prompt = `You are a CFI and former air traffic controller evaluating a student pilot's CTAF radio calls at an uncontrolled airport. Be direct and practical, like a CFI debriefing after a flight.

SCENARIO:
Airport: ${scenario.airport_name} (${scenario.airport_id}), CTAF ${scenario.ctaf}
Aircraft: ${scenario.aircraft_type} ${scenario.callsign_display}
Runway in use: ${scenario.runway}, ${scenario.pattern} traffic

PILOT'S CALLS (${calls.length} total):
${callsText}

REQUIRED ELEMENTS by call type:
- Inbound (10 miles): airport name + "traffic", aircraft type, callsign, distance and direction from airport, "inbound for landing", runway number
- Entering 45°: airport name + "traffic", aircraft type, callsign, "entering 45" or "45 for the [pattern] downwind", runway
- Base: airport name + "traffic", aircraft type, callsign, "[left/right] base", runway
- Final: airport name + "traffic", aircraft type, callsign, "final", runway, full stop or touch and go
- Clear of runway: airport name + "traffic", aircraft type, callsign, "clear of runway [number]"

VOICE-TO-TEXT LENIENCY — apply this before everything else:
The transcriptions you receive come from a speech-to-text engine that regularly mishears words. You MUST treat every transcription as an approximation of spoken audio and apply maximum leniency to the following:

PHONETIC ALPHABET: Any word that sounds remotely like a phonetic letter must be accepted as full credit. Examples (not exhaustive):
- "Foxdrop", "Foxtrap", "Foxtro", "Fox" → Foxtrot ✓
- "Bravo", "Bracco", "Gravo" → Bravo ✓
- "November", "No vember", "Novem" → November ✓
- "Whiskey", "Whisk" → Whiskey ✓
- "Tango", "Tangle" → Tango ✓
Accept any phonetically adjacent word as the correct phonetic letter. Never penalize phonetic alphabet attempts.

NUMBERS AND DISTANCES: Voice-to-text frequently mishears spoken numbers and distances. Examples:
- "Windsor and Miles West" → "ten miles west" ✓
- "Wine miles" → "nine miles" ✓
- Any combination of words that roughly sounds like a distance + direction is acceptable ✓
- Runway numbers said as single digits (e.g. "one" for runway 1) are always acceptable ✓

GENERAL LENIENCY:
- If the pilot clearly attempted a required element and it is phonetically recognizable, it counts as full credit
- Do not penalize for voice-to-text artifacts under any circumstances
- When in doubt, give the benefit of the doubt

CALLSIGN RULES:
- First call: full callsign preferred (aircraft type + full N-number in phonetic). If missing aircraft type, minor deduction only.
- Subsequent calls (calls 2–5): abbreviation is acceptable and common in practice. Last 3 characters of N-number is standard abbreviated form. Do NOT penalize abbreviation after the first call.
- If the callsign is partially recognizable, accept it.

SCORING BANDS — use these precisely:
- 97–100: All required elements present, no issues whatsoever
- 90–96: All required elements present, minor wording imperfection only (e.g. slightly non-standard phrasing that a controller would still understand)
- 75–89: Missing one minor element (e.g. didn't repeat airport name at end, omitted aircraft type on a later call)
- 60–74: Missing one significant element (e.g. no runway number, or no position on the inbound call)
- Below 60: Missing multiple required elements or callsign entirely absent

Do NOT give a score of 90 if all elements are present and correct. That score implies something is wrong. 97–100 means truly clean call.

FEEDBACK STYLE:
- One to two sentences per call maximum
- Only describe what was genuinely wrong or missing — do not comment on things that were correct
- If a call is perfect, say so in one short sentence and move on
- Do not lecture. Do not explain what CTAF is. Assume the pilot knows the basics.

CRITICAL: You must return EXACTLY ${calls.length} items in call_feedback — one per call, in order. Do not add extra calls or combine calls.

Return raw JSON only, no markdown:
{
  "overall_score": 85,
  "summary": "One to two sentence overall assessment of the full sequence.",
  "call_feedback": [
    {
      "step": 0,
      "phase": "inbound_10",
      "score": 97,
      "what_you_said": "exact transcription text here",
      "feedback": "Brief CFI-style feedback.",
      "key_issue": "One-line summary of the main issue, or null if none."
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(rawText)

    // Safety: never return more feedback items than calls were submitted
    if (Array.isArray(result.call_feedback)) {
      result.call_feedback = result.call_feedback.slice(0, calls.length)
    }

    return Response.json(result)

  } catch (error) {
    console.error('VFR grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
