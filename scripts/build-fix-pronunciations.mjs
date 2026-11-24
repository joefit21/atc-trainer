// Builds lib/fix-pronunciations.json: how a controller says each departure procedure and transition name,
// written so the text-to-speech voice reads it as a word instead of spelling it out ("MRDOC" is
// "Murdock", not "M R D O C"). Names are the ones the trainer uses in IFR clearances (lib/sids.json).
//
//   node --env-file=.env.local scripts/build-fix-pronunciations.mjs
//
// A model proposes the respellings (it knows the conventional pronunciations of most FAA names).
// Anything already in the file is kept, so a respelling that was corrected by hand is never overwritten,
// and a new FAA cycle only adds the names that are new. To fix one, edit it in lib/fix-pronunciations.json.
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const lib = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib')
const sids = JSON.parse(readFileSync(join(lib, 'sids.json'), 'utf8')).airports
const outPath = join(lib, 'fix-pronunciations.json')
const have = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {}

const names = new Set()
for (const list of Object.values(sids)) for (const p of list) if (p.transitions.length) { names.add(p.name); p.transitions.forEach((t) => names.add(t)) }
const todo = [...names].filter((n) => !have[n]).sort()
console.log(`${names.size} names, ${todo.length} to do`)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
for (let i = 0; i < todo.length; i += 80) {
  const batch = todo.slice(i, i + 80)
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: `These are FAA departure procedure and fix names (five letters or fewer). For each, write how an air traffic controller says it aloud, spelled in plain lowercase English letters so a text-to-speech voice will read it as ONE ordinary word with natural stress, never letter by letter.

Rules:
- Use the real, conventional ATC pronunciation when you know it (MRDOC is "murdock", TEHRU is "tayroo", JAYJO is "jayjoe", DARTZ is "darts", PAVYL is "pavel", ILEXY is "ilexy", HOARY is "hoary", BDDAY is "birthday").
- If the name is a real word or the spelling is already a readable word, repeat it unchanged.
- Otherwise respell it phonetically with the vowels a controller would add. One word, letters a-z only, no hyphens, spaces, apostrophes or capitals.
- Never answer with the letters spelled out.

Return raw JSON only, an object mapping each name to its respelling:
${batch.join(' ')}` }],
  })
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').replace(/^```(?:json)?\s*|\s*```$/g, '')
  const parsed = JSON.parse(text)
  for (const n of batch) {
    const r = String(parsed[n] || '').trim().toLowerCase()
    if (/^[a-z]{2,12}$/.test(r)) have[n] = r
    else console.log('  no usable answer for', n, JSON.stringify(parsed[n]))
  }
  console.log(`  done ${Math.min(i + 80, todo.length)}/${todo.length}`)
}
const sorted = Object.fromEntries(Object.entries(have).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(outPath, JSON.stringify(sorted, null, 1) + '\n')
console.log(`wrote ${outPath}: ${Object.keys(sorted).length} names`)
