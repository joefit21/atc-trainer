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
const byAirport = new Map() // icao -> Map(procId -> { name, number, transitions:Set })

const rl = createInterface({ input: createReadStream(src, { encoding: 'latin1' }), crlfDelay: Infinity })
for await (const line of rl) {
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
  const proc = procs.get(id) ?? { name: m[1], number: Number(m[2]), transitions: new Set() }
  // Only named fixes (5 letters) are used as transitions; the 3-letter VOR transitions
  // are left out because their spoken form on a clearance varies.
  if (ENROUTE.has(routeType) && /^[A-Z]{5}$/.test(transition)) proc.transitions.add(transition)
  procs.set(id, proc)
  byAirport.set(icao, procs)
}

const airports = {}
for (const icao of [...byAirport.keys()].sort()) {
  airports[icao] = [...byAirport.get(icao).values()]
    .map((p) => ({ name: p.name, number: p.number, transitions: [...p.transitions].sort() }))
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
const n = Object.values(airports).reduce((s, a) => s + a.length, 0)
console.log(`wrote ${out}: ${Object.keys(airports).length} airports, ${n} departure procedures`)
