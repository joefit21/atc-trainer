// What each practice scenario requires of a radio call, and what a missing piece costs.
// Deductions follow each scenario's original grading bands: a minor element about 15 (85 for one),
// a significant one about 30 (70), several together land below 60. A missing callsign caps a call at 82
// (on CTAF, where the original prompt said "below 60", it costs 45). Each scenario also lists the
// code checks that can only ever rescue an element the pilot plainly said.
import { E, hasRunwayNumber, hasReportPoint, hasEntry, spokenDigits } from './call-scoring.mjs'
import { numberGroups, altitudeSaid } from './clearance-grading.mjs'

const CS = E('callsign', 'your callsign', 18, 'Include your callsign.', { cap: 82, modelAnswers: false })

// ----- shared code checks -----

// The taxiway the controller issued ("taxi via Alpha"), found in the pilot's readback.
function taxiwaySaid(said, controllerSaid = '') {
  const m = controllerSaid.toLowerCase().match(/via (?:taxiway )?([a-z]+)/)
  return !!m && said.toLowerCase().includes(m[1])
}

// ======================================================================================
// Class D ARRIVAL
// ======================================================================================
export const ARRIVAL = {
  title: 'during a Class D airport arrival',
  what: 'calls',
  cleanLabel: 'arrival',
  table: {
    initial_call: [
      E('tower_name', 'the facility name', 15, 'Start with who you are calling, like "Palo Alto Tower".'),
      CS,
      E('position', 'distance and direction from the airport', 30, 'Give your distance and direction from the airport, like "10 miles northwest".'),
      E('atis', 'the ATIS letter', 15, 'Say you have the current ATIS, like "with information Alpha".'),
      E('intent', 'your intention to land', 30, 'Say what you want, like "inbound for landing".'),
    ],
    pattern_readback: [
      CS,
      E('entry', 'the pattern entry', 30, 'Read back the entry Tower gave you, like "left downwind" or "straight in".'),
      E('runway', 'the runway number', 30, 'Say the runway number, like "runway one three".'),
      E('report_point', 'the reporting point', 25, 'Read back where Tower wants your next call, like "report midfield".'),
    ],
    position_report: [
      CS,
      E('position', 'your position', 30, 'Report the position Tower asked for, like "midfield left downwind".'),
      E('runway', 'the runway number', 30, 'Include the runway number with your position.'),
    ],
    landing_readback: [
      CS,
      E('cleared_to_land', '"cleared to land" with the runway', 30, 'Read back the clearance, like "cleared to land runway one three".'),
    ],
    clear_runway_to_ground: [
      E('ground_name', 'the facility name (Ground)', 15, 'This call goes to Ground, like "Palo Alto Ground".'),
      CS,
      E('clear_runway', 'which runway you cleared', 40, 'Say the specific runway you are clear of, like "clear of runway one three", not "clear of the active".'),
      E('request_taxi', 'your taxi request', 30, 'Ask for what you need, like "request taxi to the GA ramp".'),
    ],
    ground_taxi_readback: [
      CS,
      E('taxiway', 'the taxiway', 25, 'Read back the taxiway Ground gave you.'),
      E('destination', 'the destination', 25, 'Read back where you are taxiing, like "to the GA ramp".'),
    ],
  },
  help: {
    tower_name: "addressed the airport's Tower by name (any phonetically close version of the name counts)",
    position: 'initial_call: gave a distance AND a direction from the airport (e.g. "10 miles northwest"). position_report: reported the position the controller asked for (e.g. "midfield left downwind", "3-mile final")',
    atis: 'said the ATIS letter (the current one); "landing with <letter>" counts',
    intent: 'said they want to land or are inbound ("landing", "inbound", "full stop")',
    entry: 'read back the entry the controller gave: left or right downwind, or straight in, matching what the controller said',
    runway: 'said the runway number, as numerals or words (13, one three, thirteen all count); the word "runway" is not needed',
    report_point: 'read back the reporting point the controller gave ("midfield", or "three-mile final")',
    cleared_to_land: 'read back the landing clearance with the runway (e.g. "cleared to land runway 13", "cleared to land 13")',
    ground_name: 'addressed Ground (any close version of "<airport> Ground")',
    clear_runway: 'said a SPECIFIC runway number they are clear of. "Clear of the active" or "clear of the runway" with no number is false',
    request_taxi: 'asked for taxi to parking or to a destination',
    taxiway: 'read back the taxiway(s) the controller issued',
    destination: 'read back where they are taxiing (GA ramp, FBO, transient ramp, ...)',
  },
  scenarioText: (s) => `Airport: ${s.airport_name} (${s.airport_id}), Class D
Active runway: ${s.runway}, ${s.pattern} traffic
ATIS: Information ${s.atis.letter}
Callsign: ${s.callsign_display}`,
  rescue(present, call, s) {
    const said = call.pilot_said || ''
    const rwy = hasRunwayNumber(said, s.runway, s.callsign_display)
    for (const k of ['runway', 'clear_runway', 'cleared_to_land']) if (k in present && !rwy) present[k] = false
    if ('runway' in present && rwy) present.runway = true
    if ('clear_runway' in present && rwy && /clear/i.test(said)) present.clear_runway = true
    if ('cleared_to_land' in present && rwy && /clear/i.test(said) && /land/i.test(said)) present.cleared_to_land = true
    if ('entry' in present && !present.entry && call.phase === 'pattern_readback' && hasEntry(said, call.controller_said)) present.entry = true
    if ('report_point' in present && !present.report_point && call.phase === 'pattern_readback' && hasReportPoint(said, call.controller_said)) present.report_point = true
    if ('taxiway' in present && !present.taxiway && taxiwaySaid(said, call.controller_said)) present.taxiway = true
  },
}

