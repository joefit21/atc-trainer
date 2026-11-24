import { requireSubscribed } from '@/lib/require-auth'
import ctafData from '@/lib/ctaf-airports.json'
import { pickRunwayForWind } from '@/lib/classd.mjs'

// Public, non-towered airports with one published CTAF frequency and plain-numbered paved runways,
// built from the FAA's NASR data by scripts/build-ctaf-airports.mjs (CTAF frequency, runways and
// traffic-pattern direction all come from there).
const UNCONTROLLED_AIRPORTS = ctafData.airports

const AIRCRAFT = [
  { type: 'Cessna 172',         spoken: 'Cessna one seven two' },
  { type: 'Cessna 182',         spoken: 'Cessna one eight two' },
  { type: 'Piper Cherokee',     spoken: 'Piper Cherokee' },
  { type: 'Piper Archer',       spoken: 'Piper Archer' },
  { type: 'Beechcraft Bonanza', spoken: 'Beechcraft Bonanza' },
  { type: 'Cirrus SR22',        spoken: 'Cirrus S R twenty two' },
]

const PHONETIC = {
  A:'alpha',B:'bravo',C:'charlie',D:'delta',E:'echo',F:'foxtrot',
  G:'golf',H:'hotel',I:'india',J:'juliet',K:'kilo',L:'lima',M:'mike',
  N:'november',O:'oscar',P:'papa',Q:'quebec',R:'romeo',S:'sierra',
  T:'tango',U:'uniform',V:'victor',W:'whiskey',X:'xray',Y:'yankee',Z:'zulu'
}

const DIGIT_WORDS = ['zero','one','two','three','four','five','six','seven','eight','niner']

const APPROACH_DIRECTIONS = ['north','south','east','west','northeast','northwest','southeast','southwest']

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateTailNumber() {
  const digits = Array.from({ length: 3 }, () => randomInt(0, 9))
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + randomInt(0, 25)))
  return {
    display: `N${digits.join('')}${letters.join('')}`,
    spoken: `November ${digits.map(d => DIGIT_WORDS[d]).join(' ')} ${letters.map(l => PHONETIC[l]).join(' ')}`
  }
}

export async function GET(request) {
  const { authError } = await requireSubscribed(request)
  if (authError) return authError

  const airport     = pickRandom(UNCONTROLLED_AIRPORTS)
  // The runway in use follows the wind, so nobody is sent to land with a tailwind. At a non-towered
  // airport the pilot gets the wind from the AWOS or the windsock, so it is stated in the first step.
  const windDir     = randomInt(0, 35) * 10
  const windSpeed   = randomInt(0, 14)
  const rwyObj      = pickRunwayForWind(airport.runways, windDir, windSpeed)
  const windText    = windSpeed < 3 ? 'Wind is calm.' : `Wind is ${String(windDir).padStart(3, '0')} at ${windSpeed} knots.`
  const runway      = rwyObj.rwy
  const pattern     = rwyObj.pattern
  const aircraft    = pickRandom(AIRCRAFT)
  const tail        = generateTailNumber()
  const approachDir = pickRandom(APPROACH_DIRECTIONS)
  const approachAlt = randomInt(28, 42) * 100 + 3000

  const steps = [
    {
      index: 0,
      phase: 'inbound_10',
      situation: `You are 10 miles ${approachDir} of ${airport.name} at ${approachAlt.toLocaleString()} ft MSL, inbound for landing. Runway in use is ${runway}, ${pattern} traffic. ${windText} CTAF is ${airport.ctaf}.`,
      hint: `Say: "${airport.name} traffic", callsign, distance and direction from field, intentions, and runway number.`,
    },
    {
      index: 1,
      phase: 'entering_45',
      situation: `You are entering the 45° to the ${pattern} downwind for Runway ${runway} at ${airport.name}.`,
      hint: `Say: "${airport.name} traffic", callsign, "entering 45" or "45 for the ${pattern} downwind", runway, and "${airport.name}".`,
    },
    {
      index: 2,
      phase: 'base',
      situation: `You are turning ${pattern} base for Runway ${runway} at ${airport.name}.`,
      hint: `Say: "${airport.name} traffic", callsign, "${pattern} base, runway ${runway}", and "${airport.name}".`,
    },
    {
      index: 3,
      phase: 'final',
      situation: `You are turning final for Runway ${runway} at ${airport.name}, full stop.`,
      hint: `Say: "${airport.name} traffic", callsign, "final, runway ${runway}", full stop, and "${airport.name}".`,
    },
    {
      index: 4,
      phase: 'clear_runway',
      situation: `You have landed and are clear of Runway ${runway} at ${airport.name}.`,
      hint: `Say: "${airport.name} traffic", callsign, "clear of runway ${runway}", and "${airport.name}".`,
    },
  ]

  return Response.json({
    scenario_type:    'ctaf',
    airport_id:       airport.id,
    airport_name:     airport.name,
    airport_state:    airport.state,
    ctaf:             airport.ctaf,
    wind_dir:         String(windDir).padStart(3, '0'),
    wind_speed:       windSpeed,
    runway,
    pattern,
    aircraft_type:    aircraft.type,
    callsign_display: tail.display,
    callsign_spoken:  tail.spoken,
    approach_direction: approachDir,
    steps,
  })
}
