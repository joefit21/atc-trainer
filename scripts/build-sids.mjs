// Builds lib/sids.json, the real published departure procedures (SIDs) per airport,
// from the FAA's free CIFP dataset (ARINC 424 format, refreshed every 28 days).
//
//   1. Download the current CIFP zip from
//      https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/download/
//      and unzip it. The file you need is named FAACIFP18.
//   2. node scripts/build-sids.mjs /path/to/FAACIFP18 [cycle, e.g. 2611]
//
// Departure procedures revise rarely, so refreshing every few months is plenty. Each
// SID record is a fixed-width line:
//   col 5 = 'P' (airport) and col 13 = 'D' (SID), col 7-10 airport, col 14-19 procedure
//   id (name + revision digit, e.g. BAYLR6), col 20 route type, col 21-25 transition.
//
// Route types (ARINC 424): enroute transitions are 3, 6, S, V; runway transitions
// are 1, 4, F, T; the common route is 2, 5, M; 0 is engine-out only.
import { createReadStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const src = process.argv[2]
if (!src) {
  console.error('usage: node scripts/build-sids.mjs /path/to/FAACIFP18 [cycle]')
  process.exit(1)
}
const cycle = process.argv[3] || null
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'sids.json')

const ENROUTE = new Set(['3', '6', 'S', 'V'])
const RUNWAY_TRANSITION = new Set(['1', '4', 'F', 'T'])
const COMMON = new Set(['2', '5', 'M'])
// Leg types that end at an altitude ("climb on heading to X", "course to an altitude") rather
// than at a named fix; they are not crossing restrictions at a fix.
const ALTITUDE_LEGS = new Set(['VA', 'CA', 'FA', 'VI', 'VM', 'VR', 'VD', 'CI', 'CD', 'CR', 'FC', 'FD', 'FM', 'HA', 'HF', 'HM'])
// Altitude descriptions that are real crossing restrictions (at, at or above, at or below,
// between); the glide-slope ones (G, H, I, J) are not.
const RESTRICTION_CODES = new Set(['+', '-', ' ', '@', 'B', 'C', 'V', 'X', 'Y'])
const altFeet = (f) => (/^FL\d+$/.test(f) ? Number(f.slice(2)) * 100 : /^\d+$/.test(f) ? Number(f) : null)
const byAirport = new Map() // icao -> Map(procId -> { name, number, transitions:Set })
const runways = {} // icao -> ['07L', '07R', '08', ...] (real runway identifiers)
const coords = {} // icao -> [latitude, longitude, magnetic variation (east positive)]

// ARINC 424 airport reference point: lat 'N33381212' (N DD MM SS ss), lon 'W084254031'
// (W DDD MM SS ss), magnetic variation 'W0050' (W/E + degrees to tenths).
function dms(field, degDigits) {
  const sign = field[0] === 'S' || field[0] === 'W' ? -1 : 1
  const d = Number(field.slice(1, 1 + degDigits))
  const m = Number(field.slice(1 + degDigits, 3 + degDigits))
  const sec = Number(field.slice(3 + degDigits, 7 + degDigits)) / 100
  return sign * (d + m / 60 + sec / 3600)
}