// ======================================================================================
// Class D DEPARTURE
// ======================================================================================
export const DEPARTURE = {
  title: 'during a Class D airport departure',
  what: 'calls',
  cleanLabel: 'departure',
  table: {
    ground_call: [
      E('ground_name', 'the facility name (Ground)', 15, 'Start with who you are calling: the airport name and "Ground".'),
      CS,
      E('position', 'your position on the airport', 15, 'Say where you are on the airport, like "at the transient ramp".'),
      E('atis', 'the ATIS letter', 15, 'Say you have the current ATIS, like "with information Alpha".'),
      E('request_taxi', 'your taxi request', 30, 'Ask for what you need, like "ready to taxi".'),
    ],
    ground_readback: [
      CS,
      E('runway', 'the runway number', 30, 'Read back your assigned runway.'),
      E('taxiway', 'the taxiway', 25, 'Read back the taxiway Ground gave you.'),
      E('hold_short', 'the hold short instruction', 25, 'Read back the hold short or crossing instruction Ground gave you.', { when: (c) => /hold short|cross/i.test(c.controller_said || '') }),
    ],
    tower_call: [
      E('tower_name', 'the facility name (Tower)', 15, 'Start with who you are calling: the airport name and "Tower".'),
      CS,
      E('holding_short', 'where you are holding short', 25, 'Say you are holding short of your runway, like "holding short runway five".'),
      E('intention', 'your departure intention', 25, 'Say how you plan to depart, like "northbound departure".'),
      E('ready', 'that you are ready', 25, 'Tell Tower you are ready, like "ready for departure".'),
    ],
    tower_readback: [
      CS,
      E('cleared_takeoff', '"cleared for takeoff" with the runway', 30, 'Read back the clearance, like "cleared for takeoff runway five".'),
    ],
  },
  help: {
    ground_name: 'addressed Ground by name (the airport name plus "Ground"; any phonetically close version counts)',
    position: 'said where they are on the airport (e.g. "at the transient ramp", "at the FBO")',
    atis: (s) => `said the ATIS letter ("with information <letter>"); the current letter is ${s.atis.letter}`,
    request_taxi: 'asked to taxi, or said they are ready to taxi',
    runway: 'read back the runway number (digits or words; the word "runway" is not needed). A runway number is required here even though Ground assigned it',
    taxiway: 'read back the taxiway Ground issued',
    hold_short: 'read back the hold short or crossing instruction Ground issued, naming that runway',
    tower_name: 'addressed Tower by name (the airport name plus "Tower"; any phonetically close version counts)',
    holding_short: 'said they are holding short of the runway (e.g. "holding short runway five")',
    intention: 'said their departure direction or intention (e.g. "northbound departure", "closed traffic")',
    ready: 'said they are ready for departure (e.g. "ready for departure", "ready")',
    cleared_takeoff: 'read back the takeoff clearance with the runway (e.g. "cleared for takeoff runway five", "cleared for takeoff five")',
  },
  scenarioText: (s) => `Airport: ${s.airport_name} (${s.airport_id}), Class D
Departure runway: ${s.runway}
ATIS: Information ${s.atis.letter}
Callsign: ${s.callsign_display}`,
  rescue(present, call, s) {
    const said = call.pilot_said || ''
    const rwy = hasRunwayNumber(said, s.runway, s.callsign_display)
    for (const k of ['runway', 'cleared_takeoff']) if (k in present && !rwy) present[k] = false
    if ('runway' in present && rwy) present.runway = true
    if ('cleared_takeoff' in present && rwy && /clear/i.test(said) && /take\s?off/i.test(said)) present.cleared_takeoff = true
    if ('taxiway' in present && !present.taxiway && taxiwaySaid(said, call.controller_said)) present.taxiway = true
    // The hold short must name the runway Ground named.
    if ('hold_short' in present && !present.hold_short && /hold\s?(ing)?\s?short|cross/i.test(said) && s.hold_short_runway && hasRunwayNumber(said, s.hold_short_runway, s.callsign_display)) present.hold_short = true
  },
}

