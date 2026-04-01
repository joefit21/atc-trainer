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

    const prompt = `You are a CFI and former air traffic controller evaluating a student pilot's radio calls during a Class D airport departure. Be direct and practical, like a post-flight debrief.

SCENARIO:
Airport: ${scenario.airport_name} (${scenario.airport_id}) — Class D
Aircraft: ${scenario.aircraft_type} ${scenario.callsign_display}
ATIS: Information ${scenario.atis.letter}
Departure runway: ${scenario.runway}
Ground freq: ${scenario.ground_freq} / Tower freq: ${scenario.tower_freq}

EXCHANGES (${exchanges.length} total):
${exchangeText}

REQUIRED ELEMENTS:

Exchange 1 — Initial ground call:
- "[Airport] Ground" (e.g., "${scenario.airport_name} Ground")
- Aircraft type AND callsign
- Current position on airport
- "With Information [letter]" — must include current ATIS letter
- Request to taxi (runway optional but encouraged)

Exchange 2 — Ground readback:
- Callsign (abbreviated OK after first call)
- Runway number
- Taxiway designator
- Any hold short instruction if one was issued

Exchange 3 — Tower call at hold short:
- "[Airport] Tower"
- Aircraft type AND callsign
- "Holding short of Runway [X]" or equivalent position
- Departure direction or intention (e.g., "northbound departure", "closed traffic") — required
- "Ready for departure" or equivalent
- Do NOT require or penalize for ATIS letter — it was already established with Ground

Exchange 4 — Tower readback:
- Callsign
- Runway: "cleared for takeoff runway [X]" or equivalent
- Any heading instruction if one was issued
- Do NOT require a departure frequency — none was issued in this exercise

VOICE-TO-TEXT LENIENCY — apply this before everything else:
The transcriptions you receive come from a speech-to-text engine that regularly mishears words. You MUST treat every transcription as an approximation of spoken audio and apply maximum leniency to the following:

PHONETIC ALPHABET: Any word that sounds remotely like a phonetic letter must be accepted as full credit. Examples (not exhaustive):
- "Foxdrop", "Foxtrap", "Foxtro", "Fox" → Foxtrot ✓
- "Bravo", "Bracco", "Gravo" → Bravo ✓
- "November", "No vember", "Novem" → November ✓
- "Whiskey", "Whisk" → Whiskey ✓
- "Tango", "Tangle" → Tango ✓
Accept any phonetically adjacent word as the correct phonetic letter. Never penalize phonetic alphabet attempts.

NUMBERS AND FREQUENCIES: Voice-to-text frequently mishears spoken numbers. Examples:
- "Windsor and" → "one two" ✓
- "Wine" → "niner" ✓
- Runway numbers said as single digits or merged ("thirteen" for "one three") → accept it ✓
- Frequencies with slight digit variations → accept if recognizable ✓
- Altimeter settings with minor digit errors → accept if close ✓

GENERAL LENIENCY:
- If the pilot clearly attempted a required element and it is phonetically recognizable, it counts as full credit
- Do not penalize for voice-to-text artifacts under any circumstances
- When in doubt, give the benefit of the doubt

CALLSIGN RULES — read carefully before scoring anything callsign-related:

N-NUMBER FORMAT: Voice-to-text produces many different formats of the exact same callsign. ALL of the following are correct and must receive full credit with zero deduction:
- Full phonetic: "November Six One Four Bravo India"
- Digit-by-digit (standard FAA): "November 6, 1, 4, Bravo, India" — this IS standard FAA phraseology, never flag it
- Split by VTT: "N614B, India" or "N614 Bravo India" — the letters got separated, accept it
- Abbreviated: "614 Bravo India" or "14 Bravo India" — acceptable on subsequent calls
- Merged: "N614BI" — accept it
- Mixed: "November 614 Bravo India" — accept it
If the callsign is recognizable in any form, it is correct. Do not comment on callsign format at all.

AIRCRAFT TYPE: Aircraft type is recommended but NOT required. Do not deduct any points for omitting it on any exchange.

ABBREVIATION: After the first exchange, abbreviated callsigns are standard and correct. Never penalize abbreviation on exchanges 2–4.

READBACK RULES:
- Only grade on what the controller ACTUALLY said in that exchange
- If the controller did not issue a hold short, do not penalize for not reading one back
- If the controller did not give a departure frequency, do not penalize for not reading one back

SCORING BANDS — use these precisely:
- 97–100: All required elements present, no issues whatsoever — a truly clean call
- 90–96: All required elements present, minor wording imperfection only (e.g., slightly non-standard phrasing a controller would still understand)
- 75–89: Missing one minor element (e.g., forgot ATIS letter, forgot position)
- 60–74: Missing one significant element (e.g., no runway, no clearance confirmation)
- Below 60: Missing multiple required elements

Do NOT give a score of 90 if all elements are present and correct. That score implies something is wrong. 97–100 means a truly clean call.

FEEDBACK STYLE:
- One to two sentences per exchange maximum
- Only describe what was genuinely wrong or missing — do not comment on things that were correct
- If a call is perfect, say so in one short sentence and move on
- Do not lecture. Assume the pilot knows the basics.

CRITICAL: Return EXACTLY ${exchanges.length} items in call_feedback.

Return raw JSON only, no markdown:
{
  "overall_score": 85,
  "summary": "One to two sentence overall assessment.",
  "call_feedback": [
    {
      "step": 0,
      "phase": "ground_call",
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
    console.error('Class D grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
