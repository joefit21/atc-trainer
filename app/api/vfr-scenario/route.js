import { requireSubscribed } from '@/lib/require-auth'

// runways: array of { rwy, pattern } — verified against airnav.com FAA data
const UNCONTROLLED_AIRPORTS = [
  { id: 'KAUN', name: 'Auburn',        state: 'CA', ctaf: '122.8', runways: [{ rwy: '7',  pattern: 'left'  }, { rwy: '25', pattern: 'left'  }] },
  { id: 'KUKI', name: 'Ukiah',         state: 'CA', ctaf: '123.0', runways: [{ rwy: '15', pattern: 'left'  }, { rwy: '33', pattern: 'right' }] },
  { id: 'KFOT', name: 'Rohnerville',   state: 'CA', ctaf: '122.8', runways: [{ rwy: '11', pattern: 'right' }, { rwy: '29', pattern: 'left'  }] },
  { id: 'KBKE', name: 'Baker City',    state: 'OR', ctaf: '122.8', runways: [{ rwy: '13', pattern: 'left'  }, { rwy: '31', pattern: 'left'  }, { rwy: '17', pattern: 'left' }, { rwy: '35', pattern: 'left' }] },
  { id: 'KORS', name: 'Orcas Island',  state: 'WA', ctaf: '122.8', runways: [{ rwy: '16', pattern: 'left'  }, { rwy: '34', pattern: 'right' }] },
  { id: 'KFHR', name: 'Friday Harbor', state: 'WA', ctaf: '122.8', runways: [{ rwy: '16', pattern: 'right' }, { rwy: '34', pattern: 'right' }] },
  { id: 'KTMK', name: 'Tillamook',     state: 'OR', ctaf: '122.8', runways: [{ rwy: '13', pattern: 'left'  }, { rwy: '31', pattern: 'left'  }, { rwy: '1',  pattern: 'left' }, { rwy: '19', pattern: 'right' }] },
  { id: 'KSVH', name: 'Statesville',   state: 'NC', ctaf: '122.8', runways: [{ rwy: '10', pattern: 'left'  }, { rwy: '28', pattern: 'left'  }] },
  { id: 'KRUQ', name: 'Rowan County',  state: 'NC', ctaf: '122.8', runways: [{ rwy: '2',  pattern: 'left'  }, { rwy: '20', pattern: 'left'  }] },
  { id: 'KDLZ', name: 'Delaware',      state: 'OH', ctaf: '122.8', runways: [{ rwy: '10', pattern: 'left'  }, { rwy: '28', pattern: 'left'  }] },
]

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
  const rwyObj      = pickRandom(airport.runways)
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
      situation: `You are 10 miles ${approachDir} of ${airport.name} at ${approachAlt.toLocaleString()} ft MSL, inbound for landing. Runway in use is ${runway}, ${pattern} traffic. CTAF is ${airport.ctaf}.`,
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
    runway,
    pattern,
    aircraft_type:    aircraft.type,
    callsign_display: tail.display,
    callsign_spoken:  tail.spoken,
    approach_direction: approachDir,
    steps,
  })
}
