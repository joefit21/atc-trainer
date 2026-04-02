import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { scenario, exchanges, squawk_code } = await request.json()

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
Squawk code issued: ${squawk_code || '(see exchange 1 controller_said)'}
Altimeter station: ${scenario.altimeter_station || scenario.facility_name} (e.g. "Denver altimeter, three zero zero three")

EXCHANGES (${exchanges.length} total):
${exchangeText}

═══════════════════════════════════════════════════
REQUIRED ELEMENTS PER EXCHANGE
═══════════════════════════════════════════════════

Exchange 1 — Initial contact (short opener):
- Facility name (e.g., "${scenario.facility_name}") — REQUIRED
- Callsign — REQUIRED (full callsign on first contact)
- Position: distance + direction + reference (e.g., "${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}") — REQUIRED
- DO NOT require aircraft type here — that comes in Exchange 3
- DO NOT require altitude here — that comes in Exchange 4
- DO NOT require destination here — that comes in Exchange 3
- DO NOT require "request flight following" here — that comes in Exchange 3

Exchange 2 — Squawk readback:
- Squawk code — must match the 4-digit code the controller issued (${squawk_code}) — REQUIRED
- Altimeter setting readback — REQUIRED (the controller issued it; pilot reads it back)
- "Ident" / "identing" — NOT REQUIRED verbally. The pilot presses the button but does not have to say the word. NEVER deduct for missing "ident."
- Callsign — REQUIRED

Exchange 3 — Full request (after controller says "go ahead"):
- Aircraft type (e.g., "${scenario.aircraft_type}") — REQUIRED
- Destination (e.g., "${scenario.destination_name}" or "${scenario.destination_id}") — REQUIRED
- Flight following request — REQUIRED. Accept ANY of these phrasings:
  - "request flight following"
  - "flight following to [destination]" ← this IS a valid request phrasing
  - "VFR flight following"
  - "VFR advisories"
  - Any sentence that contains "flight following" anywhere — full credit
  CRITICAL: If the word "flight following" appears anywhere in the transmission, the request requirement is MET. Do NOT penalize for phrasing style.
- Callsign — required

Exchange 4 — State altitude (after controller asks "say altitude"):
- Current altitude (e.g., "${scenario.altitude}") — REQUIRED
- Callsign — required

═══════════════════════════════════════════════════
VOICE-TO-TEXT LENIENCY — apply BEFORE everything else
═══════════════════════════════════════════════════

GOLDEN RULE — NO EXCEPTIONS: If you recognize something as a VTT artifact, transcription error, or voice-to-text issue, you MUST give full credit for that element. VTT artifact = full credit, period. Never say "likely a VTT artifact" and then deduct points. If you identify it as VTT, award full credit and do NOT mention it.

PHONETIC ALPHABET: Any word that sounds remotely like a phonetic letter must be accepted as full credit:
- "Foxdrop", "Foxtrap", "Fox" → Foxtrot ✓
- "November", "No vember" → November ✓
- "Julie and his" → Juliet India ✓ — "and his" is VTT noise
- "Noviembre" → November ✓
Accept any phonetically adjacent word. Never penalize phonetic attempts.

SQUAWK CODE VTT: Squawk codes are often mangled by VTT. Accept all of these:
- "Squawking forty-five twenty-one" → 4521 ✓ — merged digits acceptable
- "Squawking four five to one" → 4521 ✓ — "to" is VTT for "two"
- "Squawking four five two one" → 4521 ✓ — standard digit-by-digit ✓
- Any grouping that contains the recognizable digits in order → accept
If the pilot clearly attempted to read back the squawk code with recognizable digits, accept it.

EXCHANGE 2 GRADING — CRITICAL RULE: Grade Exchange 2 ONLY on what the pilot said vs. the required elements (squawk code + altimeter + callsign). Do NOT look at the controller's next transmission ("go ahead with your request") to judge readback quality. That "go ahead" response is a fixed template — the controller ALWAYS says it regardless of how good or bad the readback was. It is NOT evidence of confusion or a re-issue. Never penalize Exchange 2 based on what happens in Exchange 3.