const rl = createInterface({ input: createReadStream(src, { encoding: 'latin1' }), crlfDelay: Infinity })
for await (const line of rl) {
  if (line.length > 56 && line[4] === 'P' && line[5] === ' ' && line[12] === 'A' && /^K[A-Z0-9]{3}$/.test(line.slice(6, 10).trim())) {
    const icao = line.slice(6, 10).trim()
    const var_ = Number(line.slice(52, 56)) / 10
    const lat = dms(line.slice(32, 41), 2)
    const lon = dms(line.slice(41, 51), 3)
    if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(var_)) {
      coords[icao] = [Number(lat.toFixed(4)), Number(lon.toFixed(4)), line[51] === 'W' ? -var_ : var_]
    }
  }
  // Runway record: section P, subsection G, identifier like 'RW07L' in columns 14-18.
  if (line.length > 40 && line[4] === 'P' && line[12] === 'G') {
    const rIcao = line.slice(6, 10).trim()
    const rm = line.slice(13, 18).trim().match(/^RW(\d{2}[LRC]?)$/)
    if (rm && /^K[A-Z0-9]{3}$/.test(rIcao)) (runways[rIcao] ??= new Set()).add(rm[1])
  }
  if (line.length < 30 || line[4] !== 'P' || line[12] !== 'D') continue
  const icao = line.slice(6, 10).trim()
  if (!/^K[A-Z0-9]{3}$/.test(icao)) continue // the continental US, which is all the trainer uses
  const id = line.slice(13, 19).trim()
  const routeType = line[19]
  const transition = line.slice(20, 25).trim()
  const m = id.match(/^([A-Z]{3,5})(\d)$/) // name + one revision digit
  if (!m) continue
  if (routeType === '0') continue // engine-out only, never part of a normal clearance
  const procs = byAirport.get(icao) ?? new Map()
  const proc = procs.get(id) ?? { name: m[1], number: Number(m[2]), transitions: new Set(), legs: [] }
  if ('01'.includes(line[38])) {
    const a1 = line.slice(84, 89).trim()
    const a2 = line.slice(89, 94).trim()
    const fix = line.slice(29, 34).trim()
    const path = line.slice(47, 49)
    if (a1 && fix && !ALTITUDE_LEGS.has(path) && RESTRICTION_CODES.has(line[82])) {
      proc.legs.push({ routeType, transition, fix, key: `${fix}|${line[82]}|${a1}|${a2}`, alts: [altFeet(a1), altFeet(a2)].filter((x) => x != null) })
    }
  }
  // Only named fixes (5 letters) are used as transitions; the 3-letter VOR transitions
  // are left out because their spoken form on a clearance varies.
  if (ENROUTE.has(routeType) && /^[A-Z]{5}$/.test(transition)) proc.transitions.add(transition)
  procs.set(id, proc)
  byAirport.set(icao, procs)
}

// "Climb via the SID" is only used when the procedure has real altitude restrictions to climb via:
// at least two crossing restrictions at named fixes on the initial climb (the runway transition
// plus the common route), whichever runway is used. The clearance doesn't name a runway, so the
// runway with the fewest restrictions decides. topAlt is the highest altitude the procedure
// itself names on that initial climb, so an "expect" altitude can be set above it.
function climbVia(p) {
  const distinct = (legs) => new Set(legs.map((l) => l.key)).size
  const common = p.legs.filter((l) => COMMON.has(l.routeType))
  const byRunway = new Map()
  for (const l of p.legs) if (RUNWAY_TRANSITION.has(l.routeType)) byRunway.set(l.transition, [...(byRunway.get(l.transition) ?? []), l])
  const paths = byRunway.size ? [...byRunway.values()].map((r) => distinct([...r, ...common])) : [distinct(common)]
  if (Math.min(...paths) < 2) return null
  const topAlt = Math.max(...p.legs.filter((l) => !ENROUTE.has(l.routeType)).flatMap((l) => l.alts))
  return Number.isFinite(topAlt) ? { climbVia: true, topAlt } : null
}

const airports = {}
for (const icao of [...byAirport.keys()].sort()) {
  airports[icao] = [...byAirport.get(icao).values()]
    .map((p) => ({ name: p.name, number: p.number, transitions: [...p.transitions].sort(), ...climbVia(p) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const data = {
  source: 'FAA CIFP (ARINC 424), https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/cifp/',
  cycle,
  generated: new Date().toISOString().slice(0, 10),
  note: 'Training use only. Not for navigation. Regenerate with scripts/build-sids.mjs.',
  airports,
}
writeFileSync(out, JSON.stringify(data))
const runwaysOut = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'runways.json')
const runwayList = Object.fromEntries(Object.entries(runways).sort().map(([k, v]) => [k, [...v].sort()]))
writeFileSync(runwaysOut, JSON.stringify({ source: data.source, cycle, generated: data.generated, airports: runwayList }))
console.log(`wrote ${runwaysOut}: ${Object.keys(runwayList).length} airports`)

const coordsOut = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'airport-coords.json')
writeFileSync(coordsOut, JSON.stringify({ source: data.source, cycle, generated: data.generated, airports: coords }))
console.log(`wrote ${coordsOut}: ${Object.keys(coords).length} airports`)
const n = Object.values(airports).reduce((s, a) => s + a.length, 0)
console.log(`wrote ${out}: ${Object.keys(airports).length} airports, ${n} departure procedures`)
