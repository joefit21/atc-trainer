// Tests the Class D departure helpers. Run: node scripts/test-classd.mjs
import { readFileSync } from 'node:fs'
import { pickRunwayForWind, holdShortCandidates, pickHoldShort, reciprocalNumber, sameStripNumber } from '../lib/classd.mjs'

const real = JSON.parse(readFileSync(new URL('../lib/runways.json', import.meta.url), 'utf8')).airports
const airports = Object.fromEntries(JSON.parse(readFileSync(new URL('../lib/class-d-airports.json', import.meta.url), 'utf8')).airports.map((a) => [a.id, a.runways]))
let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }

check('found the Class D airports', Object.keys(airports).length >= 250 && ['KRDM', 'KPAO', 'KSLE', 'KOTH'].every((i) => airports[i]), String(Object.keys(airports).length))
check('opposite ends', reciprocalNumber(5) === 23 && reciprocalNumber(23) === 5 && reciprocalNumber(36) === 18 && reciprocalNumber(18) === 36 && reciprocalNumber(31) === 13)
check('same strip', sameStripNumber(5, 23) && sameStripNumber('13', '31') && !sameStripNumber(5, 11))
for (const [id, rws] of Object.entries(airports)) check(`${id}: every runway the scenario can use is real`, rws.every((r) => (real[id] || []).some((x) => parseInt(x, 10) === Number(r.rwy))), id)

// Wind and runway agree.
let n = 0, tail3 = 0, tail5 = 0, calm = 0
for (const [id, rws] of Object.entries(airports)) for (let i = 0; i < 20000; i++) {
  const dir = Math.floor(Math.random() * 36) * 10, spd = Math.floor(Math.random() * 15)
  const r = pickRunwayForWind(rws, dir, spd)
  const comp = Math.cos(((dir - Number(r.rwy) * 10) * Math.PI) / 180) * spd
  n++; if (spd < 4) calm++
  if (spd >= 4 && comp <= -1) tail3++   // any tailwind at all, with a real (4+ kt) wind
  if (comp <= -5) tail5++
}
console.log(`     ${n} departures (${calm} in light wind): with a real wind, any tailwind: ${tail3}; any tailwind of 5+ kt: ${tail5}`)
check('with a real wind (4+ kt) the runway in use never has a tailwind; none anywhere reaches 5 kt', tail3 === 0 && tail5 === 0, `${tail3}/${tail5}`)
check('into-wind choice: 050 at 10 kt at Redmond is runway 5; 230 at 10 kt is runway 23', pickRunwayForWind(airports.KRDM, 50, 10).rwy === '5' && pickRunwayForWind(airports.KRDM, 230, 10).rwy === '23')
check('light wind uses more than one runway', new Set(Array.from({ length: 200 }, () => pickRunwayForWind(airports.KRDM, 90, 2).rwy)).size > 1)

// Hold short / crossing candidates.
for (const [id, rws] of Object.entries(airports)) for (const r of rws) {
  const c = holdShortCandidates(rws, r.rwy)
  check(`${id} rwy ${r.rwy}: candidates are real and never the active strip`, c.every((x) => rws.some((q) => q.rwy === x) && !sameStripNumber(r.rwy, x)), c.join(','))
}
// RULE: the hold short is never the assigned runway (the clearance limit) or its other end.
let ruleBroken = 0
for (const [id, rws] of Object.entries(airports)) for (const r of rws) for (let i = 0; i < 500; i++) {
  const h = pickHoldShort(holdShortCandidates(rws, r.rwy), Math.random, 1)
  if (h !== null && sameStripNumber(r.rwy, h)) ruleBroken++
}
check('RULE: a hold short never names the assigned runway or its other end', ruleBroken === 0, String(ruleBroken))
check('Redmond demo: hold short 11 is a different strip than runway 5', !sameStripNumber(5, 11))
check('Palo Alto (one runway) has no crossing candidates', holdShortCandidates(airports.KPAO, '13').length === 0 && holdShortCandidates(airports.KPAO, '31').length === 0)
check('Redmond 5 can cross 11 or 29', JSON.stringify(holdShortCandidates(airports.KRDM, '5')) === JSON.stringify(['11', '29']))

// About a third of departures get a hold short, always for a real candidate, never at a one-runway airport.
let withHold = 0, trials = 30000, hsBad = 0
for (let i = 0; i < trials; i++) {
  const c = holdShortCandidates(airports.KRDM, '5'); const h = pickHoldShort(c)
  if (h !== null) { withHold++; if (!c.includes(h)) hsBad++ }
}
check(`hold short happens about 1 in 3 times (${(100 * withHold / trials).toFixed(1)}%) and only for real runways`, withHold / trials > 0.31 && withHold / trials < 0.36 && hsBad === 0)
check('no hold short at Palo Alto, ever', Array.from({ length: 2000 }, () => pickHoldShort(holdShortCandidates(airports.KPAO, '13'))).every((x) => x === null))

// The fixed Redmond demo.
const demo = readFileSync(new URL('../app/radio-lab/page.js', import.meta.url), 'utf8')
const dm = demo.slice(demo.indexOf('  classd: {'), demo.indexOf('  classdarrival: {'))
check('Redmond demo lists real crossing runways and holds short of a real one', /hold_short_candidates: \['11', '29'\]/.test(dm) && /hold_short_runway: '11'/.test(dm) && /runway: '5'/.test(dm))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