// ======================================================================================
// VFR FLIGHT FOLLOWING
// ======================================================================================
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

// Whether the facility called is the right one. "Approach" alone is fine; a name before it must sound like
// ours ("Nor Cal Approach" for NorCal Approach), and a different name ("Seattle Approach") is wrong.
function facilitySaid(quote, facilityName) {
  const expected = String(facilityName).toLowerCase().replace(/\b(approach|center|departure|control)\b/g, '').replace(/[^a-z]/g, '')
  const words = String(quote || '').toLowerCase().split(/[^a-z]+/).filter(Boolean)
  const at = words.findIndex((w) => /^(approach|center|departure|control)$/.test(w))
  if (at <= 0 || !expected) return true
  const FILLER = new Set(['the', 'hello', 'hi', 'this', 'to', 'good', 'morning', 'afternoon', 'evening', 'and', 'with', 'for', 'calling', 'on'])
  const before = [words[at - 1], words.slice(Math.max(0, at - 2), at).join('')].filter((w) => w && !FILLER.has(w))
  if (before.length === 0) return true
  return before.some((w) => editDistance(w, expected) <= Math.max(2, Math.floor(expected.length * 0.35)))
}

// Whether the quoted words name an airport by its identifier: "KSAC", "SAC", "Kilo Sierra Alpha Charlie".
const PHON = { alpha: 'a', alfa: 'a', bravo: 'b', charlie: 'c', delta: 'd', echo: 'e', foxtrot: 'f', golf: 'g', hotel: 'h', india: 'i', juliet: 'j', juliett: 'j', kilo: 'k', lima: 'l', mike: 'm', november: 'n', oscar: 'o', papa: 'p', quebec: 'q', romeo: 'r', sierra: 's', tango: 't', uniform: 'u', victor: 'v', whiskey: 'w', whisky: 'w', xray: 'x', yankee: 'y', zulu: 'z' }
function identifierSaid(text, id) {
  if (!id) return false
  const letters = String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map((t) => PHON[t] ?? (t.length <= 4 ? t : '#')).join('')
  const want = id.toLowerCase()
  return letters.includes(want) || (want.length === 4 && letters.includes(want.slice(1)))
}

