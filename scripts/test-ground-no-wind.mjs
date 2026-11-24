// Ground control must never issue a wind report; only Tower does, with a landing or takeoff clearance.
// Calls the live ground phases several times and fails if any reply mentions wind.
// Run: BASE=http://localhost:3013 RUNS=12 node scripts/test-ground-no-wind.mjs
const BASE = process.env.BASE || 'http://localhost:3013'
const RUNS = Number(process.env.RUNS || 12)
const headers = { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }
const arrival = {
  scenario_type: 'classdarrival', airport_id: 'KPAO', airport_name: 'Palo Alto', state: 'CA', runway: '13', pattern: 'left',
  aircraft_type: 'Cessna 172', callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel',
  atis: { letter: 'Alpha', phonetic: 'alpha', wind_dir: '130', wind_speed: 8, visibility: '10', sky: 'clear', altimeter: '29.98', active_runway: '13' },
  parking_destination: 'GA ramp',
}
const departure = {
  scenario_type: 'classd', airport_id: 'KRDM', airport_name: 'Redmond', runway: '5', pattern: 'left', hold_short_candidates: ['11', '29'], hold_short_runway: '11',
  aircraft_type: 'Cessna 172', callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel',
  position: 'the general aviation ramp', departure_intention: 'northbound departure',
  atis: { letter: 'Bravo', phonetic: 'bravo', wind_dir: '050', wind_speed: 10, visibility: '10', sky: 'clear', altimeter: '30.02', active_runway: '5' },
}
const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) })).json()
const cases = [
  ['arrival: taxi to parking', '/api/vfr-class-d-arrival-response', { scenario: arrival, phase: 'taxi_to_parking', pilot_said: 'Palo Alto Ground, November 4521 Hotel, clear of runway one three, request taxi to the GA ramp' }],
  ['departure: ground taxi', '/api/vfr-class-d-response', { scenario: departure, phase: 'ground', pilot_said: 'Redmond Ground, November 4521 Hotel at the general aviation ramp with Bravo, northbound departure' }],
]
let failed = 0
for (const [name, path, body] of cases) {
  const seen = []
  for (let i = 0; i < RUNS; i++) {
    const r = await post(path, body)
    if (r.error || !r.controller_text) { seen.push('ERROR ' + (r.error || 'no text')); continue }
    seen.push(r.controller_text)
  }
  const bad = seen.filter((t) => /wind|knots|calm|\b\d{3}\s+(at|degrees)\b/i.test(t) || t.startsWith('ERROR'))
  console.log(bad.length ? 'FAIL' : 'ok  ', name, `(${RUNS - bad.length}/${RUNS} clean)`)
  for (const t of bad.slice(0, 3)) console.log('      ', t)
  if (bad.length) failed++
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nALL PASS')
process.exit(failed ? 1 : 0)
