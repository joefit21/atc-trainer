// What the text-to-speech voice is given, which can differ from the text on screen.
//
// SID: controllers say it as the word "sid". Given capitals, the voice spells it out or drags out the
// last letter ("side D", "PsyD"); in lower case it sometimes says "side". Written "Sid", it said the
// word correctly every time in testing.
//
// Departure procedure and transition names (MRDOC, TEHRU): written in capitals, the voice often spells
// them out ("M R D O C"). They are replaced by a respelling of how a controller says them ("murdock",
// "tayroo"), from lib/fix-pronunciations.json (scripts/build-fix-pronunciations.mjs).
export function forSpeechWith(text, pronunciations = {}) {
  const say = (name) => pronunciations[name] ?? name
  return String(text || '')
    .replace(/\bSID(s?)\b/g, 'Sid$1')
    .replace(/(\bvia the )([A-Z]{2,5})( \w+ departure)/g, (m, a, name, b) => a + say(name) + b)
    .replace(/(, )([A-Z]{3,5})( transition\b)/g, (m, a, name, b) => a + say(name) + b)
}
