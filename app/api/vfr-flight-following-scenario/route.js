const FACILITIES = [
  { name: 'NorCal Approach',      freq: '132.45' },
  { name: 'Seattle Approach',     freq: '120.1'  },
  { name: 'Denver Center',        freq: '133.4'  },
  { name: 'SoCal Approach',       freq: '124.5'  },
  { name: 'Salt Lake Approach',   freq: '124.3'  },
  { name: 'Portland Approach',    freq: '124.0'  },
  { name: 'Albuquerque Center',   freq: '135.3'  },
  { name: 'Houston Approach',     freq: '119.0'  },
]

const POSITION_REFERENCES = [
  'Auburn', 'Redding', 'Medford', 'Eugene', 'Yakima',
  'Provo', 'Logan', 'Elko', 'Grand Junction', 'Flagstaff',
  'Bend', 'Twin Falls', 'Pendleton', 'Chico', 'Fresno',
]

const DESTINATIONS = [
  { name: 'Sacramento Executive',      id: 'KSAC' },
  { name: 'Portland International',    id: 'KPDX' },
  { name: 'Seattle Boeing Field',      id: 'KBFI' },
  { name: 'Salt Lake City International', id: 'KSLC' },
  { name: 'Reno-Tahoe International',  id: 'KRNO' },
  { name: 'Eugene Airport',            id: 'KEUG' },
  { name: 'Boise Airport',             id: 'KBOI' },
  { name: 'Spokane International',     id: 'KGEG' },
  { name: 'Colorado Springs Airport',  id: 'KCOS' },
  { name: 'Albuquerque International', id: 'KABQ' },
  { name: 'Medford Airport',           id: 'KMFR' },
  { name: 'Yakima Air Terminal',       id: 'KYKM' },
]

// VFR hemispheric cruising altitudes
const VFR_ALTITUDES = [3500, 4500, 5500, 6500, 7500, 8500, 9500]

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

export async function GET() {
  const facility   = pickRandom(FACILITIES)
  const aircraft   = pickRandom(AIRCRAFT)
  const tail       = generateTailNumber()
  const destination = pickRandom(DESTINATIONS)
  const posRef     = pickRandom(POSITION_REFERENCES)
  const posDir     = pickRandom(APPROACH_DIRECTIONS)
  const posDist    = randomInt(8, 18)
  const altitude   = pickRandom(VFR_ALTITUDES)
  const altimeter  = randomAltimeter()

  return Response.json({
    scenario_type:      'flight_following',
    facility_name:      facility.name,
    facility_freq:      facility.freq,
    aircraft_type:      aircraft.type,
    callsign_display:   tail.display,
    callsign_spoken:    tail.spoken,
    destination_name:   destination.name,
    destination_id:     destination.id,
    position_reference: posRef,
    position_direction: posDir,
    position_distance:  posDist,
    altitude,
    altimeter,
  })
}
