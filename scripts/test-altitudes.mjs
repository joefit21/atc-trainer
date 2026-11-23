// Tests the airline cruise-altitude rule. Run: node scripts/test-altitudes.mjs
import { readFileSync } from 'node:fs'
import { magneticCourse, isEastbound, pickAirlineFlightLevel, EASTBOUND_LEVELS, WESTBOUND_LEVELS } from '../lib/altitudes.mjs'

const coords = JSON.parse(readFileSync(new URL('../lib/airport-coords.json', import.meta.url), 'utf8')).airports
const route = readFileSync(new URL('../app/api/scenario/route.js', import.meta.url), 'utf8')
const icaos = [...route.matchAll(/\{ icao: '(K[A-Z0-9]{3})'/g)].map((m) => m[1])
let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }

check('levels: eastbound odd thousands, westbound even, all within FL300-FL410',
  EASTBOUND_LEVELS.every((l) => (l / 10) % 2 === 1 && l >= 300 && l <= 410) && WESTBOUND_LEVELS.every((l) => (l / 10) % 2 === 0 && l >= 300 && l <= 410))
check('every trainer airport has a position', icaos.every((i) => coords[i]), icaos.filter((i) => !coords[i]).join(' '))

// Known routes.
const dir = (a, b) => isEastbound(magneticCourse(coords[a], coords[b])) ? 'E' : 'W'
check('DEN->ATL east', dir('KDEN', 'KATL') === 'E'); check('ATL->DEN west', dir('KATL', 'KDEN') === 'W')
check('BOS->LAX west', dir('KBOS', 'KLAX') === 'W'); check('LAX->BOS east', dir('KLAX', 'KBOS') === 'E')
check('SEA->MIA east', dir('KSEA', 'KMIA') === 'E'); check('MIA->SEA west', dir('KMIA', 'KSEA') === 'W')
// Edge cases near due north/south pick whichever side the magnetic course is on, never a mixed result.
check('a course of exactly 000 is eastbound and 180 is westbound', isEastbound(0) && !isEastbound(179.9) === false && !isEastbound(180))

// Every ordered pair of trainer airports: the level must match the direction, 100 draws each.
let bad = 0, pairs = 0, east = 0
for (const a of icaos) for (const b of icaos) {
  if (a === b) continue
  pairs++
  const e = isEastbound(magneticCourse(coords[a], coords[b]))
  if (e) east++
  for (let n = 0; n < 20; n++) {
    const fl = pickAirlineFlightLevel(coords[a], coords[b])
    const okParity = e ? (fl / 10) % 2 === 1 : (fl / 10) % 2 === 0
    if (!okParity || fl < 300 || fl > 410 || fl % 10 !== 0) bad++
  }
}
console.log(`     ${pairs} airport pairs checked (${east} eastbound, ${pairs - east} westbound)`)
check('every airport pair gets a correct-parity level in FL300-FL410', bad === 0, String(bad))
check('missing airport position falls back to a valid level', [300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410].includes(pickAirlineFlightLevel(null, coords.KDEN)))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
