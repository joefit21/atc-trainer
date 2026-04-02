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

    const prompt = `You are a CFI and former air traffic controller evaluating a student pilot's radio calls during a Class D airport arrival. Be direct and practical, like a post-flight debrief.

SCENARIO:
Airport: ${scenario.airport_name} (${scenario.airport_id}) — Class D
Aircraft: ${scenario.aircraft_type} ${scenario.callsign_display}
ATIS: Information ${scenario.atis.letter}
Active runway: ${scenario.runway}, ${scenario.pattern} traffic
Tower freq: ${scenario.tower_freq} / Ground freq: ${scenario.ground_freq}
Pilot was inbound from the ${scenario.approach_direction}, ${scenario.approach_distance} miles, at ${scenario.approach_altitude} ft MSL
Parking destination: ${scenario.parking_destination}

EXCHANGES (${exchanges.length} total):
${exchangeText}

REQUIRED ELEMENTS:

Exchange 1 — Initial tower call (inbound):
- "[Airport] Tower" (e.g., "${scenario.airport_name} Tower")
- Aircraft type AND callsign
- Distance and direction from airport (e.g., "10 miles northwest")
- Altitude — OPTIONAL. Do NOT deduct any points for omitting altitude. Never comment on missing altitude.
- "With Information [letter]" — must include current ATIS letter
- Intention to land: "inbound for landing", "inbound for the full stop", "inbound for landing full stop", or any equivalent phrasing indicating they want to land — REQUIRED. Deduct points if omitted entirely.

Exchange 2 — Pattern entry readback:
- Callsign
- Entry type: either "[left/right] downwind runway [X]" OR "straight in runway [X]" — must match what controller said
- Runway number
- Reporting point: either "midfield" (for downwind entry) or "three-mile final" / "3-mile final" (for straight-in)

Exchange 3 — Position report:
- Callsign — this is the ONLY identifier required; do NOT require or penalize for missing "[Airport] Tower"
- Position matching the reporting point controller specified:
  - If downwind entry: "midfield [left/right] downwind runway [X]" or equivalent
  - If straight-in: "[X]-mile final runway [X]" or equivalent
- Must include runway number
- CRITICAL: Do NOT comment on or suggest that calling "[Airport] Tower" would be good practice. It is not required and mentioning it at all is wrong. Never reference the omission of the facility name on a position report.

Exchange 4 — Landing clearance readback:
- Callsign (may be at beginning OR end — both are standard)
- "Cleared to land runway [X]" or equivalent
- Wind: OPTIONAL — do NOT deduct points for omitting wind, even if the controller stated it. Never comment on missing wind readback.

Exchange 5 — Clear of runway / call Ground:
- "[Airport] Ground" — this call goes to Ground Control, NOT Tower
- Callsign
- "Clear of runway [specific number]" — the exact runway number is required
- "Clear of the active", "clear of the runway", or any non-specific phrasing scores 60 maximum
- Request taxi to parking (e.g., "request taxi to the GA ramp", "taxi to the FBO") — required
- The specific runway number must be stated so other traffic knows which runway is clear

Exchange 6 — Ground taxi readback:
- Callsign (may be at beginning OR end)
- Taxiway designator issued by Ground
- Destination (e.g., "GA ramp", "FBO", "transient ramp")

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
- "Windsor and Miles" → "ten miles" ✓
- "Wine miles" → "nine miles" ✓
- "Wine" → "niner" ✓
- Runway numbers said as merged words ("thirteen" for "one three"), hyphenated ("3-1"), or with "er" suffix ("29er") → ALL acceptable ✓
- "Threemaw", "Three-maw", "Three Ma", "Thre mile" → "three-mile" ✓ — never penalize VTT mishearing of "three-mile final"
- Altitude with minor digit variation → accept if recognizable ✓
- Frequencies with slight digit variations → accept if recognizable ✓

DESTINATION AND PLACE NAMES: Voice-to-text frequently merges multi-word destinations. Examples:
- "Westramp", "West-ramp" → "west ramp" ✓
- "GAramp", "G A ramp" → "GA ramp" ✓
- "Transientramp" → "transient ramp" ✓
- "FBOramp" → "FBO ramp" ✓
Any merged or split version of a destination name must be accepted as full credit. Never penalize for destination word spacing or merging.

FEEDBACK STYLE RULE: Never comment on "sloppy diction", "delivery", or suggest the pilot "say it more clearly" for any element — these are VTT artifacts, not pilot delivery issues. Only comment on missing or incorrect required elements.

GENERAL LENIENCY:
- If the pilot clearly attempted a required element and it is phonetically recognizable, it counts as full credit
- Do not penalize for voice-to-text artifacts under any circumstances
- When in doubt, give the benefit of the doubt

CALLSIGN RULES — THE MOST IMPORTANT SECTION. READ BEFORE SCORING ANYTHING.

The callsign WILL be garbled by VTT every time. Your job is only to recognize whether it is present — not to critique its format, delivery, or placement.

N-NUMBER FORMAT: ALL of the following represent the same callsign and must receive FULL CREDIT with zero deduction and zero comment:
- Full phonetic: "November Five Seven Four Juliet India"
- Digit-by-digit (standard FAA): "November 5, 7, 4, Juliet, India" — never flag this
- VTT split mid-callsign: "N574J, India" — VTT inserted a break; both parts are one callsign ✓
- VTT split abbreviated: "574 Juliet, India" — abbreviated + VTT break ✓
- VTT phonetic mishear: "Julie and his" → Juliet India ✓ — "and his" is VTT noise between phonetics
- VTT noise prefix: "No. 574 Juliet India" → N574JI ✓ — "No." is VTT for November/N-prefix
- "Number 574 Juliet India" → N574JI ✓ — "Number" is VTT noise
- Any other combination: if you can match digits and/or phonetics to the actual callsign, it IS the callsign

ABSOLUTE RULE: If ANY recognizable portion of the callsign is present (digits, phonetics, or fragments), it counts as the full callsign. NEVER use the words "unintelligible", "broken", "split", "sloppy", "garbled", or "unclear" to describe a callsign. NEVER suggest the pilot say it differently.

CALLSIGN POSITION — ABSOLUTE RULE: The callsign may appear at the BEGINNING or END of any transmission. Both are equally correct standard phraseology. You must NEVER:
- Mention that the callsign came at the end
- Suggest it should be at the beginning
- Say "callsign should come first" or "callsign placement"
- Deduct any points for where the callsign appears
Only check: is the callsign present somewhere in the transmission? If yes, full credit for callsign — move on.

VTT NOISE WORDS: Any unexpected word adjacent to the callsign ("and his", "or", "No.", "Number", "Clipper", "Clifford") is VTT noise inserted near the callsign. Ignore it entirely.

READBACK VTT ARTIFACTS: Garbled strings of numbers and phonetics are VTT artifacts — NOT made-up content. Extract recognizable elements and grade only on those. VTT noise never lowers the score; only genuine omissions of required elements lower the score.

AIRCRAFT TYPE: Not required on any exchange. Never deduct points for omitting it.

ABBREVIATION: After the first exchange, abbreviated callsigns are standard. Never penalize abbreviation on exchanges 2–6.

READBACK RULES:
- Only grade on what the controller ACTUALLY said in that exchange
- If the controller did not state wind, do not penalize for not reading it back

SCORING BANDS — use these precisely:
- 97–100: All required elements present, no issues whatsoever — a truly clean call
- 90–96: All required elements present, minor wording imperfection only
- 75–89: Missing one minor element (e.g., forgot ATIS letter, forgot altitude)
- 60–74: Missing one significant element (e.g., no runway, no distance/direction on inbound)
- Below 60: Missing multiple required elements

Do NOT give a score of 90 if all elements are present and correct. 97–100 means a truly clean call.

FEEDBACK STYLE:
- One to two sentences per exchange maximum
- Only describe what was genuinely wrong or missing
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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result  = JSON.parse(rawText)

    if (Array.isArray(result.call_feedback)) {
      result.call_feedback = result.call_feedback.slice(0, exchanges.length)
    }

    return Response.json(result)

  } catch (error) {
    console.error('Class D arrival grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
