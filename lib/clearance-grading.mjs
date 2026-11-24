// Grades a readback of an IFR clearance or a ground taxi clearance on the shared engine
// (lib/call-grading.mjs). The clearance is a fixed script, so everything the pilot must read back
// is read out of its text in code; numbers (altitudes, time, frequency, squawk, runway) are
// checked in code too. The model only quotes the parts that need an ear for phonetics:
// the destination, the routing, the transition, the taxi route and the hold-short instruction.
import { E, spokenDigits, callsignIsAbsent } from './call-scoring.mjs'
import { gradeCalls } from './call-grading.mjs'

const W = { zero: 0, oh: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, four: 4, for: 4, fore: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, niner: 9, wine: 9 }
const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

// ---- Reading the clearance text ----

export function parseClearance(text, type) {
  const t = String(text || '').trim()
  const out = { callsign_spoken: t.split(/,| is cleared/i)[0].trim() }
  if (type === 'ground') {
    out.runway = (t.match(/\brunway ([a-z ]+?)(?:,|$)/i) || [])[1] || null
    out.taxi = (t.match(/taxi (?:via|to) (.+?)(?:,\s*(?:hold short|cross)|\.|$)/i) || [])[1] || null
    out.instructions = [...t.matchAll(/\b(hold short of|cross) runway ([a-z ]+?)(?=,|\.|$| and )/gi)].map((m) => ({ verb: m[1].toLowerCase().startsWith('hold') ? 'hold' : 'cross', runway: m[2].trim() }))
    return out
  }
  out.destination = (t.match(/cleared to (?:the )?(.+?)(?: airport)?(?= via | as filed|,|\.|$)/i) || [])[1] || null
  const route = (t.match(/cleared to .+?((?:via|as filed).*?)[,.]\s*climb (?:and maintain|via)/i) || [])[1] || null
  out.routing = route
  out.routeKind = !route ? null : /radar vectors/i.test(route) && /via radar vectors/i.test(route) && !/runway heading/i.test(route) ? 'vectors' : /runway heading/i.test(route) ? 'heading' : /departure/i.test(route) ? 'sid' : 'filed'
  const sid = route && route.match(/via the ([A-Za-z]{2,5}) (\w+) departure(?:, ([A-Za-z]{5}) transition)?/i)
  if (sid) { out.sidName = sid[1]; out.sidNumber = sid[2]; out.transition = sid[3] || null }
  out.climbVia = /\bclimb via\b/i.test(t)
  out.initialAltitude = altitudeFromWords((t.match(/climb and maintain (.+?)(?:,|\.)/i) || [])[1] || '')
  const ex = t.match(/expect ((?:(?!expect ).)+?) (?:one zero|ten) minutes after departure/i)
  out.expectAltitude = ex ? altitudeFromWords(ex[1]) : null
  out.frequency = spokenDigits((t.match(/departure frequency (.+?)(?:,|\.|$)/i) || [])[1] || '')
  out.squawk = spokenDigits((t.match(/squawk (.+?)(?:,|\.|$)/i) || [])[1] || '')
  return out
}

// "one one thousand" -> 11000, "flight level tree five zero" -> 35000, "10,000" -> 10000.
export function altitudeFromWords(words) {
  const groups = numberGroups(words)
  const g = groups.find((x) => /\d/.test(x)) || ''
  if (!g) return null
  if (/^\d+T(\d)H?$/.test(g)) { const m = g.match(/^(\d+)T(\d)H?$/); return Number(m[1]) * 1000 + Number(m[2]) * 100 }
  if (/^\d+T$/.test(g)) return Number(g.slice(0, -1)) * 1000
  const n = Number(g)
  if (/flight level|\bfl\b/i.test(words) || (g.length === 3 && n >= 180 && n <= 600)) return n * 100
  return n
}