ALTIMETER VTT: Altimeter digits may merge or be heard differently:
- "Two niner niner two" = 29.92 ✓
- "Three zero one seven" = 30.17 ✓
- Do not penalize for any reasonable phonetic rendering of the altimeter digits.
- The station name (e.g. "Denver", "Salt Lake", "Sacramento") may be omitted in the pilot's readback — do NOT require the pilot to repeat the station name. Accept any correct altimeter digits.
- If the pilot says the station name, accept any phonetically similar rendering.

FACILITY NAME VTT: Any phonetically adjacent word for the facility name must be accepted:
- "NorCal" → NorCal Approach ✓
- "Approach" alone → acceptable shorthand ✓
- Partial facility name → accept if recognizable ✓
- "Seattle" alone → Seattle Approach ✓

NUMBERS AND POSITION:
- Merged or misheared distance + direction words → accept if recognizable
- Altitude stated as combined ("five thousand five hundred" = 5,500) ✓
- Aircraft type phonetic variants → accept ("Cessna" alone, "one seven two" etc.) ✓

DESTINATION VTT: Destinations may be spoken as ICAO identifier phonetics — full credit:
- "Charlie Oscar Sierra" → COS → Colorado Springs ✓
- "Kilo Foxtrot Alpha Tango" → KFAT → Fresno ✓
- "Kilo Bravo Foxtrot India" → KBFI → Boeing Field ✓
- Airport name partial match (e.g., "Colorado Springs" or "Springs") → accept ✓
If the destination is identifiable by name fragment or ICAO phonetics, full credit.

CALLSIGN RULES — MOST IMPORTANT:

N-NUMBER FORMAT: ALL of the following are the same callsign — FULL CREDIT, zero comment:
- Full phonetic: "November Six One Four Bravo India"
- Digit-by-digit: "N 6 1 4 Bravo India"
- VTT split: "N614B, India" ✓
- VTT phonetic mishear: "Julie and his" → Juliet India ✓
- VTT noise prefix: "No. 614 Bravo India" → N614BI ✓
- Any recognizable portion of the callsign → counts

DIGIT TRANSPOSITION — VTT ARTIFACT: VTT frequently transposes adjacent digits. If the digits are recognizably close to the correct callsign (e.g. "735" when the callsign is "375", or "614" when the callsign is "641"), treat it as a VTT artifact — FULL CREDIT. Do NOT penalize for transposed digits.

ABSOLUTE RULE: NEVER use the words "unintelligible", "broken", "split", "sloppy", "garbled", or "unclear" for a callsign.

CALLSIGN POSITION — ABSOLUTE RULE: Callsign at the BEGINNING or END of any transmission — both are equally correct. NEVER mention placement, NEVER say callsign should come first or last, NEVER deduct for position.

═══════════════════════════════════════════════════
SCORING BANDS
═══════════════════════════════════════════════════
- 97–100: All required elements present, clean call
- 90–96: All required elements present, minor wording only
- 75–89: Missing one minor element
- 60–74: Missing one significant required element
- Below 60: Missing multiple required elements

SCORE CONSISTENCY RULE — MANDATORY: Your score and your feedback MUST match.
- If your feedback describes no real problems → score MUST be 97–100
- If your feedback says everything is fine or only notes VTT artifacts you are excusing → score MUST be 97–100
- A score below 90 means you found something genuinely wrong that you can name explicitly
- NEVER give a low score while describing no actual error — that is a contradiction and is not allowed

FEEDBACK STYLE:
- One to two sentences per exchange maximum
- Only describe what was genuinely wrong or missing
- If a call is perfect, say so in one short sentence
- Do not lecture. Assume the pilot knows the basics.
- Never comment on diction, delivery style, or VTT artifacts you identified
- Do NOT comment on things that are not required for that exchange
- Do NOT penalize for things you identified as VTT artifacts — excused artifacts must not affect the score

CRITICAL: Return EXACTLY ${exchanges.length} items in call_feedback.

Return raw JSON only, no markdown:
{
  "overall_score": 85,
  "summary": "One to two sentence overall assessment.",
  "call_feedback": [
    {
      "step": 0,
      "phase": "initial_contact",
      "score": 90,
      "what_you_said": "exact transcription",
      "feedback": "Brief CFI-style feedback.",
      "key_issue": "One-line issue summary or null."
    }
  ]
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
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
