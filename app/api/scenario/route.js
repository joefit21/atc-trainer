import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const airports = [
  { icao: 'KATL', city: 'atlanta' },
  { icao: 'KBOS', city: 'boston' },
  { icao: 'KORD', city: 'chicago' },
  { icao: 'KDFW', city: 'dallas fort worth' },
  { icao: 'KDEN', city: 'denver' },
  { icao: 'KDTW', city: 'detroit' },
  { icao: 'KIAH', city: 'houston' },
  { icao: 'KLAX', city: 'los angeles' },
  { icao: 'KMIA', city: 'miami' },
  { icao: 'KMSP', city: 'minneapolis' },
  { icao: 'KJFK', city: 'new york kennedy' },
  { icao: 'KLGA', city: 'new york laguardia' },
  { icao: 'KEWR', city: 'newark' },
  { icao: 'KMCO', city: 'orlando' },
  { icao: 'KPHX', city: 'phoenix' },
  { icao: 'KSLC', city: 'salt lake city' },
  { icao: 'KSAN', city: 'san diego' },
  { icao: 'KSFO', city: 'san francisco' },
  { icao: 'KSEA', city: 'seattle' },
  { icao: 'KDCA', city: 'washington reagan' },
  { icao: 'KIAD', city: 'washington dulles' },
  { icao: 'KBWI', city: 'baltimore' },
  { icao: 'KLAS', city: 'las vegas' },
  { icao: 'KMDW', city: 'chicago midway' },
  { icao: 'KCLT', city: 'charlotte' },
  { icao: 'KBNA', city: 'nashville' },
  { icao: 'KHOU', city: 'houston hobby' },
  { icao: 'KMEM', city: 'memphis' },
  { icao: 'KPIT', city: 'pittsburgh' },
  { icao: 'KSTL', city: 'st louis' },
  { icao: 'KRDU', city: 'raleigh' },
  { icao: 'KBUF', city: 'buffalo' },
  { icao: 'KTUL', city: 'tulsa' },
  { icao: 'KOKC', city: 'oklahoma city' },
  { icao: 'KBHM', city: 'birmingham' },
  { icao: 'KRIC', city: 'richmond' },
  { icao: 'KJAX', city: 'jacksonville' },
  { icao: 'KAUS', city: 'austin' },
  { icao: 'KIND', city: 'indianapolis' },
  { icao: 'KCMH', city: 'columbus' },
  { icao: 'KCLE', city: 'cleveland' },
  { icao: 'KMKE', city: 'milwaukee' },
  { icao: 'KMSY', city: 'new orleans' },
  { icao: 'KGRR', city: 'grand rapids' },
  { icao: 'KFAT', city: 'fresno' },
  { icao: 'KOMA', city: 'omaha' },
  { icao: 'KELP', city: 'el paso' },
  { icao: 'KPVD', city: 'providence' },
  { icao: 'KGSO', city: 'greensboro' },
  { icao: 'KDAY', city: 'dayton' },
  { icao: 'KLEX', city: 'lexington' },
  { icao: 'KTYS', city: 'knoxville' },
  { icao: 'KMSN', city: 'madison' },
  { icao: 'KTEB', city: 'teterboro' },
  { icao: 'KPWM', city: 'portland' },
  { icao: 'KBTV', city: 'burlington' },
  { icao: 'KFRG', city: 'farmingdale' },
  { icao: 'KHPN', city: 'white plains' },
  { icao: 'KVNY', city: 'van nuys' },
  { icao: 'KSMO', city: 'santa monica' },
  { icao: 'KBDR', city: 'bridgeport' },
  { icao: 'KHWD', city: 'hayward' },
  { icao: 'KPAO', city: 'palo alto' },
  { icao: 'KCCR', city: 'concord' },
  { icao: 'KMYF', city: 'san diego montgomery' },
  { icao: 'KSAT', city: 'san antonio' },
  { icao: 'KABQ', city: 'albuquerque' },
  { icao: 'KTPA', city: 'tampa' },
  { icao: 'KRSW', city: 'fort myers' },
  { icao: 'KPBI', city: 'west palm beach' },
  { icao: 'KBDL', city: 'hartford' },
  { icao: 'KMCI', city: 'kansas city' },
  { icao: 'KDSM', city: 'des moines' },
  { icao: 'KLIT', city: 'little rock' },
  { icao: 'KBOI', city: 'boise' },
  { icao: 'KCOS', city: 'colorado springs' },
  { icao: 'KFSD', city: 'sioux falls' },
]

