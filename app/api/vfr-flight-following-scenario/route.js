import { requireSubscribed } from '@/lib/require-auth'

// Geographic regions — facility, position references, and destinations are
// all within ~200 nm of each other so scenarios make geographic sense.
// altimeter_station: the city/airport name the controller identifies when issuing the altimeter
//   e.g. "Sacramento altimeter, two niner niner five"
const REGIONS = [
  {
    facility: { name: 'NorCal Approach', freq: '132.45' },
    altimeter_station: 'Sacramento',
    references: ['Auburn', 'Stockton', 'Modesto', 'Fresno', 'Chico', 'Redding', 'Marysville'],
    destinations: [
      { name: 'Sacramento Executive',        id: 'KSAC' },
      { name: 'Fresno Yosemite International', id: 'KFAT' },
      { name: 'Redding Municipal',           id: 'KRDD' },
      { name: 'Chico Municipal',             id: 'KCIC' },
      { name: 'Stockton Metropolitan',       id: 'KSCK' },
      { name: 'Beale Air Force Base',        id: 'KBAB' },
    ],
  },
  {
    facility: { name: 'Seattle Approach', freq: '120.1' },
    altimeter_station: 'Seattle',
    references: ['Olympia', 'Tacoma', 'Everett', 'Bellingham', 'Bremerton', 'Monroe'],
    destinations: [
      { name: 'Seattle Boeing Field',        id: 'KBFI' },
      { name: 'Paine Field',                 id: 'KPAE' },
      { name: 'Olympia Regional',            id: 'KOLM' },
      { name: 'Bellingham International',    id: 'KBLI' },
      { name: 'Harvey Field',                id: 'S43'  },
    ],
  },
  {
    facility: { name: 'Portland Approach', freq: '124.0' },
    altimeter_station: 'Portland',
    references: ['Salem', 'Eugene', 'Pendleton', 'Astoria', 'McMinnville', 'The Dalles'],
    destinations: [
      { name: 'Salem Airport',               id: 'KSLE' },
      { name: 'Eugene Airport',              id: 'KEUG' },
      { name: 'Medford Airport',             id: 'KMFR' },
      { name: 'Pendleton Regional',          id: 'KPDT' },
      { name: 'McMinnville Municipal',       id: 'KMMV' },
    ],
  },
  {
    facility: { name: 'Salt Lake Approach', freq: '124.3' },
    altimeter_station: 'Salt Lake',
    references: ['Provo', 'Logan', 'Ogden', 'Price', 'Vernal', 'Heber City'],
    destinations: [
      { name: 'Provo Municipal',             id: 'KPVU' },
      { name: 'Logan-Cache Airport',         id: 'KLGU' },
      { name: 'Ogden Hinckley',              id: 'KOGD' },
      { name: 'Vernal Regional',             id: 'KVEL' },
      { name: 'Spanish Fork Municipal',      id: 'U77'  },
    ],
  },
  {
    facility: { name: 'Denver Center', freq: '133.4' },
    altimeter_station: 'Denver',
    references: ['Grand Junction', 'Glenwood Springs', 'Steamboat Springs', 'Fort Collins', 'Pueblo'],
    destinations: [
      { name: 'Grand Junction Regional',     id: 'KGJT' },
      { name: 'Colorado Springs Airport',    id: 'KCOS' },
      { name: 'Fort Collins-Loveland',       id: 'KFNL' },
      { name: 'Pueblo Memorial',             id: 'KPUB' },
      { name: 'Leadville Lake County',       id: 'KLXV' },
    ],
  },
  {
    facility: { name: 'Albuquerque Center', freq: '135.3' },
    altimeter_station: 'Albuquerque',
    references: ['Santa Fe', 'Taos', 'Roswell', 'Gallup', 'Farmington', 'Ruidoso'],
    destinations: [
      { name: 'Albuquerque International Sunport', id: 'KABQ' },
      { name: 'Santa Fe Regional',           id: 'KSAF' },
      { name: 'Roswell International Air Center', id: 'KROW' },
      { name: 'Farmington Four Corners',     id: 'KFMN' },
    ],
  },
  {
    facility: { name: 'SoCal Approach', freq: '124.5' },
    altimeter_station: 'Los Angeles',
    references: ['Oceanside', 'Riverside', 'Palm Springs', 'Victorville', 'El Cajon', 'Hemet'],
    destinations: [
      { name: 'Long Beach Airport',          id: 'KLGB' },
      { name: 'John Wayne Airport',          id: 'KSNA' },
      { name: 'Palm Springs International',  id: 'KPSP' },
      { name: 'Ramona Airport',              id: 'KRNM' },
      { name: 'Hemet-Ryan Airport',          id: 'KHMT' },
    ],
  },
  {
    facility: { name: 'Houston Approach', freq: '119.0' },
    altimeter_station: 'Houston',
    references: ['Galveston', 'Conroe', 'Beaumont', 'Victoria', 'Huntsville', 'Wharton'],
    destinations: [
      { name: 'Sugar Land Regional',         id: 'KSGR' },
      { name: 'Galveston Scholes',           id: 'KGLS' },
      { name: 'Beaumont Municipal',          id: 'KBMT' },
      { name: 'Victoria Regional',           id: 'KVCT' },
      { name: 'Conroe-North Houston Regional', id: 'KCXO' },
    ],
  },
]

// Odd+500 = eastbound (0–179°), even+500 = westbound (180–359°) per 14 CFR 91.159
const VFR_ALTITUDES = [3500, 4500, 5500, 6500, 7500, 8500, 9500, 10500]

const APPROACH_DIRECTIONS = [
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
]

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

  const region      = pickRandom(REGIONS)
  const aircraft    = pickRandom(AIRCRAFT)
  const tail        = generateTailNumber()
  const destination = pickRandom(region.destinations)
  const posRef      = pickRandom(region.references)
  const posDir      = pickRandom(APPROACH_DIRECTIONS)
  const posDist     = randomInt(8, 18)
  const altitude    = pickRandom(VFR_ALTITUDES)
  const altimeter   = randomAltimeter()

  return Response.json({
    scenario_type:       'flight_following',
    facility_name:       region.facility.name,
    facility_freq:       region.facility.freq,
    altimeter_station:   region.altimeter_station,
    aircraft_type:       aircraft.type,
    callsign_display:    tail.display,
    callsign_spoken:     tail.spoken,
    destination_name:    destination.name,
    destination_id:      destination.id,
    position_reference:  posRef,
    position_direction:  posDir,
    position_distance:   posDist,
    altitude,
    altimeter,
  })
}
