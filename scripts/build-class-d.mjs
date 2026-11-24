// Builds lib/class-d-airports.json: the Class D airports the departure and arrival scenarios
// can use, from the FAA's NASR data (free, refreshed every 28 days).
//
//   1. Download the current 28-day subscription from
//      https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/
//      and unzip it, then unzip CSV_Data/<date>_CSV.zip inside it.
//   2. node scripts/build-class-d.mjs /path/to/csv/folder [cycle date, e.g. 2026-10-29]
//
// An airport is used only when ALL of this is true (the reason for each rejection is printed):
//   - the FAA lists it as Class D airspace (and not B or C), with an operating control tower
//   - it is civilian and open, with a four-letter K identifier
//   - it has exactly one VHF local (tower) frequency and one VHF ground frequency, and
//     the tower and ground use the same facility name ("Redmond Tower", "Redmond Ground")
//   - its hard-surface runways are all plain numbers (no L, R or C parallels), so the runway
//     in use always agrees with the wind and the spoken runway is never ambiguous
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/build-class-d.mjs /path/to/csv/folder [cycle date]'); process.exit(1) }
const cycle = process.argv[3] || null

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const head = rows.shift()
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}
const read = (f) => parseCsv(readFileSync(join(dir, f), 'latin1'))

const classD = new Set(read('CLS_ARSP.csv').filter((r) => r.SITE_TYPE_CODE === 'A' && r.CLASS_D_AIRSPACE === 'Y' && !r.CLASS_B_AIRSPACE && !r.CLASS_C_AIRSPACE).map((r) => r.ARPT_ID))
const bases = read('APT_BASE.csv').filter((r) => r.SITE_TYPE_CODE === 'A' && classD.has(r.ARPT_ID))
const freqs = read('FRQ.csv').filter((r) => r.FACILITY_TYPE.startsWith('ATCT') && (r.FREQ_USE === 'LCL/P' || r.FREQ_USE === 'GND/P'))
const rwys = read('APT_RWY.csv')
const ends = read('APT_RWY_END.csv')

const vhf = (f) => { const n = Number(f); return n >= 118 && n <= 136.975 }
const HARD = new Set(['ASPH', 'CONC', 'PEM', 'TRTD'])
const isHard = (s) => s.split('-').every((p) => HARD.has(p))
const title = (s) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase())
// The FAA's call sign text needs tidying before it is spoken: "ELLIS TOWER" would become "Ellis Tower
// Tower", "MC ALLEN" is McAllen, "ST CLOUD" is Saint Cloud, "DOUBLE EAGLE II" ends in "two".
const spoken = (call) => title(call.replace(/\s+(TOWER|TWR)$/, '')).replace(/^Mc ([A-Z])/, 'Mc$1').replace(/^St /, 'Saint ').replace(/ Ii$/, ' Two')
// A bare generic word is not a name a pilot could tell apart ("Executive Tower" is seven airports),
// and the abbreviations are unclear. These are held back for a person to confirm.
const GENERIC = /^(regional|executive|exec|international|county|downtown|cwa|nasa)$/i

const rejected = {}
const reject = (id, why) => { (rejected[why] ??= []).push(id) }
const airports = []
for (const b of bases) {
  const id = b.ARPT_ID
  const icao = b.ICAO_ID
  if (!/^K[A-Z0-9]{3}$/.test(icao)) { reject(id, 'no K identifier'); continue }
  if (b.ARPT_STATUS !== 'O') { reject(id, 'not open'); continue }
  if (['MA', 'MN', 'MR', 'CG'].includes(b.OWNERSHIP_TYPE_CODE)) { reject(id, 'military or Coast Guard'); continue }
  if (!b.TWR_TYPE_CODE.startsWith('ATCT')) { reject(id, 'no control tower'); continue }
  const f = freqs.filter((r) => r.FACILITY === id)
  const local = [...new Set(f.filter((r) => r.FREQ_USE === 'LCL/P' && vhf(r.FREQ)).map((r) => r.FREQ))]
  const ground = [...new Set(f.filter((r) => r.FREQ_USE === 'GND/P' && vhf(r.FREQ)).map((r) => r.FREQ))]
  if (local.length === 0) { reject(id, 'no VHF tower frequency'); continue }
  if (ground.length === 0) { reject(id, 'no VHF ground frequency (no ground control)'); continue }
  if (local.length > 1 || ground.length > 1) { reject(id, 'more than one tower or ground frequency'); continue }
  const lcl = f.find((r) => r.FREQ === local[0] && r.FREQ_USE === 'LCL/P').TOWER_OR_COMM_CALL
  const gnd = f.find((r) => r.FREQ === ground[0] && r.FREQ_USE === 'GND/P').TOWER_OR_COMM_CALL
  if (!lcl || lcl !== gnd) { reject(id, 'tower and ground facility names differ'); continue }
  if (!/^[A-Z][A-Z ]+$/.test(lcl)) { reject(id, 'facility name has digits or punctuation'); continue }
  if (GENERIC.test(lcl.replace(/\s+(TOWER|TWR)$/, ''))) { reject(id, `generic or unclear facility name, held for review (${lcl})`); continue }
  const hard = rwys.filter((r) => r.ARPT_ID === id && !/^H\d|W/.test(r.RWY_ID) && isHard(r.SURFACE_TYPE_CODE) && Number(r.RWY_LEN) >= 2000)
  if (hard.length === 0) { reject(id, 'no hard-surface runway of 2,000 ft or more'); continue }
  const hardIds = new Set(hard.map((r) => r.RWY_ID))
  const e = ends.filter((r) => r.ARPT_ID === id && hardIds.has(r.RWY_ID))
  if (e.some((r) => /[A-Z]$/.test(r.RWY_END_ID))) { reject(id, 'parallel runways (L, R or C)'); continue }
  const runways = e.map((r) => ({ rwy: String(Number(r.RWY_END_ID)), pattern: r.RIGHT_HAND_TRAFFIC_PAT_FLAG === 'Y' ? 'right' : 'left' }))
  if (runways.some((r) => !(Number(r.rwy) >= 1 && Number(r.rwy) <= 36))) { reject(id, 'odd runway number'); continue }
  airports.push({ id: icao, name: spoken(lcl), state: b.STATE_CODE, tower: local[0], ground: ground[0], runways })
}
airports.sort((a, b) => a.id.localeCompare(b.id))

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'class-d-airports.json')
writeFileSync(out, JSON.stringify({
  source: 'FAA NASR 28-day subscription (CLS_ARSP, APT_BASE, APT_RWY, APT_RWY_END, FRQ), https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/',
  cycle, generated: new Date().toISOString().slice(0, 10),
  note: 'Training use only. Not for navigation. Regenerate with scripts/build-class-d.mjs.',
  airports,
}))
console.log(`Class D airports in the FAA data: ${bases.length}. Kept: ${airports.length}`)
for (const [why, list] of Object.entries(rejected).sort((a, b) => b[1].length - a[1].length)) console.log(`  rejected, ${why}: ${list.length}`)
console.log(`wrote ${out}`)
