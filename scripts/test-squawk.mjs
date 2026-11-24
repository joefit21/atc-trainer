// Beacon codes: octal digits, never ending in 00 (so never both of the last two digits zero). Run: node scripts/test-squawk.mjs
import { generateSquawk, isAssignableSquawk } from '../lib/squawk.mjs'
import { IFR_DEMO, IFR_LANDING } from '../lib/demo-clearances.mjs'
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }
const draws = Array.from({ length: 200000 }, () => generateSquawk())
check('every code is four octal digits', draws.every((c) => /^[0-7]{4}$/.test(c)))
check('no code ends in 00', draws.every((c) => !c.endsWith('00')), draws.find((c) => c.endsWith('00')))
check('1200, 7500, 7600, 7700, 7000 and 0000 never come up', draws.every((c) => !['1200', '7500', '7600', '7700', '7000', '0000'].includes(c)))
check('1255, 1276, 1277 and 7777 never come up', draws.every((c) => !['1255', '1276', '1277', '7777'].includes(c)))
check('a single zero is still fine: 2050, 2005, 0452, 5502 are assignable', ['2050', '2005', '0452', '5502', '4070'].every(isAssignableSquawk))
check('a code ending in 00 is not: 4700, 2000, 1200, 0100', ['4700', '2000', '1200', '0100'].every((c) => !isAssignableSquawk(c)))
check('digits 8 and 9 are not squawk digits', !isAssignableSquawk('4589') && !isAssignableSquawk('4528'))
const digits = [0, 0, 0, 0, 0, 0, 0, 0]
for (const c of draws) for (const d of c) digits[Number(d)]++
check('zeros still come up (about one digit in eight)', digits[0] / (draws.length * 4) > 0.1, String(digits[0] / (draws.length * 4)))
const demoCodes = [IFR_DEMO, IFR_LANDING].map((d) => d.craft.transponder)
check('the demo clearances use assignable codes', demoCodes.every(isAssignableSquawk), demoCodes.join(','))

// The live scenarios. Needs a server: BASE=http://localhost:3013 (or production) node scripts/test-squawk.mjs
if (process.env.BASE || process.env.LIVE) {
  const BASE = process.env.BASE || 'http://localhost:3013'
  const H = { 'Content-Type': 'application/json', 'X-Demo-Request': '1' }
  const W = { zero: 0, one: 1, two: 2, tree: 3, three: 3, four: 4, five: 5, six: 6, seven: 7, niner: 9, eight: 8 }
  const wordsToCode = (w) => w.trim().split(/\s+/).map((x) => W[x]).join('')
  const ifr = await Promise.all(Array.from({ length: 60 }, async () => (await fetch(BASE + '/api/scenario?type=ifr', { headers: H })).json()))
  const ifrCodes = ifr.map((r) => wordsToCode((r.clearance_text.match(/squawk ((?:\w+ ?)+?)$/) || [])[1] || ''))
  check(`60 IFR clearances: every squawk is assignable (${new Set(ifrCodes).size} different)`, ifrCodes.every(isAssignableSquawk), ifrCodes.filter((c) => !isAssignableSquawk(c)).join(','))
  const sc = await (await fetch(BASE + '/api/vfr-flight-following-scenario', { headers: H })).json()
  const ffCodes = []
  for (let i = 0; i < 30; i++) {
    const r = await (await fetch(BASE + '/api/vfr-flight-following-response', { method: 'POST', headers: H, body: JSON.stringify({ scenario: sc, phase: 'initial_contact', pilot_said: 'NorCal Approach, November 4521 Hotel, 12 miles south of Auburn' }) })).json()
    ffCodes.push(r.squawk_code || wordsToCode(((r.controller_text || '').match(/squawk ((?:\w+ ?)+?),/) || [])[1] || ''))
  }
  check('30 flight following squawks: every one is assignable', ffCodes.every(isAssignableSquawk), ffCodes.filter((c) => !isAssignableSquawk(c)).join(','))
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
