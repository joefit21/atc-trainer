import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { scenario, exchanges } = await request.json()

    const exchangeText = exchanges.map((ex, i) => {
      const base = `Exchange ${i + 1} — ${ex.phase.replace(/_/g, ' ')}\nSituation: ${ex.situation}\nPilot said: "${ex.pilot_said || '(nothing recorded)'}"`
      if (ex.controller_said) return base + `\nController said: "${ex.controller_said}"`
      return base
    }).join('\n\n')

    const prompt = `You are a CFI and former air traffic controller evaluating a student pilot's VFR flight following request. Be direct and practical, like a post-flight debrief.

SCENARIO:
Facility: ${scenario.facility_name} (${scenario.facility_freq})
Aircraft: ${scenario.aircraft_type} ${scenario.callsign_display}
Position: ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}
Altitude: ${scenario.altitude} ft MSL
Destination: ${scenario.destination_name} (${scenario.destination_id})
Altimeter: ${scenario.altimeter}

EXCHANGES (${exchanges.length} total):
${exchangeText}

REQUIRED ELEMENTS:

Exchange 1 — Initial flight following request:
- Facility name (e.g., "${scenario.facility_name}") — required
- Aircraft type AND callsign — required on initial call
- Current position: distance + direction from reference (e.g., "${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}") — required
- Altitude (e.g., "${scenario.altitude}") — required
- Destination: airport name or ID (e.g., "${scenario.destination_name}") — required
- "Request flight following", "VFR advisories", or equivalent request — required

Exchange 2 — Squawk readback:
- "Squawking [code]" — must match the specific 4-digit code the controller issued
- "Ident" or "identing" — required (pilot is confirming they pressed the ident button)
- Callsign

Exchange 3 — Radar contact acknowledgment:
- Callsign — required
- Acknowledge receipt ("roger", "wilco", or similar) — required
- Altimeter readback — OPTIONAL. Do NOT deduct points for omitting it.

VOICE-TO-TEXT LENIENCY — apply this before everything else:

GOLDEN RULE — NO EXCEPTIONS: If you recognize something as a VTT artifact, transcription error, or voice-to-text issue, you MUST give full credit for that element. VTT artifact = full credit, period. Never say "likely a VTT artifact" and then deduct points.

PHONETIC ALPHABET: Any word that sounds remotely like a phonetic letter must be accepted as full credit:
- "Foxdrop", "Foxtrap", "Fox" → Foxtrot ✓
- "Bravo", "Bracco" → Bravo ✓
- "November", "No vember" → November ✓
- "Julie and his" → Juliet India ✓ — "and his" is VTT noise
Accept any phonetically adjacent word. Never penalize phonetic attempts.

SQUAWK CODE VTT: The 4-digit squawk code will often be mangled by VTT. Examples:
- "Squawking forty-five twenty-one" → 4521 ✓ — merged digits are acceptable
- "Squawking four five to one" → 4521 ✓ — "to" is VTT for "two"
- "Squawking four five two one" → 4521 ✓ — standard digit-by-digit ✓
If the pilot clearly attempted to read back the squawk code with recognizable digits, accept it.

NUMBERS AND POSITION: Distance/direction VTT leniency:
- Merged or misheared distance + direction words → accept if recognizable
- Altitude said as combined number ("five thousand five hundred" = 5,500) ✓
- Any phonetically close facility name → accept (e.g., "NorCal" → NorCal Approach ✓)

FACILITY NAME VTT: Any phonetically adjacent word for the facility name must be accepted:
- "NorCal" → NorCal Approach ✓
- "Approach" alone → acceptable shorthand ✓
- Partial facility name → accept if recognizable ✓

CALLSIGN RULES — THE MOST IMPORTANT SECTION:

N-NUMBER FORMAT: ALL of the following are the same callsign — FULL CREDIT, zero comment:
- Full phonetic: "November Six One Four Bravo India"
- Digit-by-digit: "November 6, 1, 4, Bravo, India"
- VTT split: "N614B, India" ✓
- VTT phonetic mishear: "Julie and his" → Juliet India ✓
- VTT noise prefix: "No. 614 Bravo India" → N614BI ✓
- Digit extraction: "Number 9 or 3, 6, Juliet Echo" → N936JE ✓

ABSOLUTE RULE: If ANY recognizable portion of the callsign is present, it counts. NEVER use the words "unintelligible", "broken", "split", "sloppy", "garbled", or "unclear" for a callsign.

CALLSIGN POSITION — ABSOLUTE RULE: Callsign at the BEGINNING or END of any transmission — both are equally correct. NEVER mention placement, NEVER say callsign should come first, NEVER deduct for position.

READBACK RULES:
- Only grade Exchange 2 squawk readback against what the controller ACTUALLY issued
- Only grade Exchange 3 against what the radar contact message ACTUALLY said
- Altimeter in Exchange 3 is optional — never penalize for omitting

SCORING BANDS:
- 97–100: All required elements present, clean call
- 90–96: All required elements present, minor wording only
- 75–89: Missing one minor element
- 60–74: Missing one significant element (e.g., no position, no destination, no squawk code)
- Below 60: Missing multiple required elements

Do NOT score 90 if everything is correct — that implies something is wrong. 97–100 = truly clean.

FEEDBACK STYLE:
- One to two sentences per exchange maximum
- Only describe what was genuinely wrong or missing
- If a call is perfect, say so in one short sentence
- Do not lecture. Assume the pilot knows the basics.
- Never comment on diction, delivery style, or VTT artifacts

CRITICAL: Return EXACTLY ${exchanges.length} items in call_feedback.

Return raw JSON only, no markdown:
{
  "overall_score": 85,
  "summary": "One to two sentence overall assessment.",
  "call_feedback": [
    {
      "step": 0,
      "phase": "initial_call",
      "score": 90,
      "what_you_said": "exact transcription",
      "feedback": "Brief CFI-style feedback.",
      "key_issue": "One-line issue summary or null."
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result  = JSON.parse(rawText)

    if (Array.isArray(result.call_feedback)) {
      result.call_feedback = result.call_feedback.slice(0, exchanges.length)
    }

    return Response.json(result)

  } catch (error) {
    console.error('Flight following grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
