// Ground (taxi) clearances built from the airport's real runways.
// Runway identifiers come from lib/runways.json (FAA CIFP, built by scripts/build-sids.mjs).
// Taxiway names are invented: the FAA data has no taxiway layouts.
import { DIGIT_WORDS } from './sid-phrase.mjs'

const SUFFIX_WORDS = { L: 'left', R: 'right', C: 'center' }
const SUFFIX_SWAP = { L: 'R', R: 'L', C: 'C' }
const pick = (list, rand) => list[Math.floor(rand() * list.length)]
const numberOf = (id) => parseInt(id.slice(0, 2), 10)
const suffixOf = (id) => id.slice(2)

// "16L" -> "one six left", "09" -> "niner", "08" -> "eight", "34R" -> "tree four right"
// (each digit spoken, no leading zero, aviation digit words).
export function runwaySpoken(id) {
  const digits = String(numberOf(id)).split('').map((d) => DIGIT_WORDS[Number(d)]).join(' ')
  const suffix = SUFFIX_WORDS[suffixOf(id)]
  return suffix ? `${digits} ${suffix}` : digits
}

// The other end of the same runway: 08 <-> 26, 16L <-> 34R, 09C <-> 27C.
export function reciprocal(id) {
  const n = ((numberOf(id) + 17) % 36) + 1
  const s = suffixOf(id)
  return String(n).padStart(2, '0') + (SUFFIX_SWAP[s] ?? '')
}

export const sameStrip = (a, b) => a === b || b === reciprocal(a)

// Picks the departure runway the way an airport would: from a wind. A wind direction
// is drawn at random and the runway with the best headwind wins; parallel runways with
// the same number (16L, 16R) are then chosen between at random.
export function pickActiveRunway(ids, rand = Math.random) {
  const wind = rand() * 360
  let bestNumber = null, bestHeadwind = -2
  for (const id of ids) {
    const headwind = Math.cos(((numberOf(id) * 10 - wind) * Math.PI) / 180)
    if (headwind > bestHeadwind) { bestHeadwind = headwind; bestNumber = numberOf(id) }
  }
  return pick(ids.filter((id) => numberOf(id) === bestNumber), rand)
}

// Hold-short or crossing instruction. It always names a DIFFERENT runway than the one
// assigned (the taxi clearance limit): "taxi to runway 31" already means stop at 31, so
// "hold short of runway 31" would repeat the limit. At an airport with only one runway
// there is nothing else to hold short of or cross, so there is no instruction ('').
export function pickInstruction(ids, departure, rand = Math.random) {
  const others = ids.filter((id) => !sameStrip(departure, id))
  if (others.length === 0) return ''
  const other = runwaySpoken(pick(others, rand))
  return rand() < 0.5 ? `hold short of runway ${other}` : `cross runway ${other}`
}

const NATO = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'Juliet', 'Kilo', 'Lima', 'Mike', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Yankee', 'Zulu']

// One to three invented taxiway names, e.g. "Alpha, Bravo tree, Delta". Never repeats.
export function pickTaxiways(rand = Math.random) {
  const count = 1 + Math.floor(rand() * 3)
  const pool = [...NATO]
  const names = []
  for (let i = 0; i < count; i++) {
    let name = pool.splice(Math.floor(rand() * pool.length), 1)[0]
    if (rand() < 0.25) name += ' ' + DIGIT_WORDS[1 + Math.floor(rand() * 9)] // like taxiway A3
    names.push(name)
  }
  return names.join(', ')
}

export function buildGroundClearance({ callsignSpoken, city, runways, rand = Math.random }) {
  const departure = pickActiveRunway(runways, rand)
  const instruction = pickInstruction(runways, departure, rand)
  const text = `${callsignSpoken}, ${city} ground, runway ${runwaySpoken(departure)}, taxi via ${pickTaxiways(rand)}${instruction ? ', ' + instruction : ''}`
  return { text, departure }
}
