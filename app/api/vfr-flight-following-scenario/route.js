import { requireSubscribed } from '@/lib/require-auth'
import ffData from '@/lib/flight-following.json'
import { magneticCourse, isEastbound, trueCourse } from '@/lib/altitudes.mjs'

// Real facilities and airports from the FAA's NASR data (scripts/build-flight-following.mjs). The pilot
// starts a few miles from an airport, and the facility and frequency are the ones the FAA lists for
// that airport (an approach control, or an ARTCC where there is none). The destination is another
// airport served by the same facility, and the cruising altitude follows the direction of flight.
const FF = ffData
const START_AIRPORTS = FF.airports.filter((a) => a.freq)
const BY_FACILITY = {}
for (const a of FF.airports) (BY_FACILITY[a.fac] ??= []).push(a)

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
// The compass point for a true bearing in degrees.
const compassPoint = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]

const rad = (d) => (d * Math.PI) / 180
function distanceNm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2
  return 2 * 3440.065 * Math.asin(Math.sqrt(h))
}

// 14 CFR 91.159: odd thousands plus 500 on a magnetic course of 0-179, even thousands plus 500 on 180-359.
const EASTBOUND_ALTITUDES = [3500, 5500, 7500, 9500, 11500]
const WESTBOUND_ALTITUDES = [4500, 6500, 8500, 10500, 12500]

const AIRCRAFT = [
  { type: 'Cessna 172',         spoken: 'Cessna one seven two' },
  { type: 'Cessna 182',         spoken: 'Cessna one eight two' },
  { type: 'Piper Cherokee',     spoken: 'Piper Cherokee'       },
  { type: 'Piper Archer',       spoken: 'Piper Archer'         },
  { type: 'Beechcraft Bonanza', spoken: 'Beechcraft Bonanza'   },
  { type: 'Cirrus SR22',        spoken: 'Cirrus S R twenty two'},
]

const PHONETIC = {
  A:'alpha',B:'bravo',C:'charlie',D:'delta',E:'echo',F:'foxtrot',
  G:'golf',H:'hotel',I:'india',J:'juliet',K:'kilo',L:'lima',M:'mike',
  N:'november',O:'oscar',P:'papa',Q:'quebec',R:'romeo',S:'sierra',
  T:'tango',U:'uniform',V:'victor',W:'whiskey',X:'xray',Y:'yankee',Z:'zulu',
}
const DIGIT_WORDS = ['zero','one','two','three','four','five','six','seven','eight','niner']

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateTailNumber() {
  const digits  = Array.from({ length: 3 }, () => randomInt(0, 9))
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + randomInt(0, 25)))
  return {
    display: `N${digits.join('')}${letters.join('')}`,
    spoken:  `November ${digits.map(d => DIGIT_WORDS[d]).join(' ')} ${letters.map(l => PHONETIC[l]).join(' ')}`,
  }
}

function randomAltimeter() {
  const whole = randomInt(2975, 3025)
  return (whole / 100).toFixed(2)
}

export async function GET(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  // A starting airport needs somewhere to go: another airport on the same facility, 20-120 nm away.
  let start, destination, distance
  for (let i = 0; i < 50 && !destination; i++) {
    start = pickRandom(START_AIRPORTS)
    const options = (BY_FACILITY[start.fac] || []).filter((d) => d.id !== start.id && (distance = distanceNm(start, d)) >= 20 && distance <= 120)
    if (options.length) destination = pickRandom(options)
  }
  const aircraft    = pickRandom(AIRCRAFT)
  const tail        = generateTailNumber()
  // The pilot is on the far side of the starting airport from the destination, flying toward it.
  const bearing     = trueCourse([start.lat, start.lon], [destination.lat, destination.lon])
  const posDir      = compassPoint(bearing + 180)
  const posDist     = randomInt(8, 18)
  const course      = magneticCourse([start.lat, start.lon, start.mv], [destination.lat, destination.lon])
  const minAlt      = Math.max(start.elev, destination.elev) + 2000
  // A typical cruise: at least 2,000 ft above the higher airport and no more than 5,000 ft above that.
  const allLevels   = isEastbound(course) ? EASTBOUND_ALTITUDES : WESTBOUND_ALTITUDES
  const levels      = allLevels.filter((a) => a >= minAlt && a <= minAlt + 5000)
  const altitude    = pickRandom(levels.length ? levels : [allLevels.find((a) => a >= minAlt) ?? allLevels[allLevels.length - 1]])
  const altimeter   = randomAltimeter()
  // The controller gives the altimeter of the nearest weather station (ASOS or AWOS).
  const station     = FF.stations.reduce((best, st) => (distanceNm(start, st) < distanceNm(start, best) ? st : best), FF.stations[0])

  return Response.json({
    scenario_type:       'flight_following',
    facility_name:       FF.facilities[start.fac],
    facility_freq:       start.freq,
    altimeter_station:   station.name,
    aircraft_type:       aircraft.type,
    callsign_display:    tail.display,
    callsign_spoken:     tail.spoken,
    destination_name:    destination.name,
    destination_id:      destination.id,
    position_reference:  start.name,
    position_direction:  posDir,
    position_distance:   posDist,
    altitude,
    altimeter,
  })
}
