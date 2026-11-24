// Scoring for the Class D arrival scenario's six radio calls.
//
// The model only decides, for each call, which required elements were present (yes/no).
// This file turns those answers into the score and the feedback, so a score can never
// disagree with its own feedback (it used to: "all elements present" next to a 60).
//
// Each missing element costs the points below, from the bands in the old prompt: a minor
// element is worth 15 (85 for one), a significant one 30 (70 for one), several missing
// elements land below 60. A missing callsign caps the call at 82; a runway given only as
// "clear of the runway" with no number scores 60.

const E = (key, label, deduct, advice) => ({ key, label, deduct, advice })

export const PHASES = {
  initial_call: [
    E('tower_name', 'the facility name', 15, 'Start with who you are calling, like "Palo Alto Tower".'),
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('position', 'distance and direction from the airport', 30, 'Give your distance and direction from the airport, like "10 miles northwest".'),
    E('atis', 'the ATIS letter', 15, 'Say you have the current ATIS, like "with information Alpha".'),
    E('intent', 'your intention to land', 30, 'Say what you want, like "inbound for landing".'),
  ],
  pattern_readback: [
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('entry', 'the pattern entry', 30, 'Read back the entry Tower gave you, like "left downwind" or "straight in".'),
    E('runway', 'the runway number', 30, 'Say the runway number, like "runway one three".'),
    E('report_point', 'the reporting point', 25, 'Read back where Tower wants your next call, like "report midfield".'),
  ],
  position_report: [
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('position', 'your position', 30, 'Report the position Tower asked for, like "midfield left downwind".'),
    E('runway', 'the runway number', 30, 'Include the runway number with your position.'),
  ],
  landing_readback: [
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('cleared_to_land', '"cleared to land" with the runway', 30, 'Read back the clearance, like "cleared to land runway one three".'),
  ],
  clear_runway_to_ground: [
    E('ground_name', 'the facility name (Ground)', 15, 'This call goes to Ground, like "Palo Alto Ground".'),
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('clear_runway', 'which runway you cleared', 40, 'Say the specific runway you are clear of, like "clear of runway one three", not "clear of the active".'),
    E('request_taxi', 'your taxi request', 30, 'Ask for what you need, like "request taxi to the GA ramp".'),
  ],
  ground_taxi_readback: [
    E('callsign', 'your callsign', 18, 'Include your callsign.'),
    E('taxiway', 'the taxiway', 25, 'Read back the taxiway Ground gave you.'),
    E('destination', 'the destination', 25, 'Read back where you are taxiing, like "to the GA ramp".'),
  ],
}

// The keys the model is asked to answer (the callsign is decided in code).
export const modelKeys = (phase) => (PHASES[phase] || []).map((e) => e.key).filter((k) => k !== 'callsign')

export function scoreExchange(phase, present, pilotSaid) {
  const elements = PHASES[phase]
  if (!pilotSaid || !pilotSaid.trim()) {
    return { score: 0, missing: ['a recorded call'], key_issue: 'No call was recorded.', feedback: 'Nothing was recorded for this call. Try the transmission again.' }
  }
  if (!elements) return { score: 100, missing: [], key_issue: null, feedback: 'Clean call.' }
  const missing = elements.filter((e) => !present[e.key])
  if (missing.length === 0) return { score: 100, missing: [], key_issue: null, feedback: 'Clean call. Every required element was there.' }
  let score = 100 - missing.reduce((s, e) => s + e.deduct, 0)
  if (missing.some((e) => e.key === 'callsign')) score = Math.min(score, 82)
  score = Math.max(0, score)
  return {
    score,
    missing: missing.map((e) => e.label),
    key_issue: `Missing: ${missing.map((e) => e.label).join(', ')}.`,
    feedback: missing.map((e) => e.advice).join(' '),
  }
}