const airlines = [
  { name: 'Delta', spoken: 'delta' },
  { name: 'United', spoken: 'united' },
  { name: 'American', spoken: 'american' },
  { name: 'Southwest', spoken: 'southwest' },
  { name: 'JetBlue', spoken: 'jetblue' },
  { name: 'Spirit', spoken: 'spirit' },
  { name: 'Frontier', spoken: 'frontier' },
  { name: 'Alaska', spoken: 'alaska' },
  { name: 'Hawaiian', spoken: 'hawaiian' },
  { name: 'Allegiant', spoken: 'allegiant' },
]

const phonetic = {
  A:'alpha',B:'bravo',C:'charlie',D:'delta',E:'echo',F:'foxtrot',
  G:'golf',H:'hotel',I:'india',J:'juliet',K:'kilo',L:'lima',M:'mike',
  N:'november',O:'oscar',P:'papa',Q:'quebec',R:'romeo',S:'sierra',
  T:'tango',U:'uniform',V:'victor',W:'whiskey',X:'xray',Y:'yankee',Z:'zulu'
}

const digitWords = ['zero','one','two','tree','four','five','six','seven','eight','niner']

const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
const ones = ['','one','two','three','four','five','six','seven','eight','nine']

function twoDigitSpoken(n) {
  if (n < 10) return ones[n]
  if (n < 20) return teens[n - 10]
  return tens[Math.floor(n/10)] + (n % 10 ? ' ' + ones[n % 10] : '')
}

