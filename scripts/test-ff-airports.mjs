// The flight following data (lib/flight-following.json, built from FAA data) and the scenarios that use it.
// Data checks run anywhere; the scenario checks need the dev server on 3013. Run: node scripts/test-ff-airports.mjs
import { readFileSync } from 'node:fs'
import { magneticCourse, isEastbound, trueCourse } from '../lib/altitudes.mjs'
const BASE = process.env.BASE || 'http://localhost:3013'
const ff = JSON.parse(readFileSync(new URL('../lib/flight-following.json', import.meta.url), 'utf8'))
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }
const rad = (d) => (d * Math.PI) / 180
const dist = (a, b) => 2 * 3440.065 * Math.asin(Math.sqrt(Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2))
const byId = Object.fromEntries(ff.airports.map((a) => [a.id, a]))
const starts = ff.airports.filter((a) => a.freq)

check('over a thousand starting airports, over a hundred facilities', starts.length > 1000 && new Set(starts.map((a) => a.fac)).size > 100, `${starts.length}`)
check('facility names end in Approach or Center', Object.values(ff.facilities).every((n) => /^[A-Za-z][A-Za-z ]*( Approach| Center)$/.test(n)), Object.values(ff.facilities).filter((n) => !/( Approach| Center)$/.test(n)).join(','))
check('every airport belongs to a known facility', ff.airports.every((a) => ff.facilities[a.fac]))
check('frequencies are VHF', starts.every((a) => /^1[123]\d\.\d{1,3}$/.test(a.freq) && Number(a.freq) >= 118 && Number(a.freq) <= 136.975))
check('positions and elevations are sane', ff.airports.every((a) => a.lat > 17 && a.lat < 72 && a.lon < -64 && a.lon > -180 && a.elev > -300 && a.elev < 11000 && Math.abs(a.mv) < 40))
check('NorCal Approach serves Auburn on 125.4 (FAA data)', byId.KAUN?.freq === '125.4' && ff.facilities[byId.KAUN.fac] === 'NorCal Approach')
check('the FAA calls NorCal and SoCal by those names', Object.values(ff.facilities).includes('NorCal Approach') && Object.values(ff.facilities).includes('SoCal Approach'))
check('altimeter stations have city names', ff.stations.length > 1500 && ff.stations.every((s) => /^[A-Za-z][A-Za-z ]+$/.test(s.name)))

const one = async () => (await fetch(BASE + '/api/vfr-flight-following-scenario', { headers: { 'X-Demo-Request': '1' } })).json()
await one() // the first request compiles the route
const draws = []
for (let i = 0; i < 300; i += 25) draws.push(...await Promise.all(Array.from({ length: 25 }, one)))
let bad = 0, altBad = 0, dirBad = 0, stBad = 0
const facs = new Set(), states = new Set()
for (const s of draws) {
  const start = starts.find((a) => a.name === s.position_reference && ff.facilities[a.fac] === s.facility_name && a.freq === s.facility_freq)
  const dest = byId[s.destination_id]
  const ok = start && dest && dest.name === s.destination_name && dest.fac === start.fac && dest.id !== start.id && dist(start, dest) >= 20 && dist(start, dest) <= 120 && s.position_distance >= 8 && s.position_distance <= 18
  if (!ok) { bad++; if (bad < 4) console.log('     bad scenario', JSON.stringify(s)); continue }
  const east = isEastbound(magneticCourse([start.lat, start.lon, start.mv], [dest.lat, dest.lon]))
  if ((s.altitude % 2000 === 1500) !== east && !(s.altitude === 11500 || s.altitude === 12500)) altBad++
  if (east ? s.altitude % 2000 !== 1500 : s.altitude % 2000 !== 500) { if (!(s.altitude === 11500 || s.altitude === 12500)) altBad++ }
  const floor = Math.max(start.elev, dest.elev) + 2000
  if (s.altitude < floor && !(s.altitude >= 11500)) altBad++
  if (s.altitude > floor + 5000 && s.altitude !== 12500 && s.altitude !== 11500) altBad++
  // Position is on the far side of the start airport, flying toward the destination.
  const away = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round((((trueCourse([start.lat, start.lon], [dest.lat, dest.lon]) + 180) % 360) / 45)) % 8]
  if (away !== s.position_direction) dirBad++
  const near = ff.stations.reduce((b, st) => (dist(start, st) < dist(start, b) ? st : b), ff.stations[0])
  if (near.name !== s.altimeter_station) stBad++
  facs.add(s.facility_name); states.add(start.state)
}
check('300 scenarios: facility, frequency, destination and distances all agree with the FAA data', bad === 0, `${bad} bad`)
check('cruising altitude follows the direction of flight (odd+500 east, even+500 west) and clears the terrain', altBad === 0, String(altBad))
check('the pilot is on the far side of the start airport from the destination', dirBad === 0, String(dirBad))
check('the altimeter station is the nearest weather station', stBad === 0, String(stBad))
check('the scenarios spread across many facilities and states', facs.size >= 60 && states.size >= 30, `${facs.size} facilities, ${states.size} states`)
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
