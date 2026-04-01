// Verified Class D airports — tower/ground/departure freqs and runway patterns from airnav.com
const CLASS_D_AIRPORTS = [
  {
    id: 'KRDM', name: 'Redmond', state: 'OR',
    tower: '124.5', ground: '121.8', departure: '125.8',
    runways: [
      { rwy: '5',  pattern: 'left' },
      { rwy: '23', pattern: 'left' },
      { rwy: '11', pattern: 'left' },
      { rwy: '29', pattern: 'left' },
    ],
  },
  {
    id: 'KPAO', name: 'Palo Alto', state: 'CA',
    tower: '118.6', ground: '125.0', departure: '132.8',
    runways: [
      { rwy: '13', pattern: 'left'  },
      { rwy: '31', pattern: 'right' },
    ],
  },
  {
    id: 'KSLE', name: 'Salem', state: 'OR',
    tower: '119.1', ground: '121.9', departure: '125.8',
    runways: [
      { rwy: '13', pattern: 'left' },
      { rwy: '31', pattern: 'left' },
      { rwy: '16', pattern: 'left' },
      { rwy: '34', pattern: 'left' },
    ],
  },
  {
    id: 'KOTH', name: 'North Bend', state: 'OR',
    tower: '118.45', ground: '127.1', departure: '127.55',
    runways: [
      { rwy: '5',  pattern: 'left'  },
      { rwy: '23', pattern: 'left'  },
      { rwy: '13', pattern: 'left'  },
      { rwy: '31', pattern: 'right' },
    ],
  },
]

const AIRCRAFT = [
  { type: 'Cessna 172',         spoken: 'Cessna one seven two' },
  { type: 'Cessna 182',         spoken: 'Cessna one eight two' },
  { type: 'Piper Cherokee',     spoken: 'Piper Cherokee' },
  { type: 'Piper Archer',       spoken: 'Piper Archer' },
  { type: 'Beechcraft Bonanza', spoken: 'Beechcraft Bonanza' },
  { type: 'Cirrus SR22',        spoken: 'Cirrus S R twenty two' },
]

const POSITIONS = [
  'the transient ramp',
  'the general aviation ramp',
  'the FBO ramp',
  'the south ramp',
  'the west ramp',
]

const SKY_CONDITIONS = [
  'clear',
  'few clouds at 2,500',
  'few clouds at 3,500',
  'scattered at 4,500',
]

const ATIS_LETTERS = [
  { letter: 'Alpha',   phonetic: 'alpha'   },
  { letter: 'Bravo',   phonetic: 'bravo'   },
  { letter: 'Charlie', phonetic: 'charlie' },
  { letter: 'Delta',   phonetic: 'delta'   },
  { letter: 'Echo',    phonetic: 'echo'    },
  { letter: 'Foxtrot', phonetic: 'foxtrot' },
  { letter: 'Golf',    phonetic: 'golf'    },
  { letter: 'Hotel',   phonetic: 'hotel'   },
]

const PHONETIC = {
  A:'alpha',B:'bravo',C:'charlie',D:'delta',E:'echo',F:'foxtrot',
  G:'golf',H:'hotel',I:'india',J:'juliet',K:'kilo',L:'lima',M:'mike',
  N:'november',O:'oscar',P:'papa',Q:'quebec',R:'romeo',S:'sierra',
  T:'tango',U:'uniform',V:'victor',W:'whiskey',X:'xray',Y:'yankee',Z:'zulu'
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

function randomWind() {
  const dir   = (randomInt(0, 35) * 10).toString().padStart(3, '0')
  const speed = randomInt(0, 14)
  return { dir, speed }
}

export async function GET() {
  const airport  = pickRandom(CLASS_D_AIRPORTS)
  const rwyObj   = pickRandom(airport.runways)
  const aircraft = pickRandom(AIRCRAFT)
  const tail     = generateTailNumber()
  const atis     = pickRandom(ATIS_LETTERS)
  const wind     = randomWind()
  const sky      = pickRandom(SKY_CONDITIONS)
  const altimeter = randomAltimeter()
  const position = pickRandom(POSITIONS)

  return Response.json({
    scenario_type:    'classd_departure',
    airport_id:       airport.id,
    airport_name:     airport.name,
    state:            airport.state,
    tower_freq:       airport.tower,
    ground_freq:      airport.ground,
    departure_freq:   airport.departure,
    runway:           rwyObj.rwy,
    pattern:          rwyObj.pattern,
    aircraft_type:    aircraft.type,
    callsign_display: tail.display,
    callsign_spoken:  tail.spoken,
    position,
    atis: {
      letter:    atis.letter,
      phonetic:  atis.phonetic,
      wind_dir:  wind.dir,
      wind_speed: wind.speed,
      visibility: '10',
      sky,
      altimeter,
      active_runway: rwyObj.rwy,
    },
  })
}
