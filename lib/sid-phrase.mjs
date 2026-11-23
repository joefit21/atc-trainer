// Picks a real departure procedure for an airport and words it the way ATC says it.
// Data comes from lib/sids.json (built by scripts/build-sids.mjs from FAA CIFP data).

// Aviation digit phraseology: three is "tree", nine is "niner".
export const DIGIT_WORDS = ['zero', 'one', 'two', 'tree', 'four', 'five', 'six', 'seven', 'eight', 'niner']

const pick = (list, rand) => list[Math.floor(rand() * list.length)]

// Returns { name, number, transitions } or null when the airport has no published SID.
export function pickSID(data, icao, rand = Math.random) {
  const list = data.airports[icao]
  if (!list || list.length === 0) return null
  return pick(list, rand)
}

// Phrases for an airport with no published SID, varied so every clearance isn't the same.
// Each follows "cleared to <destination>".
export const NO_SID_PHRASES = [
  'via radar vectors',
  'as filed',
  'via fly runway heading, expect radar vectors on course',
]

// "via the BAYLR six departure, TEHRU transition, then as filed", or one of
// NO_SID_PHRASES when there is no SID. A transition is only ever one of the
// procedure's own real transitions, and only used about 60% of the time.
export function buildRoutePhrase(sid, rand = Math.random) {
  if (!sid) return pick(NO_SID_PHRASES, rand)
  const number = DIGIT_WORDS[sid.number]
  if (sid.transitions.length > 0 && rand() < 0.6) {
    return `via the ${sid.name} ${number} departure, ${pick(sid.transitions, rand)} transition, then as filed`
  }
  return `via the ${sid.name} ${number} departure, then as filed`
}
