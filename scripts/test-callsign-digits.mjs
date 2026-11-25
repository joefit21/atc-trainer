// A number that contains the callsign's digits (a squawk of 5157 for "Hawaiian 57") is still that number: the callsign
// digits are not cut out of the middle of it. A number made only of callsign digits still does not count.
// Offline checks first, then the real routes (needs the dev server on 3013, BASE to change it).
// Run: node scripts/test-callsign-digits.mjs
import { containsOutsideCallsign, hasRunwayNumber } from '../lib/call-scoring.mjs'
const BASE = process.env.BASE || 'http://localhost:3013'
let failed = 0
const check = (name, got, want) => { const ok = got === want; console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(64), ok ? '' : `got ${got}, want ${want}`); if (!ok) failed++ }

// ----- offline -----
check('5157 contains 5157 (callsign 57)', containsOutsideCallsign('5157', '5157', '57'), true)
check('515757: squawk then callsign', containsOutsideCallsign('515757', '5157', '57'), true)
check('the callsign alone is not a squawk', containsOutsideCallsign('57', '57', '57'), false)
check('callsign digits inside a longer number do not make "21"', containsOutsideCallsign('134521', '21', '4521'), false)
check('runway 13 merged with callsign 4521', containsOutsideCallsign('134521', '13', '4521'), true)
check('no callsign digits', containsOutsideCallsign('5157', '5157', ''), true)
check('wrong code is not found', containsOutsideCallsign('5158', '5157', '57'), false)
check('runway 13, "runway 13" said, callsign 13: not counted when only the callsign', hasRunwayNumber('Hawaiian 13', '13', 'Hawaiian 13'), false)
check('runway 13 merged with callsign digits 4521', hasRunwayNumber('Left downwind runway 134521', '13', 'N4521H'), true)

// ----- the real routes -----
const post = async (url, body) => (await fetch(BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify(body) })).json()
// IFR: the clearance and readback from the screenshot.
const clr = 'hawaiian fifty seven, cleared to columbus as filed, climb and maintain one zero thousand, expect flight level tree tree zero one zero minutes after departure, departure frequency one one eight point eight, squawk five one five seven'
const rb = 'Cleared to the Columbus airport as filed, climb maintain 10,000, expect flight level 330, 10 minutes after departure, frequency 118.8, squawk 5157, Hawaiian 57.'
for (const [name, said, want, must] of [
  ['IFR: squawk 5157 with callsign Hawaiian 57 (the screenshot)', rb, 100, /^Clean call/],
  ['IFR: squawk read back before the callsign', rb.replace(', Hawaiian 57.', '.').replace('Cleared', 'Hawaiian 57, cleared'), 100, /^Clean call/],
  ['IFR: wrong squawk is still wrong', rb.replace('5157', '5158'), 75, /^Your squawk code didn't match: the clearance said five one five seven\.$/],
  ['IFR: squawk left out, only the callsign said', rb.replace(', squawk 5157', ''), 75, /^Read back the squawk code\.$/],
]) {
  const r = await post('/api/grade', { clearance_text: clr, readback_text: said, scenario_type: 'ifr', is_demo: true, callsign: 'Hawaiian 57' })
  check(name, r.score === want && must.test(r.feedback) ? 'pass' : `${r.score} ${r.feedback}`, 'pass')
}
// Flight following: GA callsign N517AB, squawk 5173 contains "517".
const ff = { facility_name: 'NorCal Approach', facility_freq: '125.4', aircraft_type: 'Cessna 172', position_distance: 12, position_direction: 'south', position_reference: 'Auburn', altitude: 6500, destination_name: 'Sacramento Executive', destination_id: 'KSAC', altimeter: '30.04', callsign_display: 'N517AB', callsign_spoken: 'November five one seven alpha bravo' }
const ffCall = (said) => [{ step: 0, phase: 'squawk_readback', situation: 'squawk', controller_said: 'Cessna five one seven alpha bravo, NorCal Approach, squawk five one seven tree, Sacramento altimeter tree zero zero four.', pilot_said: said }]
for (const [name, said, want] of [
  ['FF: squawk 5173 with callsign 517', 'Squawk 5173, altimeter 30.04, 517 Alpha Bravo.', 100],
  ['FF: wrong squawk 5174', 'Squawk 5174, altimeter 30.04, 517 Alpha Bravo.', 70],
]) {
  const r = await post('/api/vfr-flight-following-grade', { scenario: ff, exchanges: ffCall(said), squawk_code: '5173' })
  check(name, r.call_feedback?.[0]?.score, want)
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
