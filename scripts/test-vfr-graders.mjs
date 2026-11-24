// Regression tests for the Class D departure, flight following and CTAF graders, through the real
// routes (needs the dev server on port 3013 and ANTHROPIC_API_KEY; makes real, cheap API calls).
// Run: node scripts/test-vfr-graders.mjs   (ONLY=departure|ff|ctaf to run one group)
const BASE = process.env.BASE || 'http://localhost:3013'
const RUNS = Number(process.env.RUNS || 3)
const CS = { callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel' }

async function run(group, url, makeBody, base, cases) {
  if (process.env.ONLY && process.env.ONLY !== group) return 0
  let failed = 0
  for (const [name, edit, expect] of cases) {
    const items = edit(base)
    const bad = []
    for (let r = 0; r < RUNS; r++) {
      const res = await (await fetch(`${BASE}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify(makeBody(items)) })).json()
      const row = res.call_feedback?.map((c) => c.score)
      if (!row) { bad.push(`run ${r + 1}: no result (${res.error || ''})`); continue }
      items.forEach((_, i) => { const want = i in expect ? expect[i] : 100; if (row[i] !== want) bad.push(`run ${r + 1} call ${i}: got ${row[i]}, want ${want}`) })
    }
    console.log(bad.length ? 'FAIL' : 'ok  ', group, '-', name, bad.length ? '\n        ' + bad.slice(0, 3).join('\n        ') : '')
    if (bad.length) failed++
  }
  return failed
}
const withSaid = (key) => (i, said) => (list) => list.map((e, k) => (k === i ? { ...e, [key]: said } : e))
const edits = (key, defs) => defs.map(([name, i, said, expect]) => [name, (b) => withSaid(key)(i, said)(b), expect])

let failed = 0

// ---------- Class D departure ----------
{
  const scenario = { airport_name: 'Redmond', airport_id: 'KRDM', runway: '5', pattern: 'left', atis: { letter: 'Bravo' }, aircraft_type: 'Cessna 172', ground_freq: '121.7', tower_freq: '118.3', hold_short_runway: '11', ...CS }
  const base = [
    { step: 0, phase: 'ground_call', situation: 'at the ramp', pilot_said: 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp with information Bravo, ready to taxi.' },
    { step: 1, phase: 'ground_readback', situation: 'readback', controller_said: 'November four five two one Hotel, Redmond Ground, runway five, taxi via Alpha, hold short runway one one.', pilot_said: 'Runway 5, taxi via Alpha, hold short runway 11, 4521 Hotel.' },
    { step: 2, phase: 'tower_call', situation: 'holding short', pilot_said: 'Redmond Tower, 4521 Hotel, holding short runway 5, northbound departure, ready for departure.' },
    { step: 3, phase: 'tower_readback', situation: 'readback', controller_said: 'November four five two one Hotel, runway five, cleared for takeoff.', pilot_said: 'Cleared for takeoff runway 5, 4521 Hotel.' },
  ]
  const noHold = (b) => b.map((e, k) => (k === 1 ? { ...e, controller_said: 'November four five two one Hotel, Redmond Ground, runway five, taxi via Alpha.', pilot_said: 'Runway 5, taxi via Alpha, 4521 Hotel.' } : e))
  failed += await run('departure', '/api/vfr-class-d-grade', (exchanges) => ({ scenario, exchanges }), base, [
    ['clean departure: every call 100', (b) => b, {}],
    ['no hold short expected, none said', noHold, {}],
    ...edits('pilot_said', [
      ['ground call without the ATIS letter', 0, 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp, ready to taxi.', { 0: 85 }],
      ['ground call without a position', 0, 'Redmond Ground, Cessna 172 November 4521 Hotel with information Bravo, ready to taxi.', { 0: 85 }],
      ['ground call without a taxi request', 0, 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp with information Bravo.', { 0: 70 }],
      ['ground readback without the hold short', 1, 'Runway 5, taxi via Alpha, 4521 Hotel.', { 1: 75 }],
      ['ground readback without a runway number', 1, 'Taxi via Alpha, hold short runway 11, 4521 Hotel.', { 1: 70 }],
      ['ground readback without a callsign', 1, 'Runway 5, taxi via Alpha, hold short runway 11.', { 1: 82 }],
      ['tower call not saying ready', 2, 'Redmond Tower, 4521 Hotel, holding short runway 5, northbound departure.', { 2: 75 }],
      ['tower call without holding short', 2, 'Redmond Tower, 4521 Hotel, northbound departure, ready for departure.', { 2: 75 }],
      ['takeoff readback without a runway number', 3, 'Cleared for takeoff, 4521 Hotel.', { 3: 70 }],
      ['takeoff readback without the callsign', 3, 'Cleared for takeoff runway 5.', { 3: 82 }],
      ['VTT: split words, shortened callsign', 0, 'Redmond ground Cessna one seven two 4521H at the transient ramp with information bravo ready to taxi', { 0: 100 }],
      ['VTT: "holding short" garbled to "hold in short", digits as words', 2, 'Redmond tower 4521 Hotel hold in short runway five northbound departure ready', { 2: 100 }],
      ['VTT: "cleared for take off" with merged callsign', 3, 'Cleared for take off runway 54521 Hotel', { 3: 100 }],
      ['callsign at the very end is fine', 1, 'Runway five taxi via Alpha hold short runway one one November 4521 Hotel', { 1: 100 }],
    ]),
  ])
}

// ---------- VFR flight following ----------
{
  const scenario = { facility_name: 'NorCal Approach', facility_freq: '124.0', aircraft_type: 'Cessna 172', position_distance: 12, position_direction: 'south', position_reference: 'Auburn', altitude: 5500, destination_name: 'Reno-Tahoe International', destination_id: 'KRNO', altimeter: '30.04', ...CS }
  const base = [
    { step: 0, phase: 'initial_contact', situation: 'initial', pilot_said: 'NorCal Approach, Cessna 4521 Hotel, 12 miles south of Auburn.' },
    { step: 1, phase: 'squawk_readback', situation: 'squawk', controller_said: 'Cessna four five two one Hotel, squawk three four seven two, NorCal altimeter three zero zero four.', pilot_said: 'Squawk 3472, altimeter 30.04, 4521 Hotel.' },
    { step: 2, phase: 'full_request', situation: 'request', pilot_said: 'NorCal Approach, Cessna 172 4521 Hotel, request VFR flight following to Reno-Tahoe.' },
    { step: 3, phase: 'altitude_report', situation: 'altitude', pilot_said: '4521 Hotel, level at 5,500.' },
  ]
  failed += await run('ff', '/api/vfr-flight-following-grade', (exchanges) => ({ scenario, exchanges, squawk_code: '3472' }), base, [
    ['clean flight following: every call 100', (b) => b, {}],
    ...edits('pilot_said', [
      ['initial contact without a position', 0, 'NorCal Approach, Cessna 4521 Hotel.', { 0: 70 }],
      ['initial contact without the facility', 0, 'Cessna 4521 Hotel, 12 miles south of Auburn.', { 0: 80 }],
      ['squawk not read back', 1, 'Altimeter 30.04, 4521 Hotel.', { 1: 70 }],
      ['wrong squawk read back', 1, 'Squawk 3427, altimeter 30.04, 4521 Hotel.', { 1: 70 }],
      ['altimeter not read back', 1, 'Squawk 3472, 4521 Hotel.', { 1: 75 }],
      ['order swapped and "ident" added is fine', 1, 'Altimeter three zero zero four, squawk three four seven two and ident, 4521 Hotel.', { 1: 100 }],
      ['full request without a destination', 2, 'NorCal Approach, Cessna 172 4521 Hotel, request VFR flight following.', { 2: 70 }],
      ['full request without asking for flight following', 2, 'NorCal Approach, Cessna 172 4521 Hotel, going to Reno-Tahoe.', { 2: 70 }],
      ['full request without aircraft type', 2, 'NorCal Approach, 4521 Hotel, request VFR flight following to Reno-Tahoe.', { 2: 75 }],
      ['altitude report without an altitude', 3, '4521 Hotel, level.', { 3: 70 }],
      ['VTT: digits spoken as words, "tree" and "fore"', 1, 'Squawk tree four seven too altimeter tree zero zero fore 4521 Hotel', { 1: 100 }],
      ['VTT: destination by identifier', 2, 'NorCal Approach Cessna one seven two 4521 Hotel request flight following to Kilo Romeo November Oscar', { 2: 100 }],
      ['VTT: "five thousand five hundred"', 3, '4521 Hotel level five thousand five hundred', { 3: 100 }],
    ]),
  ])
}

// ---------- CTAF ----------
{
  const scenario = { airport_name: 'Auburn', airport_id: 'KAUN', ctaf: '122.8', aircraft_type: 'Cessna 172', runway: '7', pattern: 'left', ...CS }
  const base = [
    { step: 0, phase: 'inbound_10', situation: 'inbound', transcription: 'Auburn traffic, Cessna 4521 Hotel, 10 miles south, inbound for landing runway 7, Auburn.' },
    { step: 1, phase: 'entering_45', situation: '45', transcription: 'Auburn traffic, Cessna 4521 Hotel, entering the 45 for the left downwind runway 7, Auburn.' },
    { step: 2, phase: 'base', situation: 'base', transcription: 'Auburn traffic, 4521 Hotel, left base runway 7, Auburn.' },
    { step: 3, phase: 'final', situation: 'final', transcription: 'Auburn traffic, 4521 Hotel, final runway 7, full stop, Auburn.' },
    { step: 4, phase: 'clear_runway', situation: 'clear', transcription: 'Auburn traffic, 4521 Hotel, clear of runway 7, Auburn.' },
  ]
  failed += await run('ctaf', '/api/vfr-grade', (calls) => ({ scenario, calls }), base, [
    ['clean CTAF pattern: every call 100', (b) => b, {}],
    ...edits('transcription', [
      ['no opening "Auburn traffic"', 2, 'Cessna 4521 Hotel, left base runway 7, Auburn.', { 2: 90 }],
      ['callsign before the airport name at the start', 2, '4521 Hotel, Auburn traffic, left base runway 7, Auburn.', { 2: 90 }],
      ['no closing airport name', 2, 'Auburn traffic, 4521 Hotel, left base runway 7.', { 2: 95 }],
      ['no callsign at all', 2, 'Auburn traffic, left base runway 7, Auburn.', { 2: 55 }],
      ['base without a runway number', 2, 'Auburn traffic, 4521 Hotel, left base, Auburn.', { 2: 70 }],
      ['final without stating the intention', 3, 'Auburn traffic, 4521 Hotel, final runway 7, Auburn.', { 3: 80 }],
      ['"clear of the active" with no number', 4, 'Auburn traffic, 4521 Hotel, clear of the active, Auburn.', { 4: 60 }],
      ['inbound without a distance and direction', 0, 'Auburn traffic, Cessna 4521 Hotel, inbound for landing runway 7, Auburn.', { 0: 70 }],
      ['inbound for the full stop counts as landing intent', 0, 'Auburn traffic, Cessna 4521 Hotel, 10 miles south, inbound for the full stop runway 7, Auburn.', { 0: 100 }],
      ['entering the 45 missing', 1, 'Auburn traffic, Cessna 4521 Hotel, left downwind runway 7, Auburn.', { 1: 70 }],
      ['VTT: "runway seven", split words, abbreviated callsign', 2, 'Auburn Traffic 4521H left base runway seven Auburn', { 2: 100 }],
      ['VTT: touch and go as the intention', 3, 'Auburn traffic 4521 Hotel final runway seven touch and go Auburn', { 3: 100 }],
    ]),
  ])
}

console.log(failed ? `\n${failed} case(s) FAILED` : `\nALL PASS`)
process.exit(failed ? 1 : 0)
