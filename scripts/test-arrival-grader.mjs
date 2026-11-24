// Arrival grader regression test through the real route (needs the dev server on port 3013 and
// ANTHROPIC_API_KEY; makes real, cheap API calls). Run: node scripts/test-arrival-grader.mjs
const BASE = process.env.BASE || 'http://localhost:3013'
const scenario = { airport_name: 'Palo Alto', airport_id: 'KPAO', runway: '13', pattern: 'left', atis: { letter: 'Alpha' }, callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel', tower_freq: '118.6', ground_freq: '125.0', approach_direction: 'southeast', approach_distance: 10, approach_altitude: 3200, parking_destination: 'GA ramp' }
const clean = [
  { step: 0, phase: 'initial_call', situation: 'inbound', pilot_said: 'Palo Alto Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing with information Alpha.' },
  { step: 1, phase: 'pattern_readback', situation: 'readback', controller_said: 'November four five two one Hotel, Palo Alto Tower, enter left downwind runway one three, report midfield.', pilot_said: 'Left downwind runway 13, report midfield, 4521 Hotel.' },
  { step: 2, phase: 'position_report', situation: 'report', pilot_said: 'Palo Alto Tower, 4521 Hotel, midfield left downwind runway 13.' },
  { step: 3, phase: 'landing_readback', situation: 'readback', controller_said: 'November four five two one Hotel, runway one three, cleared to land.', pilot_said: 'Cleared to land runway 13, 4521 Hotel.' },
  { step: 4, phase: 'clear_runway_to_ground', situation: 'clear', pilot_said: 'Palo Alto Ground, 4521 Hotel, clear of runway 13, request taxi to the GA ramp.' },
  { step: 5, phase: 'ground_taxi_readback', situation: 'readback', controller_said: 'November four five two one Hotel, taxi via Alpha to the GA ramp.', pilot_said: 'Taxi via Alpha to the GA ramp, 4521 Hotel.' },
]
const withSaid = (i, said) => clean.map((e, k) => (k === i ? { ...e, pilot_said: said } : e))
const cases = [
  ['clean arrival: every call 100', clean, {}],
  ['YOUR SCREENSHOT: "Left downwind 13, report midfield, 4521H."', withSaid(1, 'Left downwind 13, report midfield, 4521H.'), { 1: 100 }],
  ['landing with Alpha (no "inbound") is fine', withSaid(0, 'Palo Alto Tower, 4521 Hotel, 10 miles southeast, landing with Alpha.'), { 0: 100 }],
  ['VTT-mangled but all there', withSaid(2, 'Palo Alto tower 4521 Hotel mid field left down wind runway 13'), { 2: 100 }],
  ['straight "runway one tree" spoken words', withSaid(3, 'Cleared to land runway one three November 4521 Hotel'), { 3: 100 }],
  ['callsign at the very start is fine', withSaid(5, '4521 Hotel taxi via Alpha to the GA ramp'), { 5: 100 }],
  ['pattern readback with no runway number', withSaid(1, 'Left downwind, report midfield, 4521 Hotel.'), { 1: 70 }],
  ['pattern readback with no callsign', withSaid(1, 'Left downwind runway 13, report midfield.'), { 1: 82 }],
  ['pattern readback missing the reporting point', withSaid(1, 'Left downwind runway 13, 4521 Hotel.'), { 1: 75 }],
  ['initial call with no ATIS letter', withSaid(0, 'Palo Alto Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing.'), { 0: 85 }],
  ['"clear of the runway" with no number', withSaid(4, 'Palo Alto Ground, 4521 Hotel, clear of the runway, request taxi to the GA ramp.'), { 4: 60 }],
  ['landing readback without "cleared to land"', withSaid(3, 'Runway 13, 4521 Hotel.'), { 3: 70 }],
  ['wrong entry read back (right instead of left)', withSaid(1, 'Right downwind runway 13, report midfield, 4521 Hotel.'), { 1: 70 }],
  // Garbled by voice-to-text but all there: none of these may lose a point.
  ['VTT: shortened airport name and "windsor and miles"', withSaid(0, 'Palo Tower, Cessna one seven two November 4521 Hotel, windsor and miles southeast, landing with alpha.'), { 0: 100 }],
  ['VTT: "Pawlo Alto Ground" and "G A ramp"', withSaid(4, 'Pawlo Alto ground November 4521 Hotel clear of runway one three request taxi to the G A ramp'), { 4: 100 }],
  ['VTT: merged runway and callsign digits', withSaid(1, 'Left downwind runway 134521 report midfield'), { 1: 100 }],
  ['VTT: position report with the callsign first', withSaid(2, '4521 Hotel midfield left downwind 13'), { 2: 100 }],
  ['VTT: merged "GAramp" and abbreviated callsign', withSaid(5, 'Taxi via Alpha GAramp 4521H'), { 5: 100 }],
  ['straight-in: entry, runway and "three mile final" read back', clean.map((e, k) => k === 1 ? { ...e, controller_said: 'November four five two one Hotel, Palo Alto Tower, cleared straight in runway one three, report three-mile final.', pilot_said: 'Straight in 13, report three mile final, 4521 Hotel.' } : k === 2 ? { ...e, pilot_said: 'Palo Alto Tower, 4521 Hotel, three mile final runway 13.' } : e), {}],
  ['straight-in with no reporting point read back', clean.map((e, k) => k === 1 ? { ...e, controller_said: 'November four five two one Hotel, Palo Alto Tower, cleared straight in runway one three, report three-mile final.', pilot_said: 'Straight in 13, 4521 Hotel.' } : e), { 1: 75 }],
]
const RUNS = Number(process.env.RUNS || 4)
let failed = 0
for (const [name, exchanges, expect] of cases) {
  const rows = []
  for (let r = 0; r < RUNS; r++) {
    const res = await (await fetch(`${BASE}/api/vfr-class-d-arrival-grade`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify({ scenario, exchanges }) })).json()
    rows.push(res.call_feedback ? res.call_feedback.map((c) => c.score) : null)
  }
  const bad = []
  rows.forEach((row, r) => {
    if (!row) { bad.push(`run ${r + 1}: no result`); return }
    exchanges.forEach((_, i) => { const want = i in expect ? expect[i] : 100; if (row[i] !== want) bad.push(`run ${r + 1} call ${i}: got ${row[i]}, want ${want}`) })
  })
  console.log(bad.length ? 'FAIL' : 'ok  ', name, bad.length ? '\n        ' + bad.slice(0, 3).join('\n        ') : '')
  if (bad.length) failed++
}
console.log(failed ? `\n${failed} case(s) FAILED` : `\nALL PASS (${cases.length} cases x ${RUNS} runs)`)
process.exit(failed ? 1 : 0)
