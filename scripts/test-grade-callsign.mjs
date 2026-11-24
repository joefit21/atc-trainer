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
for (const [name, c, r, t, want] of cases) {
  const got = []
  for (let i = 0; i < 4; i++) got.push((await grade(c, r, t)).score)
  const bad = got.some((g) => g !== want)
  console.log(bad ? 'FAIL' : 'ok  ', name.padEnd(36), got.join(','), bad ? '(want ' + want + ')' : '')
  if (bad) failed++
}
console.log(failed ? '\n' + failed + ' FAILED' : '\nALL PASS')
process.exit(failed ? 1 : 0)
