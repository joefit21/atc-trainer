// The IFR scenario route: a procedure with altitude restrictions is cleared "climb via the SID",
// then "expect <altitude> one zero minutes after departure"; any other clearance keeps
// "climb and maintain". Needs the dev server on 3013 (and its API keys). Run: node scripts/test-climb-via.mjs
import { readFileSync } from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3013'
const N = Number(process.env.N || 80)
const sids = JSON.parse(readFileSync(new URL('../lib/sids.json', import.meta.url), 'utf8')).airports
const W = { zero: 0, one: 1, two: 2, tree: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, niner: 9 }
const digits = (w) => w.trim().split(/\s+/).map((x) => W[x]).join('')
let failed = 0, climbVia = 0, maintain = 0, vectors = 0
const bad = (msg, t) => { failed++; console.log('FAIL', msg, '\n     ', t) }
const draw = async () => (await fetch(BASE + '/api/scenario?type=ifr', { headers: { 'X-Demo-Request': '1' } })).json()
const results = []
for (let i = 0; i < N; i += 8) results.push(...await Promise.all(Array.from({ length: Math.min(8, N - i) }, draw)))
for (const r of results) {
  const t = r.clearance_text
  if (!t) { bad('no clearance text', JSON.stringify(r).slice(0, 200)); continue }
  const sid = t.match(/via the ([A-Z]{3,5}) (\w+) departure, ([A-Z]{5}) transition, then as filed/)
  const cv = /, climb via the SID, /.test(t)
  const cm = /, climb and maintain /.test(t)
  if (cv === cm) { bad('exactly one of "climb via the SID" / "climb and maintain" expected', t); continue }
  if (/departure, then as filed/.test(t)) bad('a departure procedure without a transition', t)
  if (cv) {
    climbVia++
    const real = sid && (sids[r.airport] || []).find((p) => p.name === sid[1] && String(p.number) === digits(sid[2].replace('Niner', 'niner').toLowerCase()))
    if (!real?.climbVia) bad('climb via used for a procedure that is not eligible', t)
    const ex = t.match(/expect (flight level )?((?:\w+ )+?)(?:thousand )?one zero minutes after departure/)
    const n = ex && Number(digits(ex[2]))
    const alt = ex && (ex[1] ? n * 100 : n * 1000)
    if (!ex || !(alt > (real?.topAlt || 0))) bad(`expect altitude ${alt} must be above the procedure's top altitude ${real?.topAlt}`, t)
  } else {
    maintain++
    if (sid) {
      const real = (sids[r.airport] || []).find((p) => p.name === sid[1] && String(p.number) === digits(sid[2].toLowerCase()))
      if (real?.climbVia) bad('an eligible procedure was not cleared climb via the SID', t)
    } else vectors++
  }
}
console.log(`${results.length} clearances: ${climbVia} climb via the SID, ${maintain} climb and maintain (${vectors} with no procedure)`)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