// Numbers in what was said, grouped: spoken digits and numerals that follow each other merge into
// one group ("two five zero one zero" -> "25010"), "thousand" is T and "hundred" is H. Any other
// word ends a group.
export function numberGroups(text) {
  const tokens = String(text).toLowerCase().replace(/(\d),(\d)/g, '$1$2').split(/[^a-z0-9]+/).filter(Boolean)
  const groups = []
  let cur = ''
  const flush = () => { if (cur) groups.push(cur); cur = '' }
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (/^\d+$/.test(tok)) cur += tok
    else if (tok in W) cur += W[tok]
    else if (tok in TEENS) cur += TEENS[tok]
    else if (tok in TENS) {
      const next = tokens[i + 1]
      if (next in W && W[next] > 0) { cur += TENS[tok] + W[next]; i++ } else cur += TENS[tok]
    } else if (tok === 'point' || tok === 'decimal' || tok === 'dot') {
      // a spoken decimal point stays inside the number ("one two five point tree" is 1253)
    } else if (tok === 'thousand') cur += 'T'
    else if (tok === 'hundred') cur += 'H'
    else flush()
  }
  flush()
  return groups
}

// The separate numbers in what was said (the callsign's own digits taken out first), as plain digits:
// "runway 13 taxi via Alpha hold short runway 16" is ['13', '16'], never one run of digits that a
// match could straddle.
export function digitGroups(text, callsignDigits = '') {
  let t = String(text)
  if (callsignDigits) t = t.split(callsignDigits).join(' ')
  return numberGroups(t).map((g) => g.replace(/[TH]/g, '')).filter(Boolean)
}
const hasNumber = (groups, want) => !!want && groups.some((g) => g.includes(want))

// Did the pilot say this altitude (and, with minutes, "ten minutes" after it)?
export function altitudeSaid(quote, feet, { minutes = false } = {}) {
  if (!feet) return false
  const k = Math.floor(feet / 1000), h = (feet % 1000) / 100
  const forms = feet % 1000 === 0 ? [`${k}T`, `${feet}`] : [`${k}T${h}H`, `${k}T${h}`, `${feet}`]
  forms.push(`${feet / 100}`) // a flight level: 35000 -> 350
  // Voice-to-text often drops a zero from a flight level ("flight level three zero zero" written "3-0"). A flight
  // level that ends in zero is accepted without it when "flight level" was said; FL030 or FL035 is never a real answer.
  if (feet >= 18000 && (feet / 100) % 10 === 0 && /flight\s?level|\bfl\b/i.test(quote)) forms.push(`${feet / 1000}`)
  const groups = numberGroups(quote)
  if (!minutes) return groups.some((g) => forms.includes(g))
  const endsWith = (g, f) => g.endsWith(f) && (g.length === f.length || /\D/.test(g[g.length - f.length - 1]))
  if (groups.some((g) => forms.some((f) => endsWith(g, f + '10')))) return true
  const at = groups.findIndex((g) => forms.includes(g))
  return at >= 0 && groups.slice(at + 1).includes('10')
}

// "One zero minutes", "ten minutes", "10 minutes" or "1-0 minutes", whatever altitude came before it.
export const expectTimeSaid = (quote) => /(\bten|\bone zero|\b1\W?0)\W+minutes?\b/i.test(quote)

// An altitude as a controller says it, for feedback: "flight level one niner zero", "one two thousand".
export function spokenAltitude(feet) {
  const words = ['zero', 'one', 'two', 'tree', 'four', 'five', 'six', 'seven', 'eight', 'niner']
  const say = (n) => String(n).split('').map((d) => words[Number(d)]).join(' ')
  return feet >= 18000 ? `flight level ${say(Math.round(feet / 100))}` : `${say(Math.round(feet / 1000))} thousand`
}

// ---- What is graded ----

const CS = E('callsign', 'your callsign', 18, 'Include your callsign.', { cap: 82, modelAnswers: false })
const CODE = { modelAnswers: false }

