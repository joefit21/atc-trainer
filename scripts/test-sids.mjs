// Tests the departure-procedure data and phrasing. Run: node scripts/test-sids.mjs
import { readFileSync } from 'node:fs'
import { pickSID, buildRoutePhrase, DIGIT_WORDS, NO_SID_PHRASES } from '../lib/sid-phrase.mjs'

const data = JSON.parse(readFileSync(new URL('../lib/sids.json', import.meta.url), 'utf8'))
const route = readFileSync(new URL('../app/api/scenario/route.js', import.meta.url), 'utf8')
let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }

// 1. Data sanity.
const entries = Object.entries(data.airports)
check('has airports', entries.length > 300, String(entries.length))
const bad = []
for (const [icao, list] of entries) for (const p of list) {
  if (!/^[A-Z]{3,5}$/.test(p.name) || !(p.number >= 0 && p.number <= 9) || p.transitions.some((t) => !/^[A-Z]{5}$/.test(t))) bad.push(icao + ' ' + p.name)
}
check('every procedure name, number and transition is well formed', bad.length === 0, bad.slice(0, 5).join(', '))
const dup = entries.filter(([, l]) => new Set(l.map((p) => p.name)).size !== l.length).map(([i]) => i)
check('no airport lists the same procedure name twice', dup.length === 0, dup.join(', '))

// 2. Known real procedures (FAA cycle in the file) are present.
const has = (icao, name, number) => (data.airports[icao] || []).some((p) => p.name === name && p.number === number)
check('KDEN has BAYLR 6', has('KDEN', 'BAYLR', 6))
check('KBOS has HYLND 7', has('KBOS', 'HYLND', 7))
check('KSEA has HAROB 6', has('KSEA', 'HAROB', 6))
check('KATL no longer has the invented TANKS', !(data.airports.KATL || []).some((p) => p.name === 'TANKS'))

// 3. Every airport the trainer can pick: either real procedures or the filed-route fallback.
const icaos = [...route.matchAll(/\{ icao: '(K[A-Z0-9]{3})'/g)].map((m) => m[1])
check('found the trainer airport list', icaos.length > 50, String(icaos.length))
const none = icaos.filter((i) => !data.airports[i])
console.log(`     ${icaos.length - none.length} airports use real SIDs; ${none.length} have none published and get one of the three no-SID phrases: ${none.join(' ')}`)
for (const i of none) { if (!NO_SID_PHRASES.includes(buildRoutePhrase(pickSID(data, i)))) { check('no-SID airport uses an approved phrase: ' + i, false) } }

// 4. Phrasing.
const seq = (...v) => { let i = 0; return () => v[i++ % v.length] }
const sid = { name: 'BAYLR', number: 6, transitions: ['TEHRU'] }
check('phrase with transition', buildRoutePhrase(sid, seq(0.1, 0)) === 'via the BAYLR six departure, TEHRU transition, then as filed', buildRoutePhrase(sid, seq(0.1, 0)))
check('a departure procedure always names a transition before "then as filed"', [0, 0.3, 0.6, 0.9, 0.99].every((r) => buildRoutePhrase(sid, seq(r)) === 'via the BAYLR six departure, TEHRU transition, then as filed'))
check('a SID with no transitions is never cleared without one (uses a no-SID phrase)', NO_SID_PHRASES.includes(buildRoutePhrase({ name: 'PADGT', number: 3, transitions: [] }, seq(0))))
check('pickSID skips procedures with no transition', pickSID({ airports: { KXXX: [{ name: 'PADGT', number: 3, transitions: [] }, { name: 'BAYLR', number: 6, transitions: ['TEHRU'] }] } }, 'KXXX', () => 0).name === 'BAYLR')
check('an airport whose procedures all lack transitions gets no SID', pickSID({ airports: { KXXX: [{ name: 'PADGT', number: 3, transitions: [] }] } }, 'KXXX') === null)
check('the three no-SID phrases are the approved ones', JSON.stringify(NO_SID_PHRASES) === JSON.stringify(['via radar vectors', 'as filed', 'via fly runway heading, expect radar vectors on course']))
check('no SID -> every approved phrase can come up', NO_SID_PHRASES.every((ph, i) => buildRoutePhrase(null, () => i / 3 + 0.01) === ph))
const seen = new Set(); for (let n = 0; n < 300; n++) seen.add(buildRoutePhrase(null))
check('no SID -> only approved phrases over 300 draws', seen.size === 3 && [...seen].every((x) => NO_SID_PHRASES.includes(x)))
check('digit 9 is niner, 3 is tree', DIGIT_WORDS[9] === 'niner' && DIGIT_WORDS[3] === 'tree')

// 5. Many random draws only ever produce procedures that exist.
let wrong = 0
for (let n = 0; n < 5000; n++) {
  const icao = icaos[n % icaos.length]
  const s = pickSID(data, icao)
  const phrase = buildRoutePhrase(s)
  if (s && !has(icao, s.name, s.number)) wrong++
  const t = phrase.match(/, ([A-Z]{5}) transition, then as filed/)
  if (s && (!t || !s.transitions.includes(t[1]))) wrong++
}
check('5000 random clearances use only real procedures and real transitions', wrong === 0, String(wrong))

// 6. "Climb via the SID" eligibility (built from the procedure's altitude restrictions).
const all = entries.flatMap(([icao, list]) => list.map((p) => ({ icao, ...p })))
const cvList = all.filter((p) => p.climbVia)
check('some procedures are climb via eligible, most are not', cvList.length > 150 && cvList.length < all.length / 2, String(cvList.length))
check('every eligible procedure has a top altitude', cvList.every((p) => Number.isFinite(p.topAlt) && p.topAlt >= 1000 && p.topAlt <= 30000))
const find = (icao, name) => (data.airports[icao] || []).find((p) => p.name === name)
check('KDEN BAYLR is eligible (several restrictions)', find('KDEN', 'BAYLR')?.climbVia === true)
check('KDFW DARTZ is not eligible (restrictions on some runways only)', !find('KDFW', 'DARTZ')?.climbVia)
check('KDEN PLAIN is not eligible (vector departure, no restrictions)', !find('KDEN', 'PLAIN')?.climbVia)
check('pickSID passes the climb via flag through', pickSID({ airports: { KXXX: [{ name: 'BAYLR', number: 6, transitions: ['TEHRU'], climbVia: true, topAlt: 11000 }] } }, 'KXXX').climbVia === true)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
