// Grader regression tests: correct readbacks must score ~100 and genuine errors must lose points.
// Needs a running dev server (npm run dev -- --port 3013) and ANTHROPIC_API_KEY. Makes real (cheap) API calls.
// Run: node scripts/test-grader.mjs
const grade = async (c, r) => { try { return await (await fetch('http://localhost:3013/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clearance_text: c, readback_text: r, scenario_type: 'ifr', is_demo: true }) })).json() } catch (e) { return { error: String(e) } } }
const tail = ', climb and maintain one zero thousand, expect flight level tree five zero one zero minutes after departure, departure frequency one two five point tree, squawk four tree two one'
const rbTail = 'climb and maintain 10,000 expect flight level 350 ten minutes after departure departure frequency 125.3 squawk 4321'
const cs = 'november one two tree alpha bravo'
const cases = [
  ['CORRECT  SID+transition, phonetic', `${cs}, cleared to denver via the BAYLR six departure, TEHRU transition, then as filed${tail}`, `November 123 Alpha Bravo cleared to Denver via the Baylor six departure Teheru transition then as filed ${rbTail}`, 'ok'],
  ['CORRECT  SID, no transition', `${cs}, cleared to denver via the SLIDZ four departure, then as filed${tail}`, `November 123 Alpha Bravo cleared to Denver via the Slidz four departure then as filed ${rbTail}`, 'ok'],
  ['CORRECT  3-letter SID said as word', `${cs}, cleared to dayton via the DAY niner departure, then as filed${tail}`, `November 123 Alpha Bravo cleared to Dayton via the day niner departure then as filed ${rbTail}`, 'ok'],
  ['CORRECT  radar vectors', `${cs}, cleared to denver via radar vectors${tail}`, `November 123 Alpha Bravo cleared to Denver via radar vectors ${rbTail}`, 'ok'],
  ['CORRECT  fly runway heading', `${cs}, cleared to denver via fly runway heading, expect radar vectors on course${tail}`, `November 123 Alpha Bravo cleared to Denver via fly runway heading expect radar vectors on course ${rbTail}`, 'ok'],
  ['ERROR    wrong SID number', `${cs}, cleared to denver via the BAYLR six departure, TEHRU transition, then as filed${tail}`, `November 123 Alpha Bravo cleared to Denver via the Baylor seven departure Teheru transition then as filed ${rbTail}`, 'bad'],
  ['ERROR    skipped transition', `${cs}, cleared to denver via the BAYLR six departure, TEHRU transition, then as filed${tail}`, `November 123 Alpha Bravo cleared to Denver via the Baylor six departure then as filed ${rbTail}`, 'bad'],
  ['ERROR    wrong routing phrase', `${cs}, cleared to denver via fly runway heading, expect radar vectors on course${tail}`, `November 123 Alpha Bravo cleared to Denver as filed ${rbTail}`, 'bad'],
  ['ERROR    wrong squawk', `${cs}, cleared to denver as filed${tail}`, `November 123 Alpha Bravo cleared to Denver as filed climb and maintain 10,000 expect flight level 350 ten minutes after departure departure frequency 125.3 squawk 4322`, 'bad'],
]
for (const [name, c, r, want] of cases) {
  const out = []; let unreadable = 0, sample = ''
  for (let i = 0; i < 10; i++) { const g = await grade(c, r); if (typeof g.score !== 'number') unreadable++; else { out.push(g.score); if (!sample && ((want === 'ok' && g.score < 100) || (want === 'bad'))) sample = g.feedback } }
  const min = Math.min(...out), max = Math.max(...out)
  const verdict = want === 'ok' ? (min >= 95 && !unreadable ? 'PASS' : 'CHECK') : (max <= 90 && !unreadable ? 'PASS' : 'CHECK')
  console.log(verdict.padEnd(5), name.padEnd(36), 'scores', out.sort((a,b)=>a-b).join(','), unreadable ? `(+${unreadable} unreadable)` : '')
  if (verdict === 'CHECK' || want === 'bad') console.log('        e.g.', sample.slice(0, 150))
}