export function summarize(results) {
  const clean = results.filter((r) => r.score === 100).length
  const overall = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0
  const counts = {}
  for (const r of results) for (const m of r.missing) counts[m] = (counts[m] || 0) + 1
  const work = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m)
  const summary = clean === results.length
    ? 'Clean arrival. Every call had its required elements.'
    : `${clean} of ${results.length} calls were clean. Work on: ${work.join(', ')}.`
  return { overall_score: overall, summary }
}

// ---- Checks done in code, used to rescue an element the model wrongly marked missing ----

const DIGIT = { zero: 0, one: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, niner: 9, wine: 9 }
const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30 }

// Every digit the pilot said, in order, from numerals or number words, with the callsign's own
// digits removed first (so a callsign like 4513H cannot stand in for runway 13).
export function spokenDigits(text, callsignDisplay = '') {
  let t = String(text).toLowerCase()
  const csDigits = callsignDisplay.replace(/\D/g, '')
  if (csDigits) t = t.split(csDigits).join(' ')
  let out = ''
  for (const tok of t.replace(/[-,.]/g, ' ').split(/\s+/)) {
    if (/^\d+$/.test(tok)) out += tok
    else if (tok in DIGIT) out += DIGIT[tok]
    else if (tok in TEENS) out += TEENS[tok]
    else if (/^\d+(r|l|c)?$/.test(tok)) out += tok.replace(/\D/g, '')
  }
  return out
}

export const hasRunwayNumber = (text, runway, callsignDisplay) => spokenDigits(text, callsignDisplay).includes(String(runway).replace(/\D/g, ''))

// The controller's own words decide what the readback has to match.
export function hasReportPoint(pilotSaid, controllerSaid = '') {
  const p = pilotSaid.toLowerCase(), c = controllerSaid.toLowerCase()
  if (/mid\s?-?field/.test(c)) return /mid\s?-?field/.test(p)
  if (/mile final/.test(c)) return /(3|three|tree|free)\s?-?\s?(mile|maw|ma)/.test(p)
  return false
}
export function hasEntry(pilotSaid, controllerSaid = '') {
  const p = pilotSaid.toLowerCase(), c = controllerSaid.toLowerCase()
  if (/straight[- ]in/.test(c)) return /straight/.test(p)
  const side = c.match(/(left|right) (downwind|base)/)
  return !!side && p.includes(side[1]) && p.includes(side[2])
}

// ---- Is the callsign in what the pilot said? (code decides; the model is not asked) ----

const PHONETIC_WORDS = new Set([
  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india',
  'juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo',
  'sierra','tango','uniform','victor','whiskey','xray','yankee','zulu'
])
const AIRLINE_WORDS = new Set([
  'american','united','southwest','jetblue','spirit','frontier',
  'alaska','hawaiian','allegiant'
])

export function callsignIsAbsent(pilotSaid, callsignSpoken, callsignDisplay) {
  if (!pilotSaid || pilotSaid.trim() === '') return true
  const text = pilotSaid.toLowerCase().replace(/[-\s]/g, '')
  if (callsignDisplay) {
    const displayStripped = callsignDisplay.toLowerCase().replace(/[-\s]/g, '')
    if (text.includes(displayStripped)) return false
    const digits = displayStripped.replace(/[a-z]/g, '')
    if (digits.length >= 3 && text.includes(digits)) return false
  }
  const textWithSpaces = pilotSaid.toLowerCase()
  const tokens = callsignSpoken.toLowerCase().split(/\s+/)
  const distinctive = tokens.filter(t => PHONETIC_WORDS.has(t) || AIRLINE_WORDS.has(t))
  if (distinctive.length === 0) return !tokens.some(t => textWithSpaces.includes(t))
  return !distinctive.some(t => textWithSpaces.includes(t))
}



// ---- Proof for the model's "yes" answers ----
//
// The model must quote the exact words from the pilot's call that satisfy an element. An element
// only counts as present if that quote really is in the transcript, so the model cannot
// invent an element from context (it did: "no runway number" scored as present).

const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export function quoteIsInTranscript(quote, transcript) {
  if (typeof quote !== 'string') return false
  const q = norm(quote)
  if (q.length === 0) return false
  return norm(transcript).includes(q)
}
