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

PILOT'S CALLS:
${callsText}

EVALUATION RULES:

REQUIRED ELEMENTS by call type:
- Inbound (10 miles): airport name + "traffic", aircraft type, callsign, distance and direction from airport, "inbound for landing", runway number
- Entering 45°: airport name + "traffic", aircraft type, callsign, "entering 45" or "45 for the [pattern] downwind", runway
- Downwind: airport name + "traffic", aircraft type, callsign, "[left/right] downwind", runway
- Base: airport name + "traffic", aircraft type, callsign, "[left/right] base", runway
- Final: airport name + "traffic", aircraft type, callsign, "final", runway, full stop or touch and go

STANDARD FORMAT: "[Airport] traffic, [Aircraft type] [Callsign], [Position], runway [number], [Airport]."
- Repeating airport name at end is best practice. Give partial credit if missing, note it but don't hammer them.
- Aircraft type is recommended but not required. Note if missing, don't deduct heavily.
- CTAF is self-announcing — there is no controller to respond.

VOICE-TO-TEXT LENIENCY:
- Apply generous phonetic leniency. "niner" and "9" are identical. Similar-sounding words are acceptable.
- If the callsign sounds approximately right, accept it.
- Never penalize for voice-to-text transcription artifacts.

SCORING:
- Score each call 0–100 based on completeness and correctness of required elements.
- Overall score is the weighted average.
- Keep feedback brief and direct. One or two sentences per call is enough.
- Only mention what was wrong or missing. Don't compliment correct items unless something genuinely stands out.
- If a call was perfect or near-perfect, say so briefly and move on.

Return raw JSON only, no markdown:
{
  "overall_score": 85,
  "summary": "One to two sentence overall assessment of the full sequence.",
  "call_feedback": [
    {
      "step": 0,
      "phase": "inbound_10",
      "score": 90,
      "what_you_said": "exact transcription text here",
      "feedback": "Brief CFI-style feedback. What was right or what was missing.",
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
    return Response.json(result)

  } catch (error) {
    console.error('VFR grade error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
