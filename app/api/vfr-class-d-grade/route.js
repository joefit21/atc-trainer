import { parseAIJson } from '@/lib/parse-json'
import Anthropic from '@anthropic-ai/sdk'
import { requireSubscribed } from '@/lib/require-auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PHONETIC_WORDS = new Set([
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india',
  'juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo',
  'sierra','tango','uniform','victor','whiskey','xray','yankee','zulu'
])
const AIRLINE_WORDS = new Set([
  'american','united','southwest','jetblue','spirit','frontier',
  'alaska','hawaiian','allegiant'
])

// Returns true if the callsign is completely absent from the pilot's text.
// Checks for phonetic and airline tokens from the spoken callsign — digit words
// (one, two, etc.) are intentionally excluded because they appear in runway
// numbers and altitudes, causing false positives.
function callsignIsAbsent(pilotSaid, callsignSpoken, callsignDisplay) {
  if (!pilotSaid || pilotSaid.trim() === '') return true
  const text = pilotSaid.toLowerCase().replace(/[-\s]/g, '')

  // Check for N-number written directly (e.g. "N4521H", "N-4521H")
  // Strip non-alphanumeric from display and check if it appears in the text
  if (callsignDisplay) {
    const displayStripped = callsignDisplay.toLowerCase().replace(/[-\s]/g, '')
    if (text.includes(displayStripped)) return false
    // Also check just the numeric portion (e.g. "4521") for partial matches
    const digits = displayStripped.replace(/[a-z]/g, '')
    if (digits.length >= 3 && text.includes(digits)) return false
  }

  const textWithSpaces = pilotSaid.toLowerCase()
  const tokens = callsignSpoken.toLowerCase().split(/\s+/)
  const distinctive = tokens.filter(t => PHONETIC_WORDS.has(t) || AIRLINE_WORDS.has(t))
  if (distinctive.length === 0) {
    return !tokens.some(t => textWithSpaces.includes(t))
  }
  return !distinctive.some(t => textWithSpaces.includes(t))
}

export async function POST(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  try {
    const { scenario, exchanges } = await request.json()

    const exchangeText = exchanges.map((ex, i) => {
      const base = `Exchange ${i + 1} — ${ex.phase.replace(/_/g, ' ')}\nSituation: ${ex.situation}\nPilot said: "${ex.pilot_said || '(nothing recorded)'}"`
      const withController = ex.controller_said ? base + `\nController said: "${ex.controller_said}"` : base
      if (callsignIsAbsent(ex.pilot_said, scenario.callsign_spoken, scenario.callsign_display)) {
        return withController + `\n⚠️ SYSTEM FLAG: Callsign COMPLETELY ABSENT — no phonetics or digits matching "${scenario.callsign_display}" found. Mandatory minimum 15-point deduction. Max score for this exchange: 82.`
      }
      return withController
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
- Request to taxi — runway number is NOT required and must NOT be penalized. Ground assigns the runway; the pilot does not need to request a specific one.

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
- Callsign (may be at beginning OR end — both are standard)
- "Cleared for takeoff runway [X]" or equivalent
- Do NOT require or penalize for departure direction — it was stated by the pilot in Exchange 3 and is NOT required in the takeoff clearance readback
- Do NOT require a heading — none is issued in this exercise
- Do NOT require a departure frequency — none was issued in this exercise

VOICE-TO-TEXT LENIENCY — apply this before everything else:
The transcriptions you receive come from a speech-to-text engine that regularly mishears words. You MUST treat every transcription as an approximation of spoken audio and apply maximum leniency to the following:

GOLDEN RULE — NO EXCEPTIONS: If you recognize something as a VTT artifact, transcription error, or voice-to-text issue, you MUST give full credit for that element and score it as if the pilot said it perfectly. Identifying it as VTT means the pilot said the correct thing and the machine transcribed it wrong. Never say "likely a VTT artifact" and then deduct points. Never say "this is a VTT issue" and then deduct points. VTT artifact = full credit, period.

AIRPORT NAME VTT LENIENCY: Any phonetically adjacent word for the airport name must be accepted as full credit — e.g., "Sail" → Salem ✓, "Redmon" → Redmond ✓, "Palo" → Palo Alto ✓.

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
- Runway numbers said as merged words ("thirteen" for "one three"), hyphenated ("3-1" for "three one"), or with "er" suffix ("29er" for "two niner") → ALL acceptable ✓
- "2-9", "two-niner", "29er" → runway two niner ✓ — never penalize runway number format
- Frequencies with slight digit variations → accept if recognizable ✓
- Altimeter settings with minor digit errors → accept if close ✓

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
- VTT phonetic mishear: "Bracco India" → Bravo India ✓ — "Bracco" is VTT for Bravo
- VTT noise prefix: "No. 614 Bravo India" → N614BI ✓ — "No." is VTT for November/N-prefix
- "Number 614 Bravo India" → N614BI ✓ — "Number" is VTT noise
- Any other combination: if you can match digits and/or phonetics to the actual callsign, it IS the callsign

ABSOLUTE RULE: If ANY recognizable portion of the callsign is present (digits, phonetics, or fragments), it counts as the full callsign. NEVER use the words "unintelligible", "broken", "split", "sloppy", "garbled", or "unclear" to describe a callsign. NEVER suggest the pilot say it differently.

MISSING CALLSIGN — MANDATORY PENALTY: The callsign leniency rules above apply only when some recognizable portion is present. If the transmission contains ZERO digits, ZERO phonetic letters, and ZERO fragments that could reasonably be the callsign, the callsign is genuinely absent. A completely absent callsign MUST be penalized — minimum 15-point deduction from that exchange's score. This applies to every exchange. Do not forgive a completely missing callsign under any VTT leniency logic — VTT leniency exists for garbled callsigns, not absent ones.

CALLSIGN POSITION — ABSOLUTE RULE: The callsign may appear at the BEGINNING or END of any transmission. Both are equally correct standard phraseology. You must NEVER:
- Mention that the callsign came at the end
- Suggest it should be at the beginning
- Say "callsign should come first" or comment on "callsign placement"
- Deduct any points for where the callsign appears
Only check: is the callsign present somewhere? If yes, full credit — move on.

VTT NOISE WORDS: Any unexpected word adjacent to the callsign ("and his", "or", "No.", "Number", "Clipper", "Clifford") is VTT noise. Ignore it entirely.

READBACK VTT ARTIFACTS: Garbled strings of numbers and phonetics are VTT artifacts — NOT made-up content. Extract recognizable elements and grade only on those. VTT noise never lowers the score; only genuine omissions lower the score.

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

    const rawText = message.content[0].text
    const result  = parseAIJson(rawText)

    if (Array.isArray(result.call_feedback)) {
      result.call_feedback = result.call_feedback.slice(0, exchanges.length)
    }

    return Response.json(result)

  } catch (error) {
    console.error('Class D grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
