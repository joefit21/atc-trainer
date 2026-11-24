// Tests the arrival scoring rules (no API calls). Run: node scripts/test-arrival-scoring.mjs
import { scoreExchange, summarize, spokenDigits, hasRunwayNumber, hasReportPoint, hasEntry, callsignIsAbsent, modelKeys } from '../lib/arrival-scoring.mjs'

let failed = 0
const check = (name, cond, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, cond ? '' : extra); if (!cond) failed++ }
const all = (phase, over = {}) => Object.fromEntries([...modelKeys(phase), 'callsign'].map((k) => [k, true]).map(([k, v]) => [k, k in over ? over[k] : v]))
const sc = (phase, over, said = 'something') => scoreExchange(phase, all(phase, over), said)

// The screenshot case: "Left downwind 13, report midfield, 4521H." for N4521H.
const said = 'Left downwind 13, report midfield, 4521H.'
const ctrl = 'November four five two one Hotel, Palo Alto Tower, enter left downwind runway one three, report midfield.'
check('screenshot case: callsign is found (digits + H)', !callsignIsAbsent(said, 'November four five two one Hotel', 'N4521H'))
check('screenshot case: runway 13 is found without the word "runway"', hasRunwayNumber(said, '13', 'N4521H'))
check('screenshot case: entry matches the controller', hasEntry(said, ctrl))
check('screenshot case: reporting point matches the controller', hasReportPoint(said, ctrl))
check('screenshot case: a call with every element scores 100, with no complaint', (() => { const r = sc('pattern_readback', {}); return r.score === 100 && r.key_issue === null })())

// Score is always consistent with what is missing.
check('nothing missing = 100 and no key issue (every phase)', Object.keys({ initial_call: 1, pattern_readback: 1, position_report: 1, landing_readback: 1, clear_runway_to_ground: 1, ground_taxi_readback: 1 }).every((p) => { const r = sc(p, {}); return r.score === 100 && !r.key_issue && r.missing.length === 0 }))
check('one significant element missing = 70 (runway number)', sc('pattern_readback', { runway: false }).score === 70)
check('one minor element missing = 85 (ATIS letter)', sc('initial_call', { atis: false }).score === 85)
check('missing intention to land = 70', sc('initial_call', { intent: false }).score === 70)
check('missing callsign = 82, the old cap', sc('pattern_readback', { callsign: false }).score === 82)
check('missing callsign plus runway = 52 (the cap never raises a score)', sc('pattern_readback', { callsign: false, runway: false }).score === 52)
check('"clear of the runway" with no number = 60, the old maximum', sc('clear_runway_to_ground', { clear_runway: false }).score === 60)
check('two significant elements missing = below 60', sc('pattern_readback', { runway: false, entry: false }).score < 60)
check('no call recorded = 0', scoreExchange('initial_call', {}, '').score === 0)
check('feedback names exactly what is missing and nothing else', (() => { const r = sc('pattern_readback', { runway: false }); return /runway number/.test(r.feedback) && !/callsign|midfield|entry/i.test(r.feedback) && /runway number/.test(r.key_issue) })())
check('feedback never mentions wind or callsign position', Object.keys({ initial_call: 1, pattern_readback: 1, position_report: 1, landing_readback: 1, clear_runway_to_ground: 1, ground_taxi_readback: 1 }).every((p) => { const keys = [...modelKeys(p), 'callsign']; const r = scoreExchange(p, Object.fromEntries(keys.map((k) => [k, false])), 'x'); return !/\bwind\b|beginning|end of/i.test(r.feedback) }))
check('every score is a whole number from 0 to 100 for every combination of missing elements', (() => {
  for (const p of ['initial_call', 'pattern_readback', 'position_report', 'landing_readback', 'clear_runway_to_ground', 'ground_taxi_readback']) {
    const keys = [...modelKeys(p), 'callsign']
    for (let m = 0; m < 1 << keys.length; m++) { const present = Object.fromEntries(keys.map((k, i) => [k, !!(m & (1 << i))])); const r = scoreExchange(p, present, 'x'); if (!Number.isInteger(r.score) || r.score < 0 || r.score > 100) return false; if (m === (1 << keys.length) - 1 && r.score !== 100) return false }
  }
  return true })())

// Digit reading.
check('"one three", "thirteen", "13", "1-3" all read as 13', ['one three', 'thirteen', '13', '1-3', 'runway wun tree'].slice(0, 4).every((t) => spokenDigits(t) === '13'), ['one three', 'thirteen', '13', '1-3'].map((t) => spokenDigits(t)).join())
check('"tree one" is 31, "niner" is 9', spokenDigits('tree one') === '31' && spokenDigits('niner') === '9')
check('a callsign with 13 in it does not count as the runway', !hasRunwayNumber('left downwind, report midfield, 4513H', '13', 'N4513H'))
check('merged digits ("runway 134521") still find runway 13', hasRunwayNumber('left downwind runway 134521', '13', 'N4521H'))
check('callsign absent when nothing matches', callsignIsAbsent('Left downwind runway 13, report midfield', 'November four five two one Hotel', 'N4521H'))
check('three-mile final reporting point', hasReportPoint('straight in 13 report three mile final', 'Cleared straight in runway one three, report three-mile final.') && hasEntry('straight in 13', 'Cleared straight in runway one three, report three-mile final.'))
check('wrong entry is not rescued', !hasEntry('right downwind 13', ctrl))

// Overall.
const s1 = summarize([{ score: 100, missing: [] }, { score: 70, missing: ['the runway number'] }, { score: 100, missing: [] }])
check('overall = average, summary says how many were clean', s1.overall_score === 90 && /2 of 3 calls were clean/.test(s1.summary) && /runway number/.test(s1.summary), JSON.stringify(s1))
check('all clean = 100 and a clean summary', (() => { const r = summarize([{ score: 100, missing: [] }, { score: 100, missing: [] }]); return r.overall_score === 100 && /^Clean arrival/.test(r.summary) })())
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
