// Builds lib/flight-following.json: real approach-control and Center facilities, the frequency that
// serves each airport, and the airports a flight following scenario can start from and fly to,
// from the FAA's NASR data. Same download as scripts/build-class-d.mjs, and it reads the two airport
// lists that script and scripts/build-ctaf-airports.mjs build, so run those first.
//
//   node scripts/build-flight-following.mjs /path/to/csv/folder [cycle date, e.g. 2026-10-29]
//
// How a starting position is matched to a facility: the FAA publishes, for each airport, which
// approach control or ARTCC serves it (ATC_BASE) and the frequency it works that airport on (FRQ), the
// same information as the "APP/DEP CON" line in the Chart Supplement. A scenario starts a few miles
// from one of those airports, so the facility and frequency are the ones the FAA lists for it.
//   - a starting airport needs exactly one VHF approach frequency from one facility (if a facility
//     splits an airport across sectors, the right one depends on direction, so it is left out)
//   - destinations are airports served by the same facility, 20 to 120 nm away
//   - the altimeter station is the nearest ASOS or AWOS, named for its city
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './nasr.mjs'

const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/build-flight-following.mjs /path/to/csv/folder [cycle date]'); process.exit(1) }
const cycle = process.argv[3] || null
const here = dirname(fileURLToPath(import.meta.url))
const readLib = (f) => JSON.parse(readFileSync(join(here, '..', 'lib', f), 'utf8'))
const read = (f) => parseCsv(readFileSync(join(dir, f), 'latin1'))

const known = [...readLib('class-d-airports.json').airports, ...readLib('ctaf-airports.json').airports] // already-vetted names, states and ids
const knownByFaa = new Map(known.map((a) => [a.id.slice(1), a]))

const title = (s) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase())
// The FAA's call sign text, tidied: the usual capitalization of NorCal and SoCal, Navy prefixes dropped,
// "ST" spelled out, and the few call signs the FAA data spells oddly.
const SPECIAL = { NORCAL: 'NorCal', SOCAL: 'SoCal', 'L.A.': 'Los Angeles', CHEYENE: 'Cheyenne', 'MC GUIRE': 'McGuire', 'OKE CITY': 'Oklahoma City' }
const callName = (call) => SPECIAL[call] ?? title(call.replace(/^NAVY /, '').replace(/^ST /, 'SAINT '))

const base = new Map(read('APT_BASE.csv').filter((r) => r.SITE_TYPE_CODE === 'A').map((r) => [r.ARPT_ID, r]))
const atc = new Map(read('ATC_BASE.csv').filter((r) => r.FACILITY_ID && r.SITE_TYPE_CODE === 'A').map((r) => [r.FACILITY_ID, r]))
const APCH_USES = new Set(['APCH/P', 'APCH/P DEP/P', 'APCH/P DEP/P IC', 'APCH/P IC'])
const vhf = (f) => Number(f) >= 118 && Number(f) <= 136.975
// Approach control frequencies come from the TRACON/tower records; an airport served by an ARTCC has its
// low-altitude frequency on the Center's remote site (RCAG) record for that airport.
const approachFreqs = new Map(), centerFreqs = new Map()
for (const r of read('FRQ.csv')) {
  if (!vhf(r.FREQ)) continue
  const k = r.SERVICED_FACILITY
  if (r.FACILITY_TYPE === 'RCAG') {
    if (r.SECTORIZATION.includes('LOW') && /APCH\/DEP/.test(r.REMARK)) (centerFreqs.get(k) ?? centerFreqs.set(k, []).get(k)).push(r)
  } else if (APCH_USES.has(r.FREQ_USE)) (approachFreqs.get(k) ?? approachFreqs.set(k, []).get(k)).push(r)
}

const facilities = {}
const facilityOf = (a) => {
  const p = atc.get(a)
  if (!p || !p.APCH_P_PROVIDER || !p.PRIMARY_APCH_RADIO_CALL) return null
  const call = p.PRIMARY_APCH_RADIO_CALL
  if (/ARTCC$/.test(call)) return { id: p.APCH_P_PROVIDER, name: `${callName(call.replace(/\s*ARTCC$/, '').replace(/\s*CENTER$/, ''))} Center`, call }
  if (!/^[A-Z][A-Z ]+$/.test(call) || /\bGCA\b/.test(call)) return null
  return { id: p.APCH_P_PROVIDER, name: `${callName(call)} Approach`, call }
}

const rejected = {}
const reject = (why) => { rejected[why] = (rejected[why] ?? 0) + 1 }
const airports = []
for (const [faa, k] of knownByFaa) {
  const b = base.get(faa)
  const fac = b && facilityOf(faa)
  if (!b || !fac) { reject('no approach facility listed'); continue }
  const lat = Number(b.LAT_DECIMAL), lon = Number(b.LONG_DECIMAL), elev = Math.round(Number(b.ELEV))
  const mv = (b.MAG_HEMIS === 'W' ? -1 : 1) * Number(b.MAG_VARN)
  if (![lat, lon, elev, mv].every(Number.isFinite)) { reject('missing position data'); continue }
  facilities[fac.id] = fac.name
  const isCenter = /ARTCC$/.test(fac.call)
  const rows = isCenter
    ? (centerFreqs.get(faa) ?? []).filter((r) => r.ARTCC_OR_FSS_ID === fac.id)
    : (approachFreqs.get(faa) ?? []).filter((r) => r.PRIMARY_APPROACH_RADIO_CALL === fac.call)
  const freqs = [...new Set(rows.map((r) => r.FREQ))]
  airports.push({ id: k.id, name: k.name, state: k.state, lat: +lat.toFixed(4), lon: +lon.toFixed(4), elev, mv, fac: fac.id, freq: freqs.length === 1 ? freqs[0] : null })
  if (freqs.length !== 1) reject(freqs.length === 0 ? 'no published approach frequency (destination only)' : 'more than one approach frequency (destination only)')
}
airports.sort((a, b) => a.id.localeCompare(b.id))

// Altimeter stations: every ASOS and AWOS at an airport, named for its city, since that is what a controller
// says ("Sacramento altimeter"). The nearest one to the pilot is used.
const stations = []
for (const r of read('AWOS.csv')) {
  if (r.SITE_TYPE_CODE !== 'A' || r.COUNTRY_CODE !== 'US' || !/^[A-Z][A-Z ]+$/.test(r.CITY)) continue
  const lat = Number(r.LAT_DECIMAL), lon = Number(r.LONG_DECIMAL)
  if (Number.isFinite(lat) && Number.isFinite(lon)) stations.push({ name: callName(r.CITY), lat: +lat.toFixed(4), lon: +lon.toFixed(4) })
}

const out = join(here, '..', 'lib', 'flight-following.json')
writeFileSync(out, JSON.stringify({
  source: 'FAA NASR 28-day subscription (ATC_BASE, FRQ, APT_BASE), https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/',
  cycle, generated: new Date().toISOString().slice(0, 10),
  note: 'Training use only. Not for navigation. Regenerate with scripts/build-flight-following.mjs.',
  facilities, airports, stations,
}))
const starts = airports.filter((a) => a.freq)
console.log(`Airports with an approach facility: ${airports.length} (${starts.length} can be a starting position). Facilities: ${Object.keys(facilities).length}. Altimeter stations: ${stations.length}`)
for (const [why, n] of Object.entries(rejected).sort((a, b) => b[1] - a[1])) console.log(`  ${why}: ${n}`)
console.log(`wrote ${out}`)
