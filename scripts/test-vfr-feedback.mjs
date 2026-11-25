// Class D arrival, Class D departure and CTAF feedback: a wrong runway, entry, reporting point, taxiway, ATIS letter,
// facility, airport name or pattern side is told apart from a missing one, and says what was expected.
// Needs the dev server on 3013 (BASE to change it) and ANTHROPIC_API_KEY. Run: node scripts/test-vfr-feedback.mjs
const BASE = process.env.BASE || 'http://localhost:3013'
const CS = { callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel' }
const post = async (url, body) => (await fetch(BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }, body: JSON.stringify(body) })).json()

// ---------- Class D arrival ----------
const arrivalScenario = { airport_name: 'Palo Alto', airport_id: 'KPAO', runway: '13', pattern: 'left', atis: { letter: 'Alpha' }, tower_freq: '118.6', ground_freq: '125.0', parking_destination: 'the GA ramp', ...CS }
const arrival = [
  { step: 0, phase: 'initial_call', situation: 'inbound', pilot_said: 'Palo Alto Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing with information Alpha.' },
  { step: 1, phase: 'pattern_readback', situation: 'readback', controller_said: 'November four five two one Hotel, enter left downwind runway one three, report midfield.', pilot_said: 'Left downwind runway 13, report midfield, 4521 Hotel.' },
  { step: 2, phase: 'position_report', situation: 'report', pilot_said: 'Palo Alto Tower, 4521 Hotel, midfield left downwind runway 13.' },
  { step: 3, phase: 'landing_readback', situation: 'readback', controller_said: 'November four five two one Hotel, runway one three, cleared to land.', pilot_said: 'Cleared to land runway 13, 4521 Hotel.' },
  { step: 4, phase: 'clear_runway_to_ground', situation: 'clear', pilot_said: 'Palo Alto Ground, 4521 Hotel, clear of runway 13, request taxi to the GA ramp.' },
  { step: 5, phase: 'ground_taxi_readback', situation: 'readback', controller_said: 'November four five two one Hotel, taxi via Alpha to the GA ramp.', pilot_said: 'Taxi via Alpha to the GA ramp, 4521 Hotel.' },
]
const straightIn = { controller_said: 'November four five two one Hotel, enter straight in runway one three, report three-mile final.' }

