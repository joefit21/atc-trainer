// Flight following feedback: a wrong squawk, altimeter, altitude, destination, aircraft type or facility is told
// apart from a missing one, and says what was expected. Needs the dev server on 3013 (BASE to change it).
// Run: node scripts/test-ff-feedback.mjs
const BASE = process.env.BASE || 'http://localhost:3013'
const scenario = { facility_name: 'NorCal Approach', facility_freq: '125.4', aircraft_type: 'Cessna 172', position_distance: 12, position_direction: 'south', position_reference: 'Auburn', altitude: 6500, destination_name: 'Sacramento Executive', destination_id: 'KSAC', altimeter: '30.04', callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel' }
const base = [
  { step: 0, phase: 'initial_contact', situation: 'initial', pilot_said: 'NorCal Approach, Cessna 4521 Hotel, 12 miles south of Auburn.' },
  { step: 1, phase: 'squawk_readback', situation: 'squawk', controller_said: 'Cessna four five two one Hotel, NorCal Approach, squawk three four seven two, Sacramento altimeter three zero zero four.', pilot_said: 'Squawk 3472, altimeter 30.04, 4521 Hotel.' },
  { step: 2, phase: 'full_request', situation: 'request', pilot_said: 'NorCal Approach, Cessna 172 4521 Hotel, request VFR flight following to Sacramento Executive.' },
  { step: 3, phase: 'altitude_report', situation: 'altitude', pilot_said: '4521 Hotel, level at 6,500.' },
]
const cases = [
  ['all correct', 1, null, 100, /./],
  ['squawk wrong', 1, 'Squawk 3427, altimeter 30.04, 4521 Hotel.', 70, /^Your squawk code didn't match: the controller said three four seven two\.$/],
  ['squawk not read back', 1, 'Altimeter 30.04, 4521 Hotel.', 70, /^Read back the four-digit squawk code\.$/],
  ['altimeter wrong', 1, 'Squawk 3472, altimeter 30.14, 4521 Hotel.', 75, /^Your altimeter setting didn't match: the controller said three zero zero four\.$/],
  ['altimeter wrong, no word "altimeter"', 1, 'Squawk 3472, 3014, 4521 Hotel.', 75, /^Your altimeter setting didn't match/],
  ['altimeter not read back', 1, 'Squawk 3472, 4521 Hotel.', 75, /^Read back the altimeter setting\.$/],
  ['both wrong', 1, 'Squawk 3427, altimeter 30.14, 4521 Hotel.', 45, /squawk code didn't match.*altimeter setting didn't match/],
  ['altitude wrong', 3, '4521 Hotel, level at 5,500.', 70, /^Your altitude didn't match: you are at 6,500 feet\.$/],
  ['altitude not stated', 3, '4521 Hotel, level.', 70, /^State your altitude\.$/],
  ['destination wrong', 2, 'NorCal Approach, Cessna 172 4521 Hotel, request VFR flight following to Reno-Tahoe.', 70, /^Your destination didn't match: you are going to Sacramento Executive \(KSAC\)\.$/],
  ['destination not said', 2, 'NorCal Approach, Cessna 172 4521 Hotel, request VFR flight following.', 70, /^Say where you are going\.$/],
  ['aircraft type wrong', 2, 'NorCal Approach, Piper Cherokee 4521 Hotel, request VFR flight following to Sacramento Executive.', 75, /^Your aircraft type didn't match: you are flying a Cessna 172\.$/],
  ['aircraft type not given', 2, 'NorCal Approach, 4521 Hotel, request VFR flight following to Sacramento Executive.', 75, /^Give your aircraft type/],
  ['facility wrong', 0, 'Seattle Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 80, /^You called the wrong facility: this is NorCal Approach\.$/],
  ['facility not named', 0, 'Cessna 4521 Hotel, 12 miles south of Auburn.', 80, /^Start by naming who you are calling/],
]
let failed = 0
for (const [name, step, said, want, must] of cases) {
  const exchanges = base.map((e) => (e.step === step && said ? { ...e, pilot_said: said } : e))
  const r = await (await fetch(BASE + '/api/vfr-flight-following-grade', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify({ scenario, exchanges, squawk_code: '3472' }) })).json()
  const c = (r.call_feedback || []).find((x) => x.step === step)
  const ok = c && c.score === want && must.test(c.feedback)
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(40), c?.score, JSON.stringify(c?.feedback)); if (!ok) failed++
}

// Multi-word facility names: a shortened name is fine, a different one is wrong.
for (const [fac, said, want] of [
  ['Salt Lake City Approach', 'Salt Lake City Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
  ['Salt Lake City Approach', 'Salt Lake Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
  ['Salt Lake City Approach', 'Denver Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 80],
  ['Los Angeles Center', 'Los Angeles Center, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
  ['Los Angeles Center', 'Oakland Center, Cessna 4521 Hotel, 12 miles south of Auburn.', 80],
  ['Oklahoma City Approach', 'Oklahoma City Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
  ['NorCal Approach', 'Nor Cal Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
  ['NorCal Approach', 'Approach, Cessna 4521 Hotel, 12 miles south of Auburn.', 100],
]) {
  const r = await (await fetch(BASE + '/api/vfr-flight-following-grade', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify({ scenario: { ...scenario, facility_name: fac }, exchanges: [{ step: 0, phase: 'initial_contact', situation: 'initial', pilot_said: said }] }) })).json()
  const c = r.call_feedback?.[0]
  const ok = c?.score === want
  console.log(ok ? 'ok  ' : 'FAIL', `${fac}: "${said.split(',')[0]}"`.padEnd(60), c?.score, JSON.stringify(c?.feedback)); if (!ok) failed++
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
