// Picks a real departure procedure for an airport and words it the way ATC says it.
// Data comes from lib/sids.json (built by scripts/build-sids.mjs from FAA CIFP data).

// Aviation digit phraseology: three is "tree", nine is "niner".
export const DIGIT_WORDS = ['zero', 'one', 'two', 'tree', 'four', 'five', 'six', 'seven', 'eight', 'niner']

const pick = (list, rand) => list[Math.floor(rand() * list.length)]

// Returns { name, number, transitions } or null when the airport has no usable SID.
// A departure procedure is always cleared with one of its transitions, so only procedures
// that have a published transition are ever picked. An airport whose procedures have none
// gets the no-SID phrases instead.
export function pickSID(data, icao, rand = Math.random) {
  const list = (data.airports[icao] || []).filter((p) => p.transitions.length > 0)
  if (list.length === 0) return null
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
// NO_SID_PHRASES when there is no SID. A departure procedure always names a transition
// before "then as filed", and it is only ever one of the procedure's own real transitions.
// A procedure with no transition cannot be cleared this way, so it falls back to the
// no-SID phrases (pickSID never returns one).
export function buildRoutePhrase(sid, rand = Math.random) {
  if (!sid || sid.transitions.length === 0) return pick(NO_SID_PHRASES, rand)
  const number = DIGIT_WORDS[sid.number]
  return `via the ${sid.name} ${number} departure, ${pick(sid.transitions, rand)} transition, then as filed`
}