export const IFR_TABLE = [
  CS,
  E('destination', 'the destination', 20, 'Read back where you are cleared to.', { when: (c, s) => !!s.destination }),
  E('routing', 'the routing', 30, 'Read back the routing exactly as issued, including the departure procedure number.', { when: (c, s) => !!s.routing }),
  E('transition', 'the transition', 20, 'Read back the transition named in the clearance.', { when: (c, s) => !!s.transition }),
  E('climb_via', '"climb via the SID"', 25, 'Read back "climb via the SID".', { ...CODE, when: (c, s) => !!s.climbVia }),
  E('initial_altitude', 'the initial altitude', 25, 'Read back the altitude you were told to climb and maintain.', { ...CODE, when: (c, s) => !!s.initialAltitude }),
  E('expect_altitude', 'the expected altitude', 25, (c, s) => `Read back the altitude to expect: ${spokenAltitude(s.expectAltitude)}.`, { ...CODE, when: (c, s) => !!s.expectAltitude }),
  E('expect_time', 'the time after departure', 10, 'Read back the time after departure: "one zero minutes".', { ...CODE, when: (c, s) => !!s.expectAltitude }),
  E('frequency', 'the departure frequency', 20, 'Read back the departure frequency.', { ...CODE, when: (c, s) => !!s.frequency }),
  E('squawk', 'the squawk code', 25, 'Read back the squawk code.', { ...CODE, when: (c, s) => !!s.squawk }),
]

export const GROUND_TABLE = [
  CS,
  E('runway', 'the runway', 30, 'Read back your assigned runway.', { ...CODE, when: (c, s) => !!s.runway }),
  E('taxiway', 'the taxi route', 30, 'Read back the taxiways in the order Ground gave them.', { when: (c, s) => !!s.taxi }),
  E('hold_short', 'the hold short or crossing instruction', 30, 'Read back the hold short or crossing instruction exactly as Ground gave it.', { when: (c, s) => s.instructions?.length > 0 }),
]

const HELP = {
  destination: (s) => `read back the destination "${s.destination}". The city name alone is full credit; any phonetic attempt counts`,
  routing: (s) => `read back the same routing as the clearance ("${s.routing}"). A departure procedure name is fix-style: ANY phonetic attempt at the name counts (a 3-letter name may be said as a word or as letters), but its number must be there. "as filed", "radar vectors" and "fly runway heading" must match the clearance in meaning. Do not require "then as filed" after a departure procedure`,
  transition: (s) => `read back some name in the transition position (the clearance's is ${s.transition}; ANY phonetic attempt at the name counts)`,
  taxiway: (s) => `read back the taxi route: "${s.taxi}". Taxiway names can be phonetic or letters ("Alfa", "A"); "taxi to" and "taxi via" are interchangeable; any numbers in a name must be there`,
  hold_short: (s) => `read back every instruction: ${s.instructions.map((i) => `${i.verb === 'hold' ? 'hold short of' : 'cross'} runway ${i.runway}`).join('; ')}. The verb (hold short or cross) and the runway number must both match`,
}

