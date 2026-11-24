// Pure tests for the clearance readback checks (no server, no model). Run: node scripts/test-clearance-grading.mjs
import { parseClearance, altitudeSaid, altitudeFromWords, numberGroups } from '../lib/clearance-grading.mjs'
import { IFR_DEMO, IFR_LANDING, GROUND } from '../lib/demo-clearances.mjs'
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }

const tail = ', climb and maintain one zero thousand, expect flight level tree five zero one zero minutes after departure, departure frequency one two five point tree, squawk four tree two one'
const p = parseClearance('november one two tree alpha bravo, cleared to denver via the BAYLR six departure, TEHRU transition, then as filed' + tail, 'ifr')
check('callsign, destination, SID and transition read out', p.callsign_spoken === 'november one two tree alpha bravo' && p.destination === 'denver' && p.sidName === 'BAYLR' && p.sidNumber === 'six' && p.transition === 'TEHRU' && p.routeKind === 'sid', JSON.stringify(p))
check('altitudes, frequency, squawk read out', p.initialAltitude === 10000 && p.expectAltitude === 35000 && p.frequency === '1253' && p.squawk === '4321', JSON.stringify(p))
const kinds = (r) => parseClearance(`november one two tree alpha bravo, cleared to denver ${r}${tail}`, 'ifr').routeKind
check('route kinds', kinds('via radar vectors') === 'vectors' && kinds('as filed') === 'filed' && kinds('via fly runway heading, expect radar vectors on course') === 'heading' && kinds('via the DAY niner departure, then as filed') === 'sid')
check('fly runway heading: the altitude expect is not the routing expect', (() => { const x = parseClearance('november one two tree alpha bravo, cleared to denver via fly runway heading, expect radar vectors on course' + tail, 'ifr'); return x.expectAltitude === 35000 && x.initialAltitude === 10000 })())
const d = parseClearance(IFR_DEMO.clearance_text, 'ifr')
check('IFR demo: destination, altitudes, frequency, squawk', /houston/i.test(d.destination) && d.initialAltitude === 11000 && d.expectAltitude === 15000 && d.frequency === '1243' && d.squawk === '4532' && /^november seven eight two tree kilo$/i.test(d.callsign_spoken), JSON.stringify(d))
const l = parseClearance(IFR_LANDING.clearance_text, 'ifr')
check('landing-page IFR sample parses fully (airline flight level)', l.initialAltitude === 10000 && l.expectAltitude >= 31000 && l.expectAltitude % 1000 === 0 && !!l.frequency && !!l.squawk && /united/i.test(l.callsign_spoken), JSON.stringify(l))

const g = parseClearance(GROUND.clearance_text, 'ground')
check('ground sample parses', g.runway === 'tree one' && /alpha/i.test(g.taxi) && g.instructions.length === 1 && g.instructions[0].verb === 'hold' && g.instructions[0].runway === 'one six', JSON.stringify(g))
const g2 = parseClearance('november one two tree alpha bravo, denver ground, runway three four right, taxi via alpha, bravo, cross runway one six left', 'ground')
check('ground: multi-taxiway and crossing', g2.runway === 'three four right' && /alpha, bravo/i.test(g2.taxi) && g2.instructions[0].verb === 'cross', JSON.stringify(g2))
check('ground with no instruction', parseClearance('november one two tree alpha bravo, salem ground, runway tree one, taxi via alpha', 'ground').instructions.length === 0)

// Altitudes, said many ways
check('altitude: one zero thousand / 10,000 / ten thousand', [ 'climb and maintain one zero thousand', 'climb and maintain 10,000', 'maintain ten thousand', '10000' ].every((q) => altitudeSaid(q, 10000)))
check('altitude: a wrong altitude is wrong', !altitudeSaid('climb and maintain 9,000', 10000) && !altitudeSaid('climb and maintain 12,000', 10000) && !altitudeSaid('21,000', 10000))
check('expect: flight level + ten minutes, many ways', ['expect flight level 350 ten minutes after departure', 'expect flight level tree five zero one zero minutes', 'expect two five zero one zero minutes'.replace('two five zero', 'three five zero'), 'expect 35,000 10 minutes after departure', 'flight level 350 and 10 minutes'].every((q) => altitudeSaid(q, 35000, { minutes: true })))
check('expect: altitude in thousands + minutes', altitudeSaid('expect one five thousand one zero minutes after departure', 15000, { minutes: true }) && altitudeSaid('expect fifteen thousand ten minutes after departure', 15000, { minutes: true }) && altitudeSaid('expect 15,000 10 minutes after departure', 15000, { minutes: true }))
check('expect: missing time or wrong level fails', !altitudeSaid('expect flight level 350', 35000, { minutes: true }) && !altitudeSaid('expect flight level 330 ten minutes after departure', 35000, { minutes: true }) && !altitudeSaid('expect five thousand ten minutes', 15000, { minutes: true }))
check('expect: run-together digits are split correctly', altitudeSaid('expect two five zero one zero minutes after departure', 25000, { minutes: true }))
check('altitudeFromWords', altitudeFromWords('one one thousand') === 11000 && altitudeFromWords('flight level tree five zero') === 35000 && altitudeFromWords('niner thousand') === 9000)
check('numberGroups merges spoken digits only', JSON.stringify(numberGroups('climb and maintain one zero thousand expect flight level tree five zero')) === JSON.stringify(['10T', '350']))

// "Climb via the SID" clearances.
const cvTail = ', climb via the SID, expect flight level tree five zero one zero minutes after departure, departure frequency one two five point tree, squawk four tree two one'
const cv = parseClearance('november one two tree alpha bravo, cleared to denver via the BAYLR six departure, TEHRU transition, then as filed' + cvTail, 'ifr')
check('climb via: parsed as climb via, no initial altitude', cv.climbVia === true && cv.initialAltitude === null, JSON.stringify(cv))
check('climb via: routing, transition and expect altitude still parse', cv.routeKind === 'sid' && cv.sidName === 'BAYLR' && cv.transition === 'TEHRU' && cv.expectAltitude === 35000 && cv.frequency === '1253' && cv.squawk === '4321', JSON.stringify(cv))
check('a climb and maintain clearance is not climb via', p.climbVia === false)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
