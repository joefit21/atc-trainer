// The speech text with this project's procedure and fix pronunciations loaded. The routes use this.
import { forSpeechWith } from './speech-text.mjs'
import pronunciations from './fix-pronunciations.json'

export const forSpeech = (text) => forSpeechWith(text, pronunciations)