function rescue(present, call, s, answers = {}) {
  const said = call.pilot_said || ''
  const csDigits = (s.callsign_display || '').replace(/\D/g, '') || spokenDigits(s.callsign_spoken || '')
  const groups = digitGroups(said, csDigits)
  const quoteGroups = (k) => digitGroups(answers?.[k] || '', csDigits)

  // A phonetic letter the pilot used as a taxiway ("taxi via Alpha") is not evidence of the callsign
  // "...Alpha Bravo". The callsign stands if it shows outside those quoted words, or by its digits.
  if (present.callsign && call.phase === 'ground') {
    let rest = said
    for (const k of ['taxiway', 'hold_short']) {
      const q = answers?.[k]
      if (typeof q === 'string' && q.trim()) { const at = rest.toLowerCase().indexOf(q.toLowerCase()); if (at >= 0) rest = rest.slice(0, at) + ' ' + rest.slice(at + q.length) }
    }
    const outside = !callsignIsAbsent(rest, s.callsign_spoken || '', s.callsign_display || '')
    const tail = csDigits.slice(-2)
    const byDigits = tail.length === 2 && numberGroups(said).some((g) => g.includes(tail))
    if (!outside && !byDigits) present.callsign = false
  }

  if (call.phase === 'ifr') {
    if ('destination' in present && present.destination && s.destination) {
      // The quote must at least start like the city's name ("den" for Denver).
      const stem = s.destination.toLowerCase().split(/\s+/)[0].slice(0, 3)
      if (!said.toLowerCase().split(/[^a-z]+/).some((w) => w.startsWith(stem)) && !said.toLowerCase().includes(stem)) present.destination = false
    }
    if ('routing' in present && present.routing) {
      const q = (answers?.routing || said).toLowerCase()
      if (s.routeKind === 'vectors' && !/vector/.test(q)) present.routing = false
      if (s.routeKind === 'heading' && !/heading/.test(q)) present.routing = false
      if (s.routeKind === 'filed' && !/filed/.test(q)) present.routing = false
      if (s.routeKind === 'sid' && s.sidNumber) {
        const n = W[s.sidNumber.toLowerCase()]
        if (n !== undefined && !spokenDigits(q).includes(String(n))) present.routing = false
      }
    }
    // The numbers are decided here, not by the model.
    present.initial_altitude = altitudeSaid(said, s.initialAltitude)
    // "Climb via the SID" replaces the initial altitude when the procedure has altitude restrictions.
    // "via" alone is not enough (the routing says "via the ... departure"): it must follow "climb".
    if (s.climbVia) present.climb_via = /\bclimb\w*\s+(?:via|v\.?i\.?a)\b/i.test(said)
    // The altitude and the time are checked apart so the feedback says which one was missing.
    // (The altitude can run into the minutes in the transcript, "3-5-0, 1-0 minutes" as one group of digits.)
    present.expect_altitude = altitudeSaid(said, s.expectAltitude) || altitudeSaid(said, s.expectAltitude, { minutes: true })
    present.expect_time = expectTimeSaid(said) || altitudeSaid(said, s.expectAltitude, { minutes: true })
    present.frequency = hasNumber(groups, s.frequency)
    present.squawk = hasNumber(groups, s.squawk)
  } else {
    {
      const want = spokenDigits(s.runway || '')
      const side = (s.runway || '').toLowerCase().match(/left|right|center/)?.[0]
      const sideOk = !side || new RegExp(`${side}|\\d\\s?${side[0]}\\b`, 'i').test(said)
      present.runway = !s.runway || (hasNumber(groups, want) && sideOk)
    }
    if ('taxiway' in present && present.taxiway) {
      const want = spokenDigits(s.taxi || '')
      if (want && !hasNumber(quoteGroups('taxiway'), want)) present.taxiway = false
    }
    if ('hold_short' in present && present.hold_short) {
      const q = (answers?.hold_short || '').toLowerCase()
      const qg = digitGroups(q, csDigits)
      const ok = s.instructions.every((i) => hasNumber(qg, spokenDigits(i.runway)) && (i.verb === 'hold' ? /hold|short/.test(q) : /cross/.test(q)))
      if (!ok) present.hold_short = false
    }
  }
}

export async function gradeClearance({ anthropic, clearance_text, readback_text, scenario_type, callsign }) {
  const type = scenario_type === 'ground' ? 'ground' : 'ifr'
  const scenario = { ...parseClearance(clearance_text, type), callsign_display: callsign || '' }
  const call = { step: 0, phase: type, pilot_said: readback_text || '', controller_said: clearance_text }
  const result = await gradeCalls({
    anthropic,
    title: type === 'ground' ? 'reading back a ground taxi clearance' : 'reading back an IFR clearance',
    scenarioText: `Clearance issued: "${clearance_text}"`,
    scenario,
    calls: [call],
    table: { [type]: type === 'ground' ? GROUND_TABLE : IFR_TABLE },
    help: HELP,
    extraRules: [
      'A callsign, "runway", the facility name, leading zeros and "taxi to" versus "taxi via" are never part of what you answer.',
      'Sequential numbers can run together ("two five zero one zero minutes" is 250 and ten minutes); that is a code check, not yours.',
    ],
    rescue,
    what: 'readbacks',
    cleanLabel: 'readback',
  })
  const c = result.call_feedback[0]
  return { score: c.score, feedback: c.feedback }
}