// Whether the quoted words name the destination: a distinctive word of its name, or its identifier.
function destinationSaid(quote, name, id) {
  const GENERIC = new Set(['airport', 'international', 'regional', 'municipal', 'executive', 'field', 'county', 'memorial', 'airpark', 'the', 'and'])
  const words = String(name || '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !GENERIC.has(w))
  const said = String(quote || '').toLowerCase().split(/[^a-z]+/).filter(Boolean)
  const byName = words.some((w) => said.some((t) => t.length >= 3 && (t.startsWith(w.slice(0, 4)) || w.startsWith(t.slice(0, 4)))))
  return byName || identifierSaid(quote, id)
}

// Digits as the controller says them in flight following ("three zero zero four"), for feedback.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner']
const sayFF = (digits) => String(digits || '').split('').map((d) => WORDS[Number(d)]).join(' ')

export const FLIGHT_FOLLOWING = {
  title: 'during a VFR flight following request',
  what: 'calls',
  cleanLabel: 'flight following request',
  table: {
    initial_contact: [
      E('facility', 'the facility name', 20, 'Start by naming who you are calling, like "NorCal Approach".', { modelAnswers: false, wrong: (c, s) => `You called the wrong facility: this is ${s.facility_name}.` }),
      CS,
      E('position', 'your position (distance, direction and a reference point)', 30, 'Give your position as a distance, a direction and a reference point, like "12 miles south of Auburn".'),
    ],
    squawk_readback: [
      CS,
      E('squawk', 'the squawk code', 30, 'Read back the four-digit squawk code.', { wrong: (c) => `Your squawk code didn't match: the controller said ${sayFF(c.expected?.squawk)}.` }),
      E('altimeter', 'the altimeter setting', 25, 'Read back the altimeter setting.', { wrong: (c) => `Your altimeter setting didn't match: the controller said ${sayFF(c.expected?.altimeter)}.` }),
    ],
    full_request: [
      CS,
      E('aircraft_type', 'your aircraft type', 25, 'Give your aircraft type, like "Cessna one seven two".', { wrong: (c, s) => `Your aircraft type didn't match: you are flying a ${s.aircraft_type}.` }),
      E('destination', 'your destination', 30, 'Say where you are going.', { wrong: (c, s) => `Your destination didn't match: you are going to ${s.destination_name} (${s.destination_id}).` }),
      E('ff_request', 'the flight following request', 30, 'Ask for what you want, like "request VFR flight following".'),
    ],
    altitude_report: [
      CS,
      E('altitude', 'your altitude', 30, 'State your altitude.', { modelAnswers: false, wrong: (c, s) => `Your altitude didn't match: you are at ${Number(s.altitude).toLocaleString('en-US')} feet.` }),
    ],
  },
  help: {
    facility: (s) => `addressed the controlling facility (${s.facility_name}; "Approach" alone or a partial name counts)`,
    position: (s) => `gave a distance, a direction and a reference point (expected something like ${s.position_distance} miles ${s.position_direction} of ${s.position_reference})`,
    squawk: 'read back the four-digit squawk code the controller issued',
    altimeter: 'read back the altimeter setting digits ("three zero zero four" = 30.04); the decimal point and the station name are not needed',
    aircraft_type: (s) => `said their aircraft type (${s.aircraft_type}; "Cessna" alone or "one seven two" counts)`,
    destination: (s) => `said the destination (${s.destination_name} or ${s.destination_id}; ICAO phonetics, a partial name or the identifier all count)`,
    ff_request: 'asked for flight following or VFR advisories (the words "flight following" anywhere count)',
    altitude: (s) => `stated their altitude (about ${s.altitude} ft; "five thousand five hundred" = 5,500)`,
  },
  extraRules: [
    'Squawk and altimeter can be read back in either order, "ident" is not required, and the station name is optional.',
    'Digits that VTT has transposed or merged ("forty-five twenty-one" = 4521) still count as the right digits.',
  ],
  scenarioText: (s) => `Facility: ${s.facility_name} (${s.facility_freq})
Aircraft: ${s.aircraft_type} ${s.callsign_display}
Position: ${s.position_distance} miles ${s.position_direction} of ${s.position_reference}
Altitude: ${s.altitude} ft MSL
Destination: ${s.destination_name} (${s.destination_id})
Altimeter: ${s.altimeter}
Squawk code issued: ${s.squawk_code || '(see the controller\'s words)'}`,
  rescue(present, call, s, answers) {
    const said = call.pilot_said || ''
    const digits = spokenDigits(said, s.callsign_display)
    // The issued code: passed with the call, else on the scenario, else read from the controller's words.
    const afterSquawk = (call.controller_said || '').split(/squawk/i)[1] || ''
    const squawk = call.squawk_code || s.squawk_code || spokenDigits(afterSquawk).slice(0, 4)
    // The codes are known, so code decides these two: a wrong squawk or altimeter is not a read-back.
    if ('squawk' in present && squawk) present.squawk = digits.includes(String(squawk))
    const altimeter = String(s.altimeter || '').replace(/\D/g, '')
    if ('altimeter' in present && altimeter.length === 4) present.altimeter = digits.includes(altimeter)
    if ('ff_request' in present && !present.ff_request && /flight\s?following|advisories/i.test(said)) present.ff_request = true
    // The facility called must be the right one.
    if (call.phase === 'initial_contact') {
      const expected = String(s.facility_name).toLowerCase().replace(/\b(approach|center|departure|control)\b/g, '').replace(/[^a-z]/g, '')
      const words = said.toLowerCase().split(/[^a-z]+/).filter(Boolean)
      const near = (w) => editDistance(w, expected) <= Math.max(2, Math.floor(expected.length * 0.35))
      const nameSaid = expected && words.some((w, i) => near(w) || (words[i + 1] && near(w + words[i + 1])))
      present.facility = (/\b(approach|center|departure|control)\b/i.test(said) && facilitySaid(said, s.facility_name)) || !!nameSaid
    }
    // The destination quoted must be the destination (a different airport is not).
    if ('destination' in present && present.destination && !destinationSaid(answers?.destination, s.destination_name, s.destination_id)) present.destination = false
    // The altitude is a known number, so code decides it.
    if (call.phase === 'altitude_report') {
      const cs = String(s.callsign_display || '').replace(/\D/g, '')
      const text = cs ? said.split(cs).join(' ') : said
      present.altitude = altitudeSaid(text, Number(s.altitude)) || numberGroups(text).includes(`${Number(s.altitude) / 100}H`)
    }

    // What was expected, for the feedback; and which elements the pilot said something for, so "didn't match"
    // is told apart from "missing".
    call.expected = { squawk: String(squawk || ''), altimeter }
    const attempted = (call.attempted = {})
    const numberAfter = (re, minDigits) => { const m = said.match(re); return !!m && numberGroups(said.slice(m.index + m[0].length, m.index + m[0].length + 40)).some((g) => g.replace(/\D/g, '').length >= minDigits) }
    const afterCode = squawk ? digits.replace(String(squawk), '') : digits
    attempted.squawk = numberAfter(/\bsquawk/i, 3)
    attempted.altimeter = numberAfter(/\baltimeter/i, 3) || (!!squawk && digits.includes(String(squawk)) && afterCode.length >= 3)
    attempted.altitude = numberGroups(said.split(String(s.callsign_display || '').replace(/\D/g, '') || '\u0000').join(' ')).some((g) => /\d/.test(g))
    attempted.facility = /\b[a-z]+(?: [a-z]+)?\s+(approach|center|departure|control)\b/i.test(said)
    attempted.destination = /\b(destination|going to|headed to|heading to|bound for|flying to|en route to|proceeding to|flight following to|advisories to)\s+(?!flight following|vfr)\w/i.test(said)
    attempted.aircraft_type = /\b(cessna|piper|cirrus|beech(craft)?|bonanza|mooney|cherokee|archer|skyhawk|skylane|baron|diamond|grumman|tiger|comanche)\b/i.test(said)
  },
}

// ======================================================================================
// CTAF (uncontrolled airport)
// ======================================================================================
const OPENING = E('opening', 'the airport name and "traffic" at the start', 10, 'Start the call with the airport name and "traffic" so other traffic knows where you are.', { where: 'start' })
const CLOSING = E('closing', 'the airport name repeated at the end', 5, 'End the call by repeating the airport name.', { where: 'end' })
const CTAF_CS = E('callsign', 'your callsign', 45, 'Include your callsign.', { modelAnswers: false })
const RUNWAY = E('runway', 'the runway number', 30, 'Say the runway number you are using.', { needsNumber: true })

export const CTAF = {
  title: 'on CTAF at an uncontrolled airport (there is no controller: never mention controllers)',
  what: 'calls',
  cleanLabel: 'pattern',
  table: {
    inbound_10: [OPENING, CTAF_CS, E('position', 'distance and direction from the airport', 30, 'Give your distance and direction from the airport, like "10 miles south".'), E('intent', 'your intention to land', 30, 'Say you intend to land, like "inbound for landing".'), RUNWAY, CLOSING],
    entering_45: [OPENING, CTAF_CS, E('entry45', 'that you are entering the 45', 30, 'Say where you are in the pattern, like "entering the 45 for the left downwind".'), RUNWAY, CLOSING],
    base: [OPENING, CTAF_CS, E('base_leg', 'the base leg', 30, 'Say which base you are on, like "left base".'), RUNWAY, CLOSING],
    final: [OPENING, CTAF_CS, E('final_call', 'that you are on final', 25, 'Say you are on final.'), RUNWAY, CLOSING],
    clear_runway: [OPENING, CTAF_CS, E('clear_runway', 'which runway you cleared', 40, 'Say "clear of runway" with the specific number, not "clear of the active".', { needsNumber: true }), CLOSING],
  },
  help: {
    opening: (s) => `began the call with the airport name and "traffic" (any phonetically close version of "${s.airport_name}" counts), with nothing before it, not even the callsign`,
    closing: 'ended the call by repeating the airport name (it must be the last words of the call)',
    position: 'gave a distance AND a direction from the airport (e.g. "10 miles south")',
    intent: 'said they intend to land ("inbound for landing", "inbound for the full stop", "inbound for runway X", "landing <airport>" all count)',
    runway: 'said a runway number, as digits or number words',
    entry45: 'said they are entering the 45, or the 45 for the downwind',
    base_leg: 'said "left base" or "right base"',
    final_call: 'said they are on final',
    clear_runway: 'said "clear of runway" with a specific number. "Clear of the active" or "clear of the runway" with no number is null',
  },
  scenarioText: (s) => `Airport: ${s.airport_name} (${s.airport_id}), CTAF ${s.ctaf}
Aircraft: ${s.aircraft_type} ${s.callsign_display}
Runway in use: ${s.runway}, ${s.pattern} traffic`,
  rescue(present, call, s) {
    const said = call.pilot_said || ''
    // "Entering the 45" needs the 45 itself (the callsign's own digits are taken out first).
    if ('entry45' in present) {
      const cs = String(s.callsign_display || '').replace(/\D/g, '')
      const t = cs ? said.split(cs).join(' ') : said
      present.entry45 = /\b4[\s-]?5\b|\bforty[\s-]?five\b|\bfour[\s-]?five\b/i.test(t)
    }
    if ('runway' in present && !present.runway && hasRunwayNumber(said, s.runway, s.callsign_display)) present.runway = true
    if ('clear_runway' in present && !present.clear_runway && /clear/i.test(said) && hasRunwayNumber(said, s.runway, s.callsign_display)) present.clear_runway = true
  },
}
