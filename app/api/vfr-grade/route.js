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
- Inbound (10 miles): airport name + "traffic", callsign, distance and direction from airport, landing intent, runway number, airport name repeated at end
- Entering 45°: airport name + "traffic", callsign, "entering 45" or "45 for the [pattern] downwind", runway number, airport name repeated at end
- Base: airport name + "traffic", callsign, "[left/right] base", runway number, airport name repeated at end
- Final: airport name + "traffic", callsign, "final", runway number, full stop OR touch-and-go explicitly stated, airport name repeated at end
- Clear of runway: airport name + "traffic", callsign, "clear of runway [specific number]", airport name repeated at end

LANDING INTENT (inbound call only):
Accepted phrases: "inbound for landing", "inbound for the full stop", "inbound for runway [X]", "landing [airport]", or any equivalent that clearly states the pilot intends to land. "Inbound for runway [X]" is fully acceptable — the runway reference makes intent obvious. Do NOT penalize any phrasing that clearly communicates landing intent.

AIRPORT NAME RULES — strictly enforced:
- Every call must BEGIN with "[Airport name] traffic" — if this is missing from the start of the transmission, deduct 10 points. Do not accept the end-of-call repeat as satisfying the opening requirement.
- Every call must END with the airport name repeated — if missing, deduct 5 points
- Both missing = deduct 15 points total
- Check the BEGINNING of the transcript first. If the transmission starts with a callsign or any word other than the airport name, the opening "[Airport] traffic" is missing.

RUNWAY NUMBER — STRICTLY ENFORCED ON ALL CALLS:
The runway number (a digit or digits, e.g. "16", "one six", "runway 7", "runway 1") is REQUIRED on every call. You MUST find an actual number in the transcript — do NOT infer it from context, from the situation description, or from the pattern leg name.
- "right base" alone → runway number ABSENT
- "left downwind" alone → runway number ABSENT
- "final" alone → runway number ABSENT
- "runway 1", "runway one", "one", "16", "one six" → runway number PRESENT
If the runway number is absent, score that call 60–74 maximum and note it in feedback. Do not credit the runway as present unless an actual number appears in the pilot's transcript text.

FINAL CALL — extra elements strictly enforced:
In addition to the runway number, the pilot MUST explicitly state their intention: "full stop", "touch and go", or "option". Do not infer this from context or situation description. If neither is stated in the transcript, deduct points and note it.

FEEDBACK LANGUAGE — CTAF IS UNCONTROLLED:
CTAF frequencies have no controller. Never write "controllers need to hear", "ATC", or any reference to a controller. Use "other traffic", "other pilots", or "traffic in the area" instead.

CLEAR OF RUNWAY — strictly enforced:
- The pilot MUST say "clear of runway [number]" — e.g., "clear of runway 33"
- "Clear of the active", "clear of the runway", "runway clear", or any other non-specific phrasing is NOT acceptable and scores 60 maximum
- The specific runway number is required so other traffic knows exactly which runway is clear
- If the pilot says "clear of the active" or similar, flag it clearly: they must state the runway number

VOICE-TO-TEXT LENIENCY — apply this before everything else:
The transcriptions you receive come from a speech-to-text engine that regularly mishears words. You MUST treat every transcription as an approximation of spoken audio and apply maximum leniency to the following:

GOLDEN RULE — NO EXCEPTIONS: If you recognize something as a VTT artifact, transcription error, or voice-to-text issue, you MUST give full credit for that element and score it as if the pilot said it perfectly. Identifying it as VTT means the pilot said the correct thing and the machine transcribed it wrong. Never say "likely a VTT artifact" and then deduct points. Never say "this is a VTT issue" and then deduct points. VTT artifact = full credit, period.

AIRPORT NAME VTT LENIENCY: Any phonetically adjacent word for the airport name must be accepted as full credit — e.g., "Auburn" mishears, partial names, or nearby-sounding words all count.

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

CALLSIGN RULES — THE MOST IMPORTANT SECTION. READ BEFORE SCORING ANYTHING.

The callsign WILL be garbled by VTT every time. Your job is only to recognize whether it is present — not to critique its format, delivery, or placement.

N-NUMBER FORMAT: ALL of the following represent the same callsign and must receive FULL CREDIT with zero deduction and zero comment:
- Full phonetic: "November Six One Four Bravo India"
- Digit-by-digit (standard FAA): "November 6, 1, 4, Bravo, India" — never flag this
- VTT split mid-callsign: "N614B, India" — VTT inserted a break; both parts are one callsign ✓
- VTT split abbreviated: "614 Bravo, India" — abbreviated + VTT break ✓
- VTT phonetic mishear: "Julie and his" → Juliet India ✓ — "and his" is VTT noise between phonetics
- VTT noise prefix: "No. 614 Bravo India" → N614BI ✓ — "No." is VTT for November/N-prefix
- "Number 614 Bravo India" → N614BI ✓ — "Number" is VTT noise
- Any other combination: if you can match digits and/or phonetics to the actual callsign, it IS the callsign

ABSOLUTE RULE: If ANY recognizable portion of the callsign is present (digits, phonetics, or fragments), it counts as the full callsign. NEVER use the words "unintelligible", "broken", "split", "sloppy", "garbled", or "unclear" to describe a callsign. NEVER suggest the pilot say it differently.

CALLSIGN POSITION — ABSOLUTE RULE: The callsign may appear at the BEGINNING or END of any transmission. Both are equally correct standard phraseology. You must NEVER:
- Mention that the callsign came at the end
- Suggest it should be at the beginning
- Say "callsign should come first" or comment on "callsign placement"
- Deduct any points for where the callsign appears
Only check: is the callsign present somewhere? If yes, full credit — move on.

VTT NOISE WORDS: Any unexpected word adjacent to the callsign ("and his", "or", "No.", "Number", "Clipper") is VTT noise. Ignore it entirely.

AIRCRAFT TYPE: Aircraft type is recommended but NOT required on CTAF. Do not deduct any points for omitting it on any call. You may add it as a one-sentence optional tip at the very end of feedback only if the score is already 97+, but it must never lower the score.

ABBREVIATION: After the first call, abbreviated callsigns (last 3 characters, e.g. "614 Bravo India") are standard and correct. Never penalize abbreviation on calls 2–5.

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
