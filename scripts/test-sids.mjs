// Tests the departure-procedure data and phrasing. Run: node scripts/test-sids.mjs
import { readFileSync } from 'node:fs'
import { pickSID, buildRoutePhrase, DIGIT_WORDS } from '../lib/sid-phrase.mjs'

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
console.log(`     ${icaos.length - none.length} airports use real SIDs; ${none.length} have none published and say "via the filed route": ${none.join(' ')}`)
for (const i of none) { if (buildRoutePhrase(pickSID(data, i)) !== 'via the filed route') { check('no-SID airport falls back: ' + i, false) } }

// 4. Phrasing.
const seq = (...v) => { let i = 0; return () => v[i++ % v.length] }
const sid = { name: 'BAYLR', number: 6, transitions: ['TEHRU'] }
check('phrase with transition', buildRoutePhrase(sid, seq(0.1, 0)) === 'via the BAYLR six departure, TEHRU transition, then as filed', buildRoutePhrase(sid, seq(0.1, 0)))
check('phrase without transition', buildRoutePhrase(sid, seq(0.9)) === 'via the BAYLR six departure, then as filed')
check('a SID with no transitions never invents one', buildRoutePhrase({ name: 'PADGT', number: 3, transitions: [] }, seq(0)) === 'via the PADGT tree departure, then as filed')
check('no SID -> filed route', buildRoutePhrase(null) === 'via the filed route')
check('digit 9 is niner, 3 is tree', DIGIT_WORDS[9] === 'niner' && DIGIT_WORDS[3] === 'tree')

// 5. Many random draws only ever produce procedures that exist.
let wrong = 0
for (let n = 0; n < 5000; n++) {
  const icao = icaos[n % icaos.length]
  const s = pickSID(data, icao)
  const phrase = buildRoutePhrase(s)
  if (s && !has(icao, s.name, s.number)) wrong++
  const t = phrase.match(/, ([A-Z]{5}) transition/)
  if (t && !s.transitions.includes(t[1])) wrong++
}
check('5000 random clearances use only real procedures and real transitions', wrong === 0, String(wrong))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
