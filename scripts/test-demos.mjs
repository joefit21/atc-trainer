// Tests the fixed sample clearances. Run: node scripts/test-demos.mjs
import { readFileSync } from 'node:fs'
import { IFR_DEMO, IFR_LANDING, GROUND } from '../lib/demo-clearances.mjs'
import { magneticCourse, isEastbound } from '../lib/altitudes.mjs'

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'))
const sids = read('../lib/sids.json').airports
const coords = read('../lib/airport-coords.json').airports
let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }

const W = { zero: 0, one: 1, two: 2, tree: 3, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, niner: 9, nine: 9 }
const digits = (words) => words.trim().split(/\s+/).map((w) => W[w.toLowerCase()]).join('')

function parse(c) {
  const t = c.clearance_text
  const sid = t.match(/via the ([A-Z]{3,5}) (\w+) departure(?:, ([A-Z]{5}) transition)?, then as filed/)
  const alt = t.match(/[Cc]limb and maintain ((?:\w+ )+?)thousand, expect (flight level )?((?:\w+ )+?)(?:thousand )?one zero minutes after departure/)
  const via = t.match(/[Cc]limb via the SID, expect (flight level )?((?:\w+ )+?)(?:thousand )?one zero minutes after departure/)
  if (via) return {
    sid: sid && { name: sid[1], number: Number(digits(sid[2])), transition: sid[3] || null },
    climbVia: true, climb: 'via the SID', expectIsFL: !!via[1],
    expect: via[1] ? Number(digits(via[2])) : Number(digits(via[2])) * 1000,
    freq: (() => { const f = t.match(/[Dd]eparture frequency ((?:\w+ )+?)point ((?:\w+ ?)+?),/); return f && `${digits(f[1])}.${digits(f[2])}` })(),
    squawk: (() => { const q = t.match(/squawk ((?:\w+ ?)+?)\.$/); return q && digits(q[1]) })(),
  }
  return {
    sid: sid && { name: sid[1], number: Number(digits(sid[2])), transition: sid[3] || null },
    climb: alt && Number(digits(alt[1])) * 1000,
    expectIsFL: !!(alt && alt[2]),
    expect: alt && (alt[2] ? Number(digits(alt[3])) : Number(digits(alt[3])) * 1000),
    freq: (() => { const f = t.match(/[Dd]eparture frequency ((?:\w+ )+?)point ((?:\w+ ?)+?),/); return f && `${digits(f[1])}.${digits(f[2])}` })(),
    squawk: (() => { const q = t.match(/squawk ((?:\w+ ?)+?)\.$/); return q && digits(q[1]) })(),
  }
}
const dep = (c) => c.airport.slice(0, 4), dest = (c) => c.destination.slice(0, 4)

for (const [label, c] of [['lab IFR demo', IFR_DEMO], ['home-page IFR sample', IFR_LANDING]]) {
  const p = parse(c)
  check(`${label}: clearance text parses`, p.sid && p.climb && p.expect && p.freq && p.squawk, JSON.stringify(p))
  const real = (sids[dep(c)] || []).find((x) => x.name === p.sid?.name && x.number === p.sid?.number)
  check(`${label}: SID ${p.sid?.name} ${p.sid?.number} is a real departure from ${dep(c)}`, !!real)
  check(`${label}: the departure names a transition before "then as filed"`, !!p.sid?.transition)
  if (p.sid?.transition) check(`${label}: transition ${p.sid.transition} is real for that SID`, real?.transitions.includes(p.sid.transition))
  // The breakdown must say exactly what the clearance says.
  const cr = c.craft
  const fmt = (n) => n.toLocaleString('en-US')
  check(`${label}: breakdown route matches (SID, number, transition)`, cr.route === `${p.sid.name} ${p.sid.number === 9 ? 'Niner' : ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][p.sid.number]} departure${p.sid.transition ? `, ${p.sid.transition} transition` : ''}, then as filed`, cr.route)
  check(`${label}: breakdown frequency and transponder match`, cr.frequency === p.freq && cr.transponder === p.squawk, `${cr.frequency}/${p.freq} ${cr.transponder}/${p.squawk}`)
  const expectText = p.expectIsFL ? `FL${p.expect}` : fmt(p.expect)
  const climbText = p.climbVia ? 'Climb via the SID' : `Climb/maintain ${fmt(p.climb)}`
  check(`${label}: breakdown altitude matches`, cr.altitude.startsWith(`${climbText} · Expect ${expectText}`), `${cr.altitude} vs ${p.climb}/${p.expect}`)
  // RULE: "climb via the SID" exactly when the procedure has the altitude restrictions for it, and the expect altitude is above its top altitude.
  check(`${label}: climb via the SID is used exactly when the procedure is eligible`, !!p.climbVia === !!real?.climbVia, `clearance climbVia=${!!p.climbVia}, data climbVia=${!!real?.climbVia}`)
  if (p.climbVia) check(`${label}: expect altitude is above the procedure's top altitude`, p.expect * (p.expectIsFL ? 100 : 1) > (real?.topAlt || 0), `${p.expect} vs ${real?.topAlt}`)
  check(`${label}: breakdown clearance limit appears in the clearance`, c.clearance_text.includes(cr.limit), cr.limit)
  // RULE: the expect altitude follows the direction of flight (odd thousands eastbound, even westbound).
  const eastbound = isEastbound(magneticCourse(coords[dep(c)], coords[dest(c)]))
  check(`${label}: the expect altitude follows the odd-east / even-west rule`, (Math.round((p.expectIsFL ? p.expect * 100 : p.expect) / 1000) % 2 === 1) === eastbound, `${p.expect} ${eastbound ? 'eastbound' : 'westbound'}`)
}

// The home-page sample is an airline flight: its flight level follows the hemispheric rule.
const L = parse(IFR_LANDING)
const east = isEastbound(magneticCourse(coords[dep(IFR_LANDING)], coords[dest(IFR_LANDING)]))
check('home-page sample: flight level is FL300-FL410 and odd eastbound / even westbound',
  L.expectIsFL && L.expect >= 300 && L.expect <= 410 && ((L.expect / 10) % 2 === 1) === east, `FL${L.expect} ${east ? 'eastbound' : 'westbound'}`)
check('home-page sample: a real departure heading the right way (PLAIN exits east, ORD is east of DEN)', east)

// The two IFR clearances are genuinely different.
check('RULE: home-page IFR sample differs from the lab IFR demo (airports, callsign, SID, text)',
  dep(IFR_LANDING) !== dep(IFR_DEMO) && dest(IFR_LANDING) !== dest(IFR_DEMO) && IFR_LANDING.callsign !== IFR_DEMO.callsign
  && parse(IFR_LANDING).sid.name !== parse(IFR_DEMO).sid.name && IFR_LANDING.clearance_text !== IFR_DEMO.clearance_text)

// The ground sample.
check('ground sample is at Salem and not at Redmond', /Salem/.test(GROUND.clearance_text) && !/Redmond/.test(GROUND.clearance_text))

// The page uses no hard-coded breakdown.
const page = readFileSync(new URL('../app/page.js', import.meta.url), 'utf8')
check('home page has no hard-coded breakdown (no PODDE, no fixed squawk)', !/PODDE|4532|2064/.test(page))
check('home page asks for the landing IFR sample', /for=landing/.test(page))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
