// The text the voice is given for IFR clearances. Run: node scripts/test-speech-text.mjs
import { readFileSync } from 'node:fs'
import { forSpeechWith } from '../lib/speech-text.mjs'
const pron = JSON.parse(readFileSync(new URL('../lib/fix-pronunciations.json', import.meta.url), 'utf8'))
const sids = JSON.parse(readFileSync(new URL('../lib/sids.json', import.meta.url), 'utf8')).airports
let failed = 0
const check = (name, ok, detail = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : detail); if (!ok) failed++ }
const say = (t) => forSpeechWith(t, pron)
check('SID is said as the word', say('climb via the SID, expect') === 'climb via the Sid, expect')
check('MRDOC and PAVYL are respelled', say('via the PAVYL tree departure, MRDOC transition, then as filed') === 'via the pavel tree departure, murdock transition, then as filed', say('via the PAVYL tree departure, MRDOC transition, then as filed'))
check('names with no entry are left alone', forSpeechWith('via the ZZZZZ six departure, YYYYY transition, then as filed', pron) === 'via the ZZZZZ six departure, YYYYY transition, then as filed')
check('the words around them are untouched', say('November tree zero seven tango delta, cleared to dayton via the PAVYL tree departure, MRDOC transition, then as filed, climb via the SID, expect one five thousand one zero minutes after departure, departure frequency one tree five point two, squawk five two seven five').includes('departure frequency one tree five point two, squawk five two seven five'))
check('radar vector clearances are unchanged', say('cleared to Denver via radar vectors, climb and maintain eight thousand') === 'cleared to Denver via radar vectors, climb and maintain eight thousand')
const names = new Set()
for (const l of Object.values(sids)) for (const p of l) if (p.transitions.length) { names.add(p.name); p.transitions.forEach((t) => names.add(t)) }
const missing = [...names].filter((n) => !pron[n])
check(`every procedure and transition name the trainer can use has a pronunciation (${names.size})`, missing.length === 0, missing.slice(0, 10).join(', '))
check('every respelling is lower-case letters (and at most one space)', Object.values(pron).every((v) => /^[a-z]{2,12}( [a-z]{2,12})?$/.test(v)))
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS')
process.exit(failed ? 1 : 0)
