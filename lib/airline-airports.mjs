// Airline callsigns only fly between Class B and Class C airports. GA-style callsigns can use any airport.
// These airports in the IFR/ground list are Class D (and not B or C) in the FAA's airspace data
// (NASR 28-day cycle 2026-10-29, CLS_ARSP), so an airline flight is never cleared from or to them.
export const CLASS_D_ONLY = new Set(['KTEB', 'KFRG', 'KHPN', 'KVNY', 'KSMO', 'KBDR', 'KHWD', 'KPAO', 'KCCR', 'KMYF', 'KFSD'])

export const isAirlineAirport = (airport) => !CLASS_D_ONLY.has(airport.icao)

// Two different airports for a flight: both Class B/C when it is an airline flight, any two otherwise.
export function pickAirportPair(airports, isAirline, pick) {
  const pool = isAirline ? airports.filter(isAirlineAirport) : airports
  const first = pick(pool)
  let second
  do { second = pick(pool) } while (second.icao === first.icao)
  return [first, second]
}
