// Builds lib/ctaf-airports.json: the non-towered airports the CTAF scenarios can use, from the
// FAA's NASR data (free, refreshed every 28 days). Same download as scripts/build-class-d.mjs.
//
//   node scripts/build-ctaf-airports.mjs /path/to/csv/folder [cycle date, e.g. 2026-10-29]
//
// An airport is used only when ALL of this is true (the reason for each rejection is printed):
//   - public use, open, no control tower at all (a part-time tower would be a Class D airport)
//   - civilian, with a four-letter K identifier
//   - exactly one published CTAF frequency
//   - a hard-surface runway of 2,500 ft or more, and all its hard runways are plain numbers
//     (no L, R or C parallels), so the runway in use agrees with the wind and is never ambiguous
//   - a plain name a pilot would say ("Auburn traffic"), taken from the FAA's airport name
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv, hardSurface } from './nasr.mjs'

const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/build-ctaf-airports.mjs /path/to/csv/folder [cycle date]'); process.exit(1) }
const cycle = process.argv[3] || null
const read = (f) => parseCsv(readFileSync(join(dir, f), 'latin1'))

// The name pilots use is the FAA name without its generic ending: "AUBURN MUNI" is Auburn,
// "STATESVILLE RGNL" is Statesville, "DELAWARE MUNI/JIM MOORE FLD" is Delaware.
const GENERIC_END = /\s+(MUNI|MUNICIPAL|RGNL|REGIONAL|INTL|INTERNATIONAL|AIRPORT|ARPT)$/
const WORDS = { FLD: 'Field', CO: 'County', ST: 'Saint', MT: 'Mount', FT: 'Fort', AIRPK: 'Airpark', MEML: 'Memorial', NATL: 'National', CNTY: 'County', INTL: 'International' }
function spokenName(arptName) {
  const parts = arptName.split('/')
  // "ROBERTS FLD/REDMOND MUNI": which half the pilots say is unclear, so these are held for review.
  if (parts.length > 1 && /\b(FLD|FIELD)$/.test(parts[0].trim())) return null
  let n = parts[0].trim()
  for (let i = 0; i < 3; i++) n = n.replace(GENERIC_END, '')
  if (!/^[A-Z][A-Z' -]*[A-Z]$/.test(n)) return null // digits and other punctuation
  const word = (w) => WORDS[w] ?? (w === 'AND' ? 'and' : w.toLowerCase().replace(/(^|')[a-z]/g, (m) => m.toUpperCase()))
  const words = n.split(' ').map((w) => w.split('-').map(word).join('-'))
  const name = words.join(' ').replace(/\bMc ([A-Z])/g, 'Mc$1')
  // Long names, middle initials and leftover abbreviations are not what a pilot says on the radio.
  if (name.split(' ').length > 3 || /\b[A-Z]\b/.test(name) || /\b(Rgnl|Muni|Intl|Arpt|Acft|Hrbr|Fld|Cntry|Twp|Aprt|Ntl|Exec|Tx|Lt|Ste|Sta)\b/i.test(name)) return null
  return name
}

const bases = read('APT_BASE.csv').filter((r) => r.SITE_TYPE_CODE === 'A' && r.TWR_TYPE_CODE === 'NON-ATCT')
const ctaf = new Map()
for (const r of read('FRQ.csv')) if (r.FREQ_USE === 'CTAF' && r.FACILITY_TYPE === 'NON-ATCT') (ctaf.get(r.FACILITY) ?? ctaf.set(r.FACILITY, new Set()).get(r.FACILITY)).add(r.FREQ)
const rwys = read('APT_RWY.csv')
const ends = read('APT_RWY_END.csv')
const byAirport = (rows) => { const m = new Map(); for (const r of rows) (m.get(r.ARPT_ID) ?? m.set(r.ARPT_ID, []).get(r.ARPT_ID)).push(r); return m }
const rwyBy = byAirport(rwys), endBy = byAirport(ends)

const rejected = {}
const reject = (id, why) => { (rejected[why] ??= []).push(id) }
const airports = []
for (const b of bases) {
  const id = b.ARPT_ID, icao = b.ICAO_ID
  if (!/^K[A-Z0-9]{3}$/.test(icao)) { reject(id, 'no K identifier'); continue }
  if (b.ARPT_STATUS !== 'O') { reject(id, 'not open'); continue }
  if (b.FACILITY_USE_CODE !== 'PU') { reject(id, 'private use'); continue }
  if (['MA', 'MN', 'MR', 'CG'].includes(b.OWNERSHIP_TYPE_CODE)) { reject(id, 'military or Coast Guard'); continue }
  const f = [...(ctaf.get(id) ?? [])]
  if (f.length !== 1) { reject(id, 'no CTAF frequency, or more than one'); continue }
  const name = spokenName(b.ARPT_NAME)
  if (!name) { reject(id, 'name is long, has an initial, an abbreviation, digits or punctuation, or is unclear (held for review)'); continue }
  const hard = (rwyBy.get(id) ?? []).filter((r) => !/^H\d|W/.test(r.RWY_ID) && hardSurface(r.SURFACE_TYPE_CODE) && Number(r.RWY_LEN) >= 2500)
  if (hard.length === 0) { reject(id, 'no hard-surface runway of 2,500 ft or more'); continue }
  const hardIds = new Set((rwyBy.get(id) ?? []).filter((r) => !/^H\d|W/.test(r.RWY_ID) && hardSurface(r.SURFACE_TYPE_CODE)).map((r) => r.RWY_ID))
  const e = (endBy.get(id) ?? []).filter((r) => hardIds.has(r.RWY_ID))
  if (e.some((r) => /[A-Z]$/.test(r.RWY_END_ID))) { reject(id, 'parallel runways (L, R or C)'); continue }
  const runways = e.map((r) => ({ rwy: String(Number(r.RWY_END_ID)), pattern: r.RIGHT_HAND_TRAFFIC_PAT_FLAG === 'Y' ? 'right' : 'left' }))
  if (runways.length === 0 || runways.some((r) => !(Number(r.rwy) >= 1 && Number(r.rwy) <= 36))) { reject(id, 'odd runway data'); continue }
  airports.push({ id: icao, name, state: b.STATE_CODE, ctaf: f[0], runways })
}
airports.sort((a, b) => a.id.localeCompare(b.id))

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'ctaf-airports.json')
writeFileSync(out, JSON.stringify({
  source: 'FAA NASR 28-day subscription (APT_BASE, APT_RWY, APT_RWY_END, FRQ), https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/',
  cycle, generated: new Date().toISOString().slice(0, 10),
  note: 'Training use only. Not for navigation. Regenerate with scripts/build-ctaf-airports.mjs.',
  airports,
}))
console.log(`Non-towered airports in the FAA data: ${bases.length}. Kept: ${airports.length}`)
for (const [why, list] of Object.entries(rejected).sort((a, b) => b[1].length - a[1].length)) console.log(`  rejected, ${why}: ${list.length}`)
console.log(`wrote ${out}`)
