// A missing callsign must always cost the same on the IFR and ground readback grader: 82, never 0 or 85.
// Needs the dev server on port 3013. Run: node scripts/test-grade-callsign.mjs
const BASE = process.env.BASE || 'http://localhost:3013'
const grade = async (c, r, t) => (await fetch(BASE + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: c, readback_text: r, scenario_type: t, is_demo: true }) })).json()
const ifr = 'november one two tree alpha bravo, cleared to denver via the BAYLR six departure, then as filed, climb and maintain one zero thousand, expect flight level tree five zero one zero minutes after departure, departure frequency one two five point tree, squawk four tree two one'
const rb = 'cleared to Denver via the Baylor six departure then as filed climb and maintain 10,000 expect flight level 350 ten minutes after departure departure frequency 125.3 squawk 4321'
const ifrCv = ifr.replace('climb and maintain one zero thousand', 'climb via the SID')
const rbCv = rb.replace('climb and maintain 10,000', 'climb via the SID')
// An airline clearance with a flight level; voice-to-text wrote "flight level three zero zero" as "3-0".
const air = 'hawaiian fifteen, cleared to houston hobby via fly runway heading, expect radar vectors on course, climb and maintain one one thousand, expect flight level tree zero zero one zero minutes after departure, departure frequency one two seven point two, squawk four seven zero two'
const airRb = 'Hawaiian 15, cleared to the Houston airport via fly runway heading, expect radar vectors on course, climb and maintain 1-1000, expect flight level 3-0, 1-0 minutes after departure, frequency 127.2, squawk 4-7-0-2.'
// Feedback names exactly what was missing: the expected altitude, the time after departure, or both.
const pal = 'november zero zero one xray juliet, cleared to palo alto via radar vectors, climb and maintain one two thousand, expect flight level one niner zero one zero minutes after departure, departure frequency one tree tree point two, squawk four seven zero zero'
const palRb = 'N-001XJ, cleared the Palo Alto airport via radar vectors, climb and maintain 1-2000, expect flight level 1-9-0, 1-0 minutes after departure, frequency 133.2, squawk 4-7-0-0.'
const ground = 'november one two tree alpha bravo, salem ground, runway tree one, taxi via alpha, hold short of runway one six'
const gb = 'runway 31 taxi via Alpha hold short of runway 16'
const cs = 'November 123 Alpha Bravo '
const cases = [
  ['IFR, correct with callsign', ifr, cs + rb, 'ifr', 100],
  ['IFR, correct, callsign at end', ifr, rb + ' November 123 Alpha Bravo', 'ifr', 100],
  ['IFR, no callsign', ifr, rb, 'ifr', 82],
  ['IFR, no callsign and nothing else', ifr, 'okay', 'ifr', 0],
  ['climb via, correct with callsign', ifrCv, cs + rbCv, 'ifr', 100],
  ['climb via, "climb via the S I D" spoken out', ifrCv, cs + rbCv.replace('climb via the SID', 'climb via the S I D'), 'ifr', 100],
  ['climb via, not read back', ifrCv, cs + rbCv.replace('climb via the SID', ''), 'ifr', 75],
  ['climb via, an altitude instead of climb via', ifrCv, cs + rbCv.replace('climb via the SID', 'climb and maintain 10,000'), 'ifr', 75],
  ['climb via, wrong expect altitude', ifrCv, cs + rbCv.replace('flight level 350', 'flight level 330'), 'ifr', 75],
  ['airline FL300 with a zero lost in transcription', air, airRb, 'ifr', 100],
  ['airline FL300 with the wrong flight level', air, airRb.replace('flight level 3-0', 'flight level 3-3-0'), 'ifr', 75],
  ['ground, correct with callsign', ground, cs + gb, 'ground', 100],
  ['ground, no callsign', ground, gb, 'ground', 82],
  ['ground, wrong runway', ground, cs + 'runway 13 taxi via Alpha hold short of runway 16', 'ground', 70],
  ['ground, hold short dropped', ground, cs + 'runway 31 taxi via Alpha', 'ground', 70],
  ['IFR, wrong squawk', ifr, cs + rb.replace('4321', '4312'), 'ifr', 75],
  ['IFR, wrong SID number', ifr, cs + rb.replace('six', 'seven'), 'ifr', 70],
]
let failed = 0
const feedbackCases = [
  ['expect altitude wrong, time said: asks for the altitude only', palRb.replace('1-9-0', '1-0-0'), 75, /expected altitude didn't match: the clearance said flight level one niner zero/i, /time after departure/i],
  ['expect altitude right, time not said: asks for the time only', palRb.replace(', 1-0 minutes after departure', ' after departure'), 90, /time after departure/i, /altitude to expect/i],
  ['expect altitude and time both missing', palRb.replace('expect flight level 1-9-0, 1-0 minutes after departure,', ''), 65, /altitude to expect[\s\S]*time after departure/i, null],
  ['everything right', palRb, 100, /clean call/i, null],
]

// Wrong is told apart from missing, and the feedback says what the clearance had.
const dal = 'delta twenty nine eighty nine, cleared to minneapolis as filed, climb and maintain one zero thousand, expect flight level tree eight zero one zero minutes after departure, departure frequency one two one point two, squawk seven five tree five'
const dalRb = 'Delta 2989, cleared to the Minneapolis airport as filed, climb and maintain 10000, expect flight level 380, 10 minutes after departure, frequency 121.2, squawk 7535.'
const wrongCases = [
  ['frequency wrong', dalRb.replace('121.2', '121.1'), 80, /departure frequency didn't match: the clearance said one two one point two/],
  ['frequency not read back', dalRb.replace(', frequency 121.2', ''), 80, /^Read back the departure frequency\.$/],
  ['squawk wrong', dalRb.replace('7535', '7553'), 75, /squawk code didn't match: the clearance said seven five tree five/],
  ['squawk not read back', dalRb.replace(', squawk 7535', ''), 75, /^Read back the squawk code\.$/],
  ['initial altitude wrong', dalRb.replace('10000', '11000'), 75, /initial altitude didn't match: the clearance said one zero thousand/],
  ['initial altitude not read back', dalRb.replace('climb and maintain 10000, ', ''), 75, /^Read back the altitude you were told to climb and maintain\.$/],
  ['time wrong (the altitude is still right)', dalRb.replace('10 minutes', '15 minutes'), 90, /^Your time after departure didn't match/],
  ['destination wrong', dalRb.replace('Minneapolis', 'Chicago'), 80, /^Your destination didn't match: the clearance was to Minneapolis\.$/],
  ['routing wrong (vectors for as filed)', dalRb.replace('as filed', 'via radar vectors'), 70, /^Your routing didn't match/],
  ['"minutes" does not stand in for the city "Minneapolis"', dalRb.replace('the Minneapolis airport', 'the airport'), 80, /^Read back where you are cleared to\.$/],
]
for (const [name, r, want, must] of wrongCases) {
  const g = await (await fetch(BASE + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: dal, readback_text: r, scenario_type: 'ifr', is_demo: true, callsign: 'DAL2989' }) })).json()
  const ok = g.score === want && must.test(g.feedback)
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(56), g.score, JSON.stringify(g.feedback)); if (!ok) failed++
}

// The same for ground: wrong versus missing, and a taxiway that is a different letter is wrong.
const gcs = 'November 123 Alpha Bravo '
const groundCases = [
  ['ground: runway wrong', gcs + 'runway 13 taxi via Alpha hold short of runway 16', 70, /^Your runway didn't match: Ground assigned runway tree one\.$/],
  ['ground: runway not read back', gcs + 'taxi via Alpha hold short of runway 16', 70, /^Read back your assigned runway\.$/],
  ['ground: hold short runway wrong', gcs + 'runway 31 taxi via Alpha hold short of runway 34', 70, /^Your hold short or crossing instruction didn't match: Ground said hold short of runway one six\.$/],
  ['ground: hold short not read back', gcs + 'runway 31 taxi via Alpha', 70, /^Read back the hold short or crossing instruction/],
  ['ground: wrong taxiway (and the callsign letters do not count)', gcs + 'runway 31 taxi via Bravo hold short of runway 16', 70, /^Your taxi route didn't match: Ground said alpha\.$/],
  ['ground: taxiway said as a bare letter', gcs + 'runway 31 taxi via taxiway A hold short of runway 16', 100, /^Clean call/],
]
for (const [name, r, want, must] of groundCases) {
  const g = await (await fetch(BASE + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: ground, readback_text: r, scenario_type: 'ground', is_demo: true, callsign: 'N123AB' }) })).json()
  const ok = g.score === want && must.test(g.feedback)
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(56), g.score, JSON.stringify(g.feedback)); if (!ok) failed++
}
for (const [name, r, want, must, mustNot] of feedbackCases) {
  const g = await (await fetch(BASE + '/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: pal, readback_text: r, scenario_type: 'ifr', is_demo: true, callsign: 'N001XJ' }) })).json()
  const ok = g.score === want && must.test(g.feedback) && (!mustNot || !mustNot.test(g.feedback))
  console.log(ok ? 'ok  ' : 'FAIL', name.padEnd(56), g.score, JSON.stringify(g.feedback)); if (!ok) failed++
}
for (const [name, c, r, t, want] of cases) {
  const got = []
  for (let i = 0; i < 4; i++) got.push((await grade(c, r, t)).score)
  const bad = got.some((g) => g !== want)
  console.log(bad ? 'FAIL' : 'ok  ', name.padEnd(36), got.join(','), bad ? '(want ' + want + ')' : '')
  if (bad) failed++
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nALL PASS')
process.exit(failed ? 1 : 0)
