// The non-towered airport list (lib/ctaf-airports.json, built from FAA data) and the CTAF scenarios that use it.
// Data checks run anywhere; the scenario checks need the dev server on 3013. Run: node scripts/test-ctaf-airports.mjs
import { readFileSync } from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3013'
const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'))
const list = read('../lib/ctaf-airports.json').airports
const towered = new Set(read('../lib/class-d-airports.json').airports.map((a) => a.id))
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }

check('over a thousand airports in nearly every state', list.length > 1000 && new Set(list.map((a) => a.state)).size >= 45, `${list.length}`)
check('identifiers are K plus three characters and unique', list.every((a) => /^K[A-Z0-9]{3}$/.test(a.id)) && new Set(list.map((a) => a.id)).size === list.length)
check('no airport is also on the towered list', list.every((a) => !towered.has(a.id)), list.filter((a) => towered.has(a.id)).map((a) => a.id).join(','))
check('names are one to three plain words', list.every((a) => /^[A-Za-z][A-Za-z'-]*( [A-Za-z][A-Za-z'-]*){0,2}$/.test(a.name)), list.filter((a) => !/^[A-Za-z][A-Za-z'-]*( [A-Za-z][A-Za-z'-]*){0,2}$/.test(a.name)).map((a) => a.name).join(', '))
check('no abbreviations left in names', list.every((a) => !/\b(Rgnl|Muni|Intl|Arpt|Acft|Fld|Ntl|Exec|Tx|Lt|Ste|Sta)\b/i.test(a.name)))
check('CTAF is a VHF frequency', list.every((a) => /^1[123]\d\.\d{1,3}$/.test(a.ctaf) && Number(a.ctaf) >= 118 && Number(a.ctaf) <= 136.975), list.filter((a) => !/^1[123]\d\.\d{1,3}$/.test(a.ctaf)).map((a) => a.id + ' ' + a.ctaf).join(','))
check('runways are plain numbers 1-36, no duplicates, left or right traffic', list.every((a) => a.runways.length >= 1 && new Set(a.runways.map((r) => r.rwy)).size === a.runways.length && a.runways.every((r) => /^\d{1,2}$/.test(r.rwy) && Number(r.rwy) >= 1 && Number(r.rwy) <= 36 && ['left', 'right'].includes(r.pattern))))
const find = (id) => list.find((a) => a.id === id)
// Airports from the old hand-made list: runways and traffic patterns must come out the same (the CTAF frequencies there were mostly 122.8; the FAA's are used now).
const was = { KAUN: { 7: 'left', 25: 'left' }, KUKI: { 15: 'left', 33: 'right' }, KFOT: { 11: 'right', 29: 'left' }, KORS: { 16: 'left', 34: 'right' }, KFHR: { 16: 'right', 34: 'right' }, KSVH: { 10: 'left', 28: 'left' }, KDLZ: { 10: 'left', 28: 'left' } }
for (const [id, w] of Object.entries(was)) { const a = find(id); check(`${id} runways and patterns match the hand-checked values`, a && a.runways.length === Object.keys(w).length && a.runways.every((r) => w[r.rwy] === r.pattern), JSON.stringify(a)) }
check('Auburn CTAF is 122.7 (FAA data)', find('KAUN')?.ctaf === '122.7')

const get = async () => (await fetch(BASE + '/api/vfr-scenario', { headers: { 'X-Demo-Request': '1' } })).json()
const draws = await Promise.all(Array.from({ length: 200 }, get))
let bad = 0, tail = 0
const ids = new Set(), states = new Set()
for (const s of draws) {
  const a = find(s.airport_id)
  const comp = Math.cos(((Number(s.wind_dir) - Number(s.runway) * 10) * Math.PI) / 180) * s.wind_speed
  const text = s.steps.map((x) => x.situation).join(' ')
  const ok = a && s.airport_name === a.name && s.airport_state === a.state && s.ctaf === a.ctaf && a.runways.some((r) => r.rwy === s.runway && r.pattern === s.pattern)
    && s.steps.length === 5 && text.includes(`Runway in use is ${s.runway}`) && text.includes(a.ctaf) && /Wind is (calm|\d{3} at \d+ knots)/.test(s.steps[0].situation)
  if (!ok) { bad++; if (bad < 4) console.log('     bad scenario', JSON.stringify(s).slice(0, 300)) }
  if (s.wind_speed >= 4 && comp < -0.5) tail++
  ids.add(s.airport_id); states.add(s.airport_state)
}
check('200 generated scenarios are all consistent with the airport list', bad === 0, `${bad} bad`)
check('no scenario sends the pilot to land with a tailwind in a real wind (4+ kt)', tail === 0, String(tail))
check('the scenarios spread across many airports and states', ids.size >= 120 && states.size >= 30, `${ids.size} airports, ${states.size} states`)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
