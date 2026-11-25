// Airline flights only use Class B or C airports at both ends; GA flights can use any airport.
// Offline. Run: node scripts/test-airline-airports.mjs
import { readFileSync } from 'node:fs'
import { pickAirportPair, CLASS_D_ONLY } from '../lib/airline-airports.mjs'
const src = readFileSync(new URL('../app/api/scenario/route.js', import.meta.url), 'utf8')
const airports = [...src.matchAll(/icao: '(K\w+)', city: '([^']+)'/g)].map((m) => ({ icao: m[1], city: m[2] }))
const pick = (a) => a[Math.floor(Math.random() * a.length)]
let failed = 0
const check = (name, ok) => { console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++ }
check(`the list has ${airports.length} airports`, airports.length > 60)
check('every Class D airport named is in the list', [...CLASS_D_ONLY].every((i) => airports.some((a) => a.icao === i)))
const seen = new Set(), seenGA = new Set()
let bad = 0, same = 0
for (let i = 0; i < 20000; i++) {
  const [a, b] = pickAirportPair(airports, true, pick)
  seen.add(a.icao); seen.add(b.icao)
  if (CLASS_D_ONLY.has(a.icao) || CLASS_D_ONLY.has(b.icao)) bad++
  if (a.icao === b.icao) same++
  const [c, d] = pickAirportPair(airports, false, pick)
  seenGA.add(c.icao); seenGA.add(d.icao)
}
check('airline flights never use a Class D airport', bad === 0)
check('airline flights never depart and arrive at the same airport', same === 0)
check(`airline flights reach every Class B/C airport (${seen.size} of ${airports.length - CLASS_D_ONLY.size})`, seen.size === airports.length - CLASS_D_ONLY.size)
check(`GA flights still use all ${airports.length} airports`, seenGA.size === airports.length)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