// ---------- Class D departure ----------
const departureScenario = { airport_name: 'Redmond', airport_id: 'KRDM', runway: '5', pattern: 'left', atis: { letter: 'Bravo' }, aircraft_type: 'Cessna 172', ground_freq: '121.7', tower_freq: '118.3', hold_short_runway: '11', ...CS }
const departure = [
  { step: 0, phase: 'ground_call', situation: 'at the ramp', pilot_said: 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp with information Bravo, ready to taxi.' },
  { step: 1, phase: 'ground_readback', situation: 'readback', controller_said: 'November four five two one Hotel, Redmond Ground, runway five, taxi via Alpha, hold short runway one one.', pilot_said: 'Runway 5, taxi via Alpha, hold short runway 11, 4521 Hotel.' },
  { step: 2, phase: 'tower_call', situation: 'holding short', pilot_said: 'Redmond Tower, 4521 Hotel, holding short runway 5, northbound departure, ready for departure.' },
  { step: 3, phase: 'tower_readback', situation: 'readback', controller_said: 'November four five two one Hotel, runway five, cleared for takeoff.', pilot_said: 'Cleared for takeoff runway 5, 4521 Hotel.' },
]

// ---------- CTAF ----------
const ctafScenario = { airport_name: 'Auburn', airport_id: 'KAUN', ctaf: '122.7', aircraft_type: 'Cessna 172', runway: '7', pattern: 'left', ...CS }
const ctaf = [
  { step: 0, phase: 'inbound_10', situation: 'inbound', transcription: 'Auburn traffic, Cessna 4521 Hotel, 10 miles south, inbound for landing runway 7, Auburn.' },
  { step: 1, phase: 'entering_45', situation: '45', transcription: 'Auburn traffic, Cessna 4521 Hotel, entering the 45 for the left downwind runway 7, Auburn.' },
  { step: 2, phase: 'base', situation: 'base', transcription: 'Auburn traffic, 4521 Hotel, left base runway 7, Auburn.' },
  { step: 3, phase: 'final', situation: 'final', transcription: 'Auburn traffic, 4521 Hotel, final runway 7, full stop, Auburn.' },
  { step: 4, phase: 'clear_runway', situation: 'clear', transcription: 'Auburn traffic, 4521 Hotel, clear of runway 7, Auburn.' },
]

// [name, group, step, new words (or an edit of the call), expected score, expected feedback]
const groups = {
  arrival: { url: '/api/vfr-class-d-arrival-grade', base: arrival, body: (exchanges) => ({ scenario: arrivalScenario, exchanges }), said: 'pilot_said' },
  departure: { url: '/api/vfr-class-d-grade', base: departure, body: (exchanges) => ({ scenario: departureScenario, exchanges }), said: 'pilot_said' },
  ctaf: { url: '/api/vfr-grade', base: ctaf, body: (calls) => ({ scenario: ctafScenario, calls }), said: 'transcription' },
}
const cases = [
  // ----- arrival -----
  ['arrival', 'all correct', 5, null, 100, /./],
  ['arrival', 'tower: wrong airport name', 0, 'Redwood Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing with information Alpha.', 85, /^You called the wrong facility: this is Palo Alto Tower\.$/],
  ['arrival', 'ATIS wrong letter', 0, 'Palo Alto Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing with information Charlie.', 85, /^Your ATIS letter didn't match: the current information is Alpha\.$/],
  ['arrival', 'ATIS not said', 0, 'Palo Alto Tower, Cessna 172 November 4521 Hotel, 10 miles southeast, inbound for landing.', 85, /^Say you have the current ATIS/],
  ['arrival', 'entry wrong (right for left)', 1, 'Right downwind runway 13, report midfield, 4521 Hotel.', 70, /^Your pattern entry didn't match: Tower told you to enter left downwind\.$/],
  ['arrival', 'entry not read back', 1, 'Runway 13, report midfield, 4521 Hotel.', 70, /^Read back the entry/],
  ['arrival', 'reporting point wrong', 1, 'Left downwind runway 13, report three mile final, 4521 Hotel.', 75, /^Your reporting point didn't match: Tower wants your next call at midfield\.$/],
  ['arrival', 'reporting point missing', 1, 'Left downwind runway 13, 4521 Hotel.', 75, /^Read back where Tower wants/],
  ['arrival', 'runway wrong in readback', 1, 'Left downwind runway 31, report midfield, 4521 Hotel.', 70, /^Your runway didn't match: the runway in use is runway one three\.$/],
  ['arrival', 'runway missing in readback', 1, 'Left downwind, report midfield, 4521 Hotel.', 70, /^Say the runway number/],
  ['arrival', 'runway wrong in the position report', 2, 'Palo Alto Tower, 4521 Hotel, midfield left downwind runway 31.', 70, /^Your runway didn't match: the runway in use is runway one three\.$/],
  ['arrival', 'a mile count is not a runway', 2, 'Palo Alto Tower, 4521 Hotel, three mile final.', 70, /^Include the runway number/],
  ['arrival', 'landing clearance, wrong runway', 3, 'Cleared to land runway 31, 4521 Hotel.', 70, /^Your runway didn't match: you were cleared to land runway one three\.$/],
  ['arrival', 'landing clearance not read back', 3, 'Runway 13, 4521 Hotel.', 70, /^Read back the clearance/],
  ['arrival', 'ground: wrong facility (Tower)', 4, 'Palo Alto Tower, 4521 Hotel, clear of runway 13, request taxi to the GA ramp.', 85, /^You called the wrong facility: this is Palo Alto Ground\.$/],
  ['arrival', 'clear of the wrong runway', 4, 'Palo Alto Ground, 4521 Hotel, clear of runway 31, request taxi to the GA ramp.', 60, /^Your runway didn't match: you cleared runway one three\.$/],
  ['arrival', '"clear of the active"', 4, 'Palo Alto Ground, 4521 Hotel, clear of the active, request taxi to the GA ramp.', 60, /^Say the specific runway/],
  ['arrival', 'taxiway wrong', 5, 'Taxi via Bravo to the GA ramp, 4521 Hotel.', 75, /^Your taxiway didn't match: Ground said taxi via Alpha\.$/],
  ['arrival', 'taxiway not read back', 5, 'Taxi to the GA ramp, 4521 Hotel.', 75, /^Read back the taxiway/],
  ['arrival', 'destination wrong', 5, 'Taxi via Alpha to the south ramp, 4521 Hotel.', 75, /^Your destination didn't match: Ground sent you to the GA ramp\.$/],
  ['arrival', 'destination not read back', 5, 'Taxi via Alpha, 4521 Hotel.', 75, /^Read back where you are taxiing/],
  // ----- departure -----
  ['departure', 'all correct', 1, null, 100, /./],
  ['departure', 'ground: wrong airport name', 0, 'Bend Ground, Cessna 172 November 4521 Hotel at the transient ramp with information Bravo, ready to taxi.', 85, /^You called the wrong facility: this is Redmond Ground\.$/],
  ['departure', 'ground: called Tower', 0, 'Redmond Tower, Cessna 172 November 4521 Hotel at the transient ramp with information Bravo, ready to taxi.', 85, /^You called the wrong facility: this is Redmond Ground\.$/],
  ['departure', 'ATIS wrong letter', 0, 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp with information Alpha, ready to taxi.', 85, /^Your ATIS letter didn't match: the current information is Bravo\.$/],
  ['departure', 'ATIS not said', 0, 'Redmond Ground, Cessna 172 November 4521 Hotel at the transient ramp, ready to taxi.', 85, /^Say you have the current ATIS/],
  ['departure', 'runway wrong in the ground readback', 1, 'Runway 9, taxi via Alpha, hold short runway 11, 4521 Hotel.', 70, /^Your runway didn't match: the runway in use is runway five\.$/],
  ['departure', 'runway missing, hold short said', 1, 'Taxi via Alpha, hold short runway 11, 4521 Hotel.', 70, /^Read back your assigned runway/],
  ['departure', 'taxiway wrong', 1, 'Runway 5, taxi via Bravo, hold short runway 11, 4521 Hotel.', 75, /^Your taxiway didn't match: Ground said taxi via Alpha\.$/],
  ['departure', 'taxiway missing', 1, 'Runway 5, hold short runway 11, 4521 Hotel.', 75, /^Read back the taxiway/],
  ['departure', 'hold short wrong runway', 1, 'Runway 5, taxi via Alpha, hold short runway 9, 4521 Hotel.', 75, /^Your hold short instruction didn't match: Ground said hold short of runway one one\.$/],
  ['departure', 'hold short missing', 1, 'Runway 5, taxi via Alpha, 4521 Hotel.', 75, /^Read back the hold short/],
  ['departure', 'tower: wrong airport name', 2, 'Bend Tower, 4521 Hotel, holding short runway 5, northbound departure, ready for departure.', 85, /^You called the wrong facility: this is Redmond Tower\.$/],
  ['departure', 'holding short, wrong runway', 2, 'Redmond Tower, 4521 Hotel, holding short runway 23, northbound departure, ready for departure.', 75, /^Your runway didn't match: you are holding short of runway five\.$/],
  ['departure', 'holding short missing', 2, 'Redmond Tower, 4521 Hotel, northbound departure, ready for departure.', 75, /^Say you are holding short/],
  ['departure', 'takeoff clearance, wrong runway', 3, 'Cleared for takeoff runway 23, 4521 Hotel.', 70, /^Your runway didn't match: you were cleared for takeoff runway five\.$/],
  ['departure', 'takeoff clearance, no runway', 3, 'Cleared for takeoff, 4521 Hotel.', 70, /^Read back the clearance/],
  // ----- CTAF -----
  ['ctaf', 'all correct', 2, null, 100, /./],
  ['ctaf', 'wrong airport at the start', 2, 'Placerville traffic, 4521 Hotel, left base runway 7, Auburn.', 90, /^You called the wrong airport: this is Auburn traffic\.$/],
  ['ctaf', 'airport name missing at the start', 2, '4521 Hotel, left base runway 7, Auburn.', 90, /^Start the call with the airport name/],
  ['ctaf', 'wrong airport at the end', 2, 'Auburn traffic, 4521 Hotel, left base runway 7, Placerville traffic.', 95, /^You ended with the wrong airport name: this is Auburn\.$/],
  ['ctaf', 'airport name missing at the end', 2, 'Auburn traffic, 4521 Hotel, left base runway 7.', 95, /^End the call by repeating/],
  ['ctaf', 'wrong base side', 2, 'Auburn traffic, 4521 Hotel, right base runway 7, Auburn.', 70, /^Your base leg didn't match: this is left traffic, so you are on left base\.$/],
  ['ctaf', 'base not said', 2, 'Auburn traffic, 4521 Hotel, runway 7, Auburn.', 70, /^Say which base/],
  ['ctaf', 'wrong 45 side', 1, 'Auburn traffic, Cessna 4521 Hotel, entering the 45 for the right downwind runway 7, Auburn.', 70, /^Your pattern side didn't match: this is left traffic, so you enter the 45 for the left downwind\.$/],
  ['ctaf', '45 not said', 1, 'Auburn traffic, Cessna 4521 Hotel, left downwind runway 7, Auburn.', 70, /^Say where you are in the pattern/],
  ['ctaf', 'wrong runway on base', 2, 'Auburn traffic, 4521 Hotel, left base runway 25, Auburn.', 70, /^Your runway didn't match: the runway in use is runway seven\.$/],
  ['ctaf', 'runway missing on base', 2, 'Auburn traffic, 4521 Hotel, left base, Auburn.', 70, /^Say the runway number/],
  ['ctaf', 'wrong runway cleared', 4, 'Auburn traffic, 4521 Hotel, clear of runway 25, Auburn.', 60, /^Your runway didn't match: you cleared runway seven\.$/],
  ['ctaf', '"clear of the active"', 4, 'Auburn traffic, 4521 Hotel, clear of the active, Auburn.', 60, /^Say "clear of runway" with the specific number/],
  ['ctaf', 'final: wrong runway', 3, 'Auburn traffic, 4521 Hotel, final runway 25, full stop, Auburn.', 70, /^Your runway didn't match: the runway in use is runway seven\.$/],
]

let failed = 0
for (const [group, name, step, said, want, must] of cases) {
  const g = groups[group]
  const calls = g.base.map((e) => (e.step === step && said ? { ...e, [g.said]: said } : e))
  const r = await post(g.url, g.body(calls))
  const c = (r.call_feedback || []).find((x) => x.step === step)
  const ok = c && c.score === want && must.test(c.feedback)
  console.log(ok ? 'ok  ' : 'FAIL', `${group}: ${name}`.padEnd(52), c?.score, JSON.stringify(c?.feedback)); if (!ok) failed++
}

// Straight-in arrival: the entry and reporting point come from the controller's words.
for (const [name, said, want, must] of [
  ['arrival straight-in, all read back', 'Straight in runway 13, report three mile final, 4521 Hotel.', 100, /./],
  ['arrival straight-in, left downwind said', 'Left downwind runway 13, report three mile final, 4521 Hotel.', 70, /^Your pattern entry didn't match: Tower told you to enter straight in\.$/],
  ['arrival straight-in, midfield said', 'Straight in runway 13, report midfield, 4521 Hotel.', 75, /^Your reporting point didn't match: Tower wants your next call at a three-mile final\.$/],
]) {
  const calls = arrival.map((e) => (e.step === 1 ? { ...e, ...straightIn, pilot_said: said } : e))
  const r = await post(groups.arrival.url, groups.arrival.body(calls))
  const c = (r.call_feedback || []).find((x) => x.step === 1)
  const ok = c && c.score === want && must.test(c.feedback)
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(52), c?.score, JSON.stringify(c?.feedback)); if (!ok) failed++
}

console.log(failed ? `\n${failed} case(s) FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
