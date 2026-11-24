// Cruise altitude for airline clearances, following the hemispheric rule in RVSM airspace
// (FL290-FL410): flights on a magnetic course of 000-179 fly odd thousands, 180-359 fly
// even thousands. The trainer's airline range is FL300 to FL410, so:
//   eastbound (odd):  FL310 330 350 370 390 410
//   westbound (even): FL300 320 340 360 380 400
export const EASTBOUND_LEVELS = [310, 330, 350, 370, 390, 410]
export const WESTBOUND_LEVELS = [300, 320, 340, 360, 380, 400]

const rad = (d) => (d * Math.PI) / 180

// Initial true course (degrees, 0-360) from one point to another along a great circle.
export function trueCourse([lat1, lon1], [lat2, lon2]) {
  const dLon = rad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Magnetic course for a flight. Airports are [lat, lon, magneticVariationEast]; variation
// is taken at the departure airport. Magnetic = true - east variation.
export function magneticCourse(from, to) {
  return (((trueCourse(from, to) - from[2]) % 360) + 360) % 360
}

export const isEastbound = (magneticCourseDeg) => magneticCourseDeg >= 0 && magneticCourseDeg < 180

// Picks a flight level for an airline flight. If either airport's position is unknown,
// the direction is chosen at random rather than guessing wrongly.
export function pickAirlineFlightLevel(from, to, rand = Math.random) {
  const east = from && to ? isEastbound(magneticCourse(from, to)) : rand() < 0.5
  const levels = east ? EASTBOUND_LEVELS : WESTBOUND_LEVELS
  return levels[Math.floor(rand() * levels.length)]
}

// Whether a flight from one airport to another is eastbound (magnetic course 000-179), or a random
// guess when either airport's position is unknown.
export function isEastboundFlight(from, to, rand = Math.random) {
  return from && to ? isEastbound(magneticCourse(from, to)) : rand() < 0.5
}

// The altitude to expect for an IFR flight below FL290, which follows the same hemispheric rule as the
// airline flight levels (14 CFR 91.179): odd thousands eastbound, even thousands westbound. Picks a whole
// thousand between minFeet and maxFeet with the right parity.
export function pickExpectAltitude(minFeet, maxFeet, east, rand = Math.random) {
  const options = []
  for (let t = Math.ceil(minFeet / 1000); t <= Math.floor(maxFeet / 1000); t++) if ((t % 2 === 1) === east) options.push(t * 1000)
  return options.length ? options[Math.floor(rand() * options.length)] : (Math.ceil(minFeet / 1000) + 1) * 1000
}
