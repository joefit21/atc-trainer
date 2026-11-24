// Checks every respelling in lib/fix-pronunciations.json by listening to it: the text-to-speech voice
// says each name in a clearance, a speech-to-text model writes down what it heard, and the respelling
// passes if the voice said a word that sounds like it (not letters). For a name that fails, the model
// proposes alternate respellings and the first one that passes is kept. Names still failing are listed.
//
//   node --env-file=.env.local scripts/check-fix-pronunciations.mjs
//
// This calls the speech APIs about two to four times per name (a few dollars for a full pass).
import OpenAI, { toFile } from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { forSpeechWith } from '../lib/speech-text.mjs'

const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'fix-pronunciations.json')
const pron = JSON.parse(readFileSync(path, 'utf8'))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
// Did the voice say something that sounds like `target`? Any run of one to three heard words, joined, close to it.
function heard(text, target) {
  const t = target.replace(/ /g, '')
  const words = text.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) for (let n = 1; n <= 3 && i + n <= words.length; n++) {
    const w = words.slice(i, i + n).join('')
    if (lev(w, t) <= Math.max(2, Math.ceil(t.length * 0.25)) && w.length >= 3) return true
  }
  return false
}
async function listen(name, respelling) {
  const text = forSpeechWith(`cleared to Dayton via the ${name} three departure, then as filed.`, { ...pron, [name]: respelling })
  const mp3 = await openai.audio.speech.create({ model: 'tts-1', voice: 'onyx', input: text, speed: 1.1 })
  const heardText = (await openai.audio.transcriptions.create({ model: 'whisper-1', file: await toFile(Buffer.from(await mp3.arrayBuffer()), 'a.mp3') })).text
  return heard(heardText, respelling)
}
async function pool(items, size, fn) { const out = []; for (let i = 0; i < items.length; i += size) out.push(...await Promise.all(items.slice(i, i + size).map(fn))); return out }

const names = Object.keys(pron)
const first = await pool(names, 8, async (n) => [n, await listen(n, pron[n]).catch(() => true)])
const failing = first.filter(([, ok]) => !ok).map(([n]) => n)
console.log(`${names.length - failing.length}/${names.length} pass; ${failing.length} to retry`)

const stillBad = []
for (let i = 0; i < failing.length; i += 40) {
  const batch = failing.slice(i, i + 40)
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5-5', max_tokens: 8000,
    messages: [{ role: 'user', content: `A text-to-speech voice spelled out the letters of these FAA fix names instead of saying them as words. For each name, give 3 alternate respellings, best first, that a text-to-speech voice would read as ONE ordinary word, the way a controller says it. Use lowercase letters a-z only, and a single space only if the name really is two words. Make each look like a real English word or name, with plain vowel-consonant syllables, so it can't be mistaken for an acronym. Current respelling that failed is shown after each name.

Return raw JSON only: {"NAME": ["alt1", "alt2", "alt3"], ...}
${batch.map((n) => `${n} (${pron[n]})`).join('\n')}` }],
  })
  const alts = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').replace(/^```(?:json)?\s*|\s*```$/g, ''))
  await pool(batch, 8, async (n) => {
    for (const alt of (alts[n] || []).map((a) => String(a).trim().toLowerCase()).filter((a) => /^[a-z]{2,12}( [a-z]{2,12})?$/.test(a))) {
      if (await listen(n, alt).catch(() => false)) { pron[n] = alt; return }
    }
    stillBad.push(n)
  })
  console.log(`  retried ${Math.min(i + 40, failing.length)}/${failing.length}, still failing ${stillBad.length}`)
}
writeFileSync(path, JSON.stringify(Object.fromEntries(Object.entries(pron).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n')
console.log(`Final: ${names.length - stillBad.length}/${names.length} pass by ear. Still failing: ${stillBad.map((n) => `${n} (${pron[n]})`).join(', ') || 'none'}`)
