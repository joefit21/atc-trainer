// Class D departure scenario helpers: runway choice that agrees with the ATIS wind, and
// the real runways a ground controller can mention for a hold-short or crossing.
// Runway numbers here are plain strings without a leading zero, like '5', '23', '13'.

const pick = (list, rand) => list[Math.floor(rand() * list.length)]

// The other end of the same runway: 5 <-> 23, 13 <-> 31, 36 <-> 18.
export const reciprocalNumber = (n) => ((Number(n) + 17) % 36) + 1
export const sameStripNumber = (a, b) => Number(a) === Number(b) || reciprocalNumber(a) === Number(b)

// Picks the runway in use from the wind that will be announced. With a real wind
// (4 knots or more) the runway with the best headwind wins. In a light wind either
// direction is in use, so it is a random choice.
export function pickRunwayForWind(runways, windDir, windSpeed, rand = Math.random) {
  if (windSpeed < 4) return pick(runways, rand)
  let best = runways[0], bestHeadwind = -2
  for (const r of runways) {
    const headwind = Math.cos(((Number(r.rwy) * 10 - windDir) * Math.PI) / 180)
    if (headwind > bestHeadwind) { bestHeadwind = headwind; best = r }
  }
  return best
}

// Real runways at this airport that are not the active runway or its other end.
export function holdShortCandidates(runways, activeRwy) {
  return runways.map((r) => r.rwy).filter((n) => !sameStripNumber(activeRwy, n))
}

// Whether this departure gets a hold-short or crossing instruction, decided here because a
// model told "about 1 in 3" does it nearly every time. Returns a runway number from the
// candidates about a third of the time, otherwise null.
export function pickHoldShort(candidates, rand = Math.random, probability = 1 / 3) {
  if (candidates.length === 0 || rand() >= probability) return null
  return candidates[Math.floor(rand() * candidates.length)]
}
