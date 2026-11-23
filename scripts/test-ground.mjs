// Tests ground (departure taxi) clearances built from real runways. Run: node scripts/test-ground.mjs
import { readFileSync } from 'node:fs'
import { runwaySpoken, reciprocal, sameStrip, pickActiveRunway, pickInstruction, pickTaxiways, buildGroundClearance } from '../lib/ground.mjs'

const rw = JSON.parse(readFileSync(new URL('../lib/runways.json', import.meta.url), 'utf8')).airports
const route = readFileSync(new URL('../app/api/scenario/route.js', import.meta.url), 'utf8')
const demo = readFileSync(new URL('../app/api/demo-scenario/route.js', import.meta.url), 'utf8')
let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }
const icaos = [...route.matchAll(/\{ icao: '(K[A-Z0-9]{3})'/g)].map((m) => m[1])

// Spoken form and strips.
const sp = { '08': 'eight', '09': 'niner', '16L': 'one six left', '34R': 'tree four right', '27C': 'two seven center', '04R': 'four right', '30': 'tree zero', '10': 'one zero' }
check('runway spoken form', Object.entries(sp).every(([k, v]) => runwaySpoken(k) === v), JSON.stringify(Object.entries(sp).filter(([k, v]) => runwaySpoken(k) !== v)))
check('opposite ends', reciprocal('08') === '26' && reciprocal('16L') === '34R' && reciprocal('09C') === '27C' && reciprocal('36') === '18' && reciprocal('18') === '36' && reciprocal('01') === '19')
check('08 and 26 are the same strip, 08 and 25L are not', sameStrip('08', '26') && !sameStrip('08', '25L'))
check('every trainer airport has runways', icaos.every((i) => rw[i]?.length > 0), icaos.filter((i) => !rw[i]).join(' '))

// Many draws at every airport.
let bad = 0, crossCount = 0, holdCount = 0, badTaxi = 0, total = 0
const seen = {}
for (const icao of icaos) {
  const ids = rw[icao]
  for (let n = 0; n < 400; n++) {
    total++
    const { text, departure } = buildGroundClearance({ callsignSpeller: 'x', callsignSpoken: 'november one two tree alpha bravo', city: 'testville', runways: ids })
    seen[icao] = seen[icao] || new Set(); seen[icao].add(departure)
    if (!ids.includes(departure)) bad++
    const cross = text.match(/cross runway ([a-z ]+)$/), hold = text.match(/hold short of runway ([a-z ]+)$/)
    if (cross) {
      crossCount++
      // The runway named in a crossing instruction must be a real runway and not the departure strip.
      const named = ids.filter((id) => runwaySpoken(id) === cross[1])
      if (named.length === 0 || named.some((id) => sameStrip(departure, id))) bad++
    } else if (hold) {
      holdCount++
      if (hold[1] !== runwaySpoken(departure)) bad++
    } else bad++
    const taxi = text.match(/taxi via (.+?), (?:cross|hold) /)?.[1]
    if (!taxi || /\d/.test(taxi)) badTaxi++
    else { const parts = taxi.split(', ').map((x) => x.split(' ')[0]); if (new Set(parts).size !== parts.length) badTaxi++ }
    if (!/^november one two tree alpha bravo, testville ground, runway /.test(text)) bad++
  }
}
check(`${total} clearances: every runway named exists, crossings are never the departure strip, hold-short is the departure runway`, bad === 0, String(bad))
check('taxiway names: 1-3, no repeats, no numerals', badTaxi === 0, String(badTaxi))
check('both hold-short and crossing instructions occur', crossCount > 0 && holdCount > 0, `${crossCount}/${holdCount}`)
check('PHX can depart on every runway end', ['07L', '07R', '08', '25L', '25R', '26'].every((r) => seen.KPHX.has(r)), [...seen.KPHX].join(' '))
check('PAO (one strip) uses both ends and never a crossing instruction',
  seen.KPAO.has('13') && seen.KPAO.has('31') && Array.from({ length: 500 }, () => pickInstruction(rw.KPAO, '13')).every((x) => x.startsWith('hold short')))

// The fixed demo uses a runway that exists at Phoenix.
const dm = demo.match(/Phoenix Ground, runway ([a-z ]+), taxi via [^,]+, [^,]+, (?:hold short of|cross) runway ([a-z ]+)\./)
check('fixed ground demo names real Phoenix runways', !!dm && rw.KPHX.some((id) => runwaySpoken(id) === dm[1]) && rw.KPHX.some((id) => runwaySpoken(id) === dm[2]), dm ? dm.slice(1).join(' / ') : 'no match')
check('fixed ground demo does not hold short of the reciprocal end of its own runway', !!dm && !(sameStrip(rw.KPHX.find((id) => runwaySpoken(id) === dm[1]), rw.KPHX.find((id) => runwaySpoken(id) === dm[2])) && dm[1] !== dm[2]))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