function flightNumSpoken(n) {
  const s = n.toString()
  if (s.length === 2) return twoDigitSpoken(n)
  if (s.length === 3) return `${digitWords[parseInt(s[0])]} ${twoDigitSpoken(parseInt(s.slice(1)))}`
  if (s.length === 4) return `${twoDigitSpoken(parseInt(s.slice(0,2)))} ${twoDigitSpoken(parseInt(s.slice(2)))}`
  return s
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickTwoDifferent(arr) {
  const first = pickRandom(arr)
  let second
  do { second = pickRandom(arr) } while (second.icao === first.icao)
  return [first, second]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function generateSquawk() {
  const reserved = ['7500','7600','7700','1200','7000','2000','1202','1255','1277','4000','0000']
  let squawk
  do {
    squawk = Array.from({length: 4}, () => randomInt(0, 7)).join('')
  } while (reserved.includes(squawk))
  return squawk
}

function generateFrequency() {
  const reserved = [
    '121.5','122.0','122.1','122.2','122.3','122.4','122.5',
    '122.6','122.7','122.8','122.9','123.0','123.1','123.3',
    '123.4','123.5'
  ]
  let freq
  do {
    const safeWhole = pickRandom([118,119,120,121,124,125,126,127,128,133,134,135])
    const safeDec = randomInt(1, 9)
    freq = `${safeWhole}.${safeDec}`
  } while (
    reserved.includes(freq) ||
    (parseFloat(freq) >= 128.825 && parseFloat(freq) <= 132.0)
  )
  return freq
}

function generateCallsign(forceAirline = null) {
  const isAirline = forceAirline !== null ? forceAirline : Math.random() > 0.5
  if (isAirline) {
    const airline = pickRandom(airlines)
    const numDigits = pickRandom([2, 3, 4])
    const flightNum = numDigits === 2 ? randomInt(10, 99) : numDigits === 3 ? randomInt(100, 999) : randomInt(1000, 9999)
    return {
      display: `${airline.name} ${flightNum}`,
      spoken: `${airline.spoken} ${flightNumSpoken(flightNum)}`,
      isAirline: true
    }
  } else {
    const digits = Array.from({length: 3}, () => randomInt(0, 9))
    const letters = Array.from({length: 2}, () => String.fromCharCode(65 + randomInt(0, 25)))
    return {
      display: `N${digits.join('')}${letters.join('')}`,
      spoken: `november ${digits.map(d => digitWords[d]).join(' ')} ${letters.map(l => phonetic[l]).join(' ')}`,
      isAirline: false
    }
  }
}

function altitudeToWords(alt) {
  const t = alt / 1000
  const tStr = t >= 10 ? t.toString().split('').join(' ') : t.toString()
  return `${tStr} thousand`
}

function flightLevelToWords(fl) {
  return `flight level ${fl.toString().split('').map(d => digitWords[parseInt(d)]).join(' ')}`
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'ground'

    if (type === 'ground') {
      const airport = pickRandom(airports)
      const callsign = generateCallsign()

      const prompt = `Generate a realistic US ground control taxi clearance for ${airport.icao} (${airport.city}).

Use this exact callsign in spoken form: "${callsign.spoken}"

RUNWAY RULES:
- Speak each digit individually: 16L = "one six left", 27R = "two seven right", 9 = "niner"
- No leading zeros: 04L = "four left"
- L = "left", R = "right", C = "center"
- Only use L/R/C designators about 1 in 6 scenarios
- If a secondary runway is mentioned always say "cross runway" or "hold short of runway" before it

CLEARANCE FORMAT: "${callsign.spoken}, ${airport.city} ground, runway [digits], taxi via [taxiways], [hold short or cross instruction if needed]"

Return raw JSON only, no markdown:
{"clearance_text":"the full spoken clearance here"}`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })

      const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(rawText)

      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1', voice: 'onyx', input: parsed.clearance_text, speed: 1.1
      })

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
      const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`

      return Response.json({
        callsign: callsign.display,
        airport: airport.icao,
        destination: null,
        clearance_text: parsed.clearance_text,
        audio_url: audioUrl
      })

    } else {
      const [departure, destination] = pickTwoDifferent(airports)
      const callsign = generateCallsign()
      const initialAlt = randomInt(8, 12) * 1000
      const expectAlt = callsign.isAirline
        ? randomInt(18, 39) * 1000
        : (initialAlt + randomInt(3, 8) * 1000)
      const freq = generateFrequency()
      const squawk = generateSquawk()

      const squawkWords = squawk.split('').map(d => digitWords[parseInt(d)]).join(' ')
      const [freqWhole, freqDec] = freq.split('.')
      const freqWords = `${freqWhole.split('').map(d => digitWords[parseInt(d)]).join(' ')} point ${freqDec.split('').map(d => digitWords[parseInt(d)]).join(' ')}`
      const initialAltWords = altitudeToWords(initialAlt)
      const expectAltWords = (callsign.isAirline || expectAlt >= 18000)
        ? flightLevelToWords(Math.floor(expectAlt / 100))
        : altitudeToWords(expectAlt)

      const prompt = `Generate a realistic IFR clearance delivery from ${departure.icao} (${departure.city}) to ${destination.icao} (${destination.city}).

Use this exact callsign in spoken form: "${callsign.spoken}"

ROUTE: Include a realistic published departure procedure (DP) name for ${departure.icao}, then "as filed".

Use these exact values in the clearance:
- Initial altitude: ${initialAltWords}
- Expect altitude: ${expectAltWords} one zero minutes after departure
- Departure frequency: ${freqWords}
- Squawk: ${squawkWords}

CLEARANCE FORMAT: "${callsign.spoken}, cleared to ${destination.city} via the [DP name], then as filed, climb and maintain ${initialAltWords}, expect ${expectAltWords} one zero minutes after departure, departure frequency ${freqWords}, squawk ${squawkWords}"

Return raw JSON only, no markdown:
{"clearance_text":"the full spoken clearance here"}`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })

      const rawText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(rawText)

      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1', voice: 'onyx', input: parsed.clearance_text, speed: 1.1
      })

      const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
      const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`

      return Response.json({
        callsign: callsign.display,
        airport: departure.icao,
        destination: `${destination.icao} - ${destination.city.charAt(0).toUpperCase() + destination.city.slice(1)}`,
        clearance_text: parsed.clearance_text,
        audio_url: audioUrl
      })
    }

  } catch (error) {
    console.error('Scenario API error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
