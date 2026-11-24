import { stripWindReport } from '../lib/controller-text.mjs'
const cases = [
  ['November four five two one Hotel, wind one three zero at eight, taxi via Alpha to the GA ramp.', 'November four five two one Hotel, taxi via Alpha to the GA ramp.'],
  ['November four five two one Hotel, taxi via Alpha to the GA ramp, wind calm.', 'November four five two one Hotel, taxi via Alpha to the GA ramp.'],
  ['November four five two one Hotel, runway five, taxi via Bravo, hold short runway one one.', 'November four five two one Hotel, runway five, taxi via Bravo, hold short runway one one.'],
  ['November four five two one Hotel, winds zero five zero at one zero, runway five, taxi via Alpha.', 'November four five two one Hotel, runway five, taxi via Alpha.'],
  ['Wind calm.', 'Wind calm.'],
]
let failed = 0
for (const [input, want] of cases) {
  const got = stripWindReport(input)
  const ok = got === want
  if (!ok) failed++
  console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify(got), ok ? '' : '(want ' + JSON.stringify(want) + ')')
}
console.log(failed ? failed + ' FAILED' : 'ALL PASS')
process.exit(failed ? 1 : 0)
