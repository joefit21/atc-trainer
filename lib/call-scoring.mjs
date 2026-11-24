// Shared scoring for the VFR practice scenarios (CTAF, Class D departure, Class D arrival and
// flight following). The model never scores a call. It only quotes, for each required element, the
// words the pilot said; this file checks the quotes and turns what is missing into the score and the
// feedback, so a score can never disagree with its own feedback.
//
// Every scenario supplies a table: phase -> list of elements, each with the points a missing
// element costs. Bands from the original prompts: a minor element costs about 15 (one missing = 85),
// a significant one about 30 (70), several missing elements land below 60.

// An element: key, label (for "Missing: ..."), deduct, advice (one sentence), options:
//   cap:   score can be at most this when the element is missing (a missing callsign caps at 82)
//   when:  (call, scenario) => bool; the element only applies when this is true
//   where: 'start' | 'end'; the quoted words must open or close the call
//   modelAnswers: false when code alone decides (the callsign)
// advice can be a function (call, scenario) => string, for feedback that names what was expected.
export const E = (key, label, deduct, advice, options = {}) => ({ key, label, deduct, advice, ...options })

const applies = (e, call, scenario) => !e.when || e.when(call, scenario)

// Keys the model is asked to quote for a phase (not the ones code decides itself).
export function modelKeys(table, phase, call, scenario) {
  return (table[phase] || []).filter((e) => e.modelAnswers !== false && applies(e, call, scenario)).map((e) => e.key)
}

export function scoreCall(table, phase, present, pilotSaid, call = {}, scenario = {}) {
  if (!pilotSaid || !pilotSaid.trim()) {
    return { score: 0, missing: ['a recorded call'], key_issue: 'No call was recorded.', feedback: 'Nothing was recorded for this call. Try the transmission again.' }
  }
  const elements = (table[phase] || []).filter((e) => applies(e, call, scenario))
  const missing = elements.filter((e) => !present[e.key])
  if (missing.length === 0) return { score: 100, missing: [], key_issue: null, feedback: 'Clean call. Every required element was there.' }
  let score = 100 - missing.reduce((s, e) => s + e.deduct, 0)
  for (const e of missing) if (e.cap !== undefined) score = Math.min(score, e.cap)
  score = Math.max(0, score)
  return {
    score,
    missing: missing.map((e) => e.label),
    key_issue: `Missing: ${missing.map((e) => e.label).join(', ')}.`,
    feedback: missing.map((e) => (typeof e.advice === 'function' ? e.advice(call, scenario) : e.advice)).join(' '),
  }
}

export function summarize(results, what = 'calls', cleanLabel = 'run') {
  const clean = results.filter((r) => r.score === 100).length
  const overall = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0
  const counts = {}
  for (const r of results) for (const m of r.missing) counts[m] = (counts[m] || 0) + 1
  const work = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m)
  const summary = clean === results.length
    ? `Clean ${cleanLabel}. Every ${what.replace(/s$/, '')} had its required elements.`
    : `${clean} of ${results.length} ${what} were clean. Work on: ${work.join(', ')}.`
  return { overall_score: overall, summary }
}

// ---- Reading what the pilot said ----

const DIGIT = { zero: 0, oh: 0, one: 1, won: 1, wun: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, four: 4, for: 4, fore: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, niner: 9, wine: 9 }
const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

// Every digit the pilot said, in order, from numerals or number words ("forty five twenty one" is
// 4521), with the callsign's own digits removed first so they cannot stand in for anything else.
export function spokenDigits(text, callsignDisplay = '') {
  let t = String(text).toLowerCase()
  const cs = callsignDisplay.replace(/\D/g, '')
  if (cs) t = t.split(cs).join(' ')
  const tokens = t.replace(/[-,.]/g, ' ').split(/\s+/).filter(Boolean)
  let out = ''
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (/^\d+$/.test(tok)) out += tok
    else if (tok in TENS) {
      const next = tokens[i + 1]
      if (next in DIGIT && DIGIT[next] > 0) { out += TENS[tok] + DIGIT[next]; i++ } else out += TENS[tok]
    } else if (tok in TEENS) out += TEENS[tok]
    else if (tok in DIGIT) out += DIGIT[tok]
    else if (/^\d+(r|l|c)$/.test(tok)) out += tok.replace(/\D/g, '')
  }
  return out
}

export const hasRunwayNumber = (text, runway, callsignDisplay) => spokenDigits(text, callsignDisplay).includes(String(runway).replace(/\D/g, ''))

// Does the controller's own instruction decide what has to be read back? (entry, reporting point)
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

// ---- Proof for the model's answers ----

export const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// The quote must really be in the transcript. With where: 'start' it must open the call (before it
// only a few characters and no callsign); with 'end' it must close it (after it only a few
// characters and no callsign). This is how "begin with the airport name" and "end with the airport
// name" are enforced: the model cannot just say yes.
export function quoteIsInTranscript(quote, transcript, where = null, callsignAbsent = () => true) {
  if (typeof quote !== 'string') return false
  const q = norm(quote)
  if (q.length === 0) return false
  const t = norm(transcript)
  if (where === 'start') {
    const at = t.indexOf(q)
    return at >= 0 && at <= 15 && callsignAbsent(t.slice(0, at))
  }
  if (where === 'end') {
    const at = t.lastIndexOf(q)
    return at >= 0 && t.length - (at + q.length) <= 25 && callsignAbsent(t.slice(at + q.length))
  }
  return t.includes(q)
}

// ---- Is the callsign in what the pilot said? (code decides; the model is not asked) ----

const PHONETIC_WORDS = new Set(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu'])
const AIRLINE_WORDS = new Set(['american', 'united', 'southwest', 'jetblue', 'spirit', 'frontier', 'alaska', 'hawaiian', 'allegiant'])

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
  const distinctive = tokens.filter((t) => PHONETIC_WORDS.has(t) || AIRLINE_WORDS.has(t))
  if (distinctive.length === 0) return !tokens.some((t) => textWithSpaces.includes(t))
  return !distinctive.some((t) => textWithSpaces.includes(t))
}
