// Grader regression tests, part 2: ground clearances and older behaviours. Same setup as test-grader.mjs.
// Run: node scripts/test-grader-more.mjs
const grade = async (c, r, t) => { try { return await (await fetch('http://localhost:3013/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: c, readback_text: r, scenario_type: t, is_demo: true }) })).json() } catch (e) { return { error: String(e) } } }
const ground = 'november one two tree alpha bravo, denver ground, runway three four right, taxi via alpha, bravo, hold short of runway three four right'
const tail = ', climb and maintain one zero thousand, expect flight level tree five zero one zero minutes after departure, departure frequency one two five point tree, squawk four tree two one'
const rbTail = 'climb and maintain 10,000 expect flight level 350 ten minutes after departure departure frequency 125.3 squawk 4321'
const cases = [
  ['ground  correct', ground, 'November 123 Alpha Bravo runway 34 right taxi via Alpha Bravo hold short of runway 34 right', 'ground', 'ok'],
  ['ground  correct, callsign at end', ground, 'Runway 34 right taxi via Alpha Bravo hold short runway 34 right November 123 Alpha Bravo', 'ground', 'ok'],
  ['ground  forgot hold short', ground, 'November 123 Alpha Bravo runway 34 right taxi via Alpha Bravo', 'ground', 'bad'],
  ['ground  no callsign', ground, 'Runway 34 right taxi via Alpha Bravo hold short of runway 34 right', 'ground', 'bad'],
  ['IFR     correct, callsign at end', 'november one two tree alpha bravo, cleared to denver as filed' + tail, `Cleared to Denver as filed ${rbTail} November 123 Alpha Bravo`, 'ifr', 'ok'],
  ['IFR     voice-to-text mangled words', 'november one two tree alpha bravo, cleared to denver as filed' + tail, `November 123 Alpha Bravo cleared to Denver as filed climate and maintain 10,000 expect flight level 350 10 minutes chapter departure free quency 125.3 squawk 4321`, 'ifr', 'ok'],
  ['IFR     wrong altitude', 'november one two tree alpha bravo, cleared to denver as filed' + tail, `November 123 Alpha Bravo cleared to Denver as filed climb and maintain 9,000 expect flight level 350 ten minutes after departure departure frequency 125.3 squawk 4321`, 'ifr', 'bad'],
]
for (const [name, c, r, t, want] of cases) {
  const out = []; let un = 0, sample = ''
  for (let i = 0; i < 6; i++) { const g = await grade(c, r, t); if (typeof g.score !== 'number') un++; else { out.push(g.score); if (!sample && (want === 'bad' || g.score < 100)) sample = g.feedback } }
  const verdict = want === 'ok' ? (Math.min(...out) >= 95 && !un ? 'PASS' : 'CHECK') : (Math.max(...out) <= 92 && !un ? 'PASS' : 'CHECK')
  console.log(verdict.padEnd(5), name.padEnd(34), out.sort((a, b) => a - b).join(','), un ? `(+${un} unreadable)` : '')
  if (verdict === 'CHECK') console.log('        e.g.', sample.slice(0, 160))
}
