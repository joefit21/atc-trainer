// The Class D airport list (lib/class-d-airports.json, built from FAA data) and the scenarios that use it.
// Data checks run anywhere; the scenario checks need the dev server on 3013. Run: node scripts/test-class-d-airports.mjs
import { readFileSync } from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:3013'
const data = JSON.parse(readFileSync(new URL('../lib/class-d-airports.json', import.meta.url), 'utf8'))
const list = data.airports
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }

// 1. The data.
check('hundreds of airports in many states', list.length >= 250 && new Set(list.map((a) => a.state)).size >= 40, `${list.length} airports`)
check('identifiers are K plus three characters and unique', list.every((a) => /^K[A-Z0-9]{3}$/.test(a.id)) && new Set(list.map((a) => a.id)).size === list.length)
check('names are plain words (no "Tower", digits or punctuation)', list.every((a) => /^[A-Za-z][A-Za-z ]+$/.test(a.name) && !/\b(Tower|Twr)\b/.test(a.name)), list.filter((a) => !/^[A-Za-z][A-Za-z ]+$/.test(a.name) || /\b(Tower|Twr)\b/.test(a.name)).map((a) => a.name).join(', '))
check('no bare generic names', list.every((a) => !/^(Regional|Executive|Exec|International|County|Downtown|Cwa|Nasa)$/.test(a.name)))
const vhf = (f) => /^\d{3}\.\d{1,3}$/.test(f) && Number(f) >= 118 && Number(f) <= 136.975
check('tower and ground are different VHF frequencies', list.every((a) => vhf(a.tower) && vhf(a.ground) && a.tower !== a.ground))
check('runways are plain numbers 1-36, no duplicates, left or right traffic', list.every((a) => a.runways.length >= 2 && new Set(a.runways.map((r) => r.rwy)).size === a.runways.length && a.runways.every((r) => /^\d{1,2}$/.test(r.rwy) && Number(r.rwy) >= 1 && Number(r.rwy) <= 36 && ['left', 'right'].includes(r.pattern))))
const find = (id) => list.find((a) => a.id === id)
// The four airports that used to be the whole list, checked by hand against AirNav, must come out of the FAA data the same.
const was = {
  KRDM: { tower: '124.5', ground: '121.8', runways: { 5: 'left', 23: 'left', 11: 'left', 29: 'left' } },
  KPAO: { tower: '118.6', ground: '125.0', runways: { 13: 'left', 31: 'right' } },
  KSLE: { tower: '119.1', ground: '121.9', runways: { 13: 'left', 31: 'left', 16: 'left', 34: 'left' } },
  KOTH: { tower: '118.45', ground: '127.1', runways: { 5: 'left', 23: 'left', 13: 'left', 31: 'right' } },
}
for (const [id, w] of Object.entries(was)) {
  const a = find(id)
  check(`${id} matches the hand-checked values`, a && a.tower === w.tower && a.ground === w.ground && a.runways.length === Object.keys(w.runways).length && a.runways.every((r) => w.runways[r.rwy] === r.pattern), JSON.stringify(a))
}
check('Class B and C airports are not in the list', ['KSEA', 'KSFO', 'KDEN', 'KBOS', 'KPDX'].every((id) => !find(id)))
check('military fields are not in the list', ['KNKX', 'KLSV', 'KWRI'].every((id) => !find(id)))

// 2. The scenarios.
const get = async (path) => (await fetch(BASE + path, { headers: { 'X-Demo-Request': '1' } })).json()
const draws = []
for (let i = 0; i < 120; i++) draws.push(['/api/vfr-class-d-scenario', get('/api/vfr-class-d-scenario')], ['/api/vfr-class-d-arrival-scenario', get('/api/vfr-class-d-arrival-scenario')])
const states = new Set(), ids = new Set()
let bad = 0, tailwinds = 0, arrivals = 0
for (const [path, p] of draws) {
  const s = await p
  const a = find(s.airport_id)
  const ok = a && s.airport_name === a.name && s.state === a.state && s.tower_freq === a.tower && s.ground_freq === a.ground
    && a.runways.some((r) => r.rwy === s.runway && r.pattern === s.pattern) && s.atis?.active_runway === s.runway
    && (path.includes('arrival') || (s.hold_short_candidates.every((c) => a.runways.some((r) => r.rwy === c) && Number(c) !== Number(s.runway) && Number(c) !== ((Number(s.runway) + 17) % 36) + 1)))
  if (!ok) { bad++; if (bad < 4) console.log('     bad scenario', path, JSON.stringify(s).slice(0, 300)) }
  if (path.includes('arrival')) {
    arrivals++
    const comp = Math.cos(((Number(s.atis.wind_dir) - Number(s.runway) * 10) * Math.PI) / 180) * Number(s.atis.wind_speed)
    if (Number(s.atis.wind_speed) >= 4 && comp < -0.5) tailwinds++
  }
  states.add(s.state); ids.add(s.airport_id)
}
check('240 generated scenarios are all consistent with the airport list', bad === 0, `${bad} bad`)
check(`arrivals with a real wind (4+ kt) never get a tailwind (${arrivals} arrivals)`, tailwinds === 0, String(tailwinds))
check('the scenarios spread across many airports and states', ids.size >= 60 && states.size >= 20, `${ids.size} airports, ${states.size} states`)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
