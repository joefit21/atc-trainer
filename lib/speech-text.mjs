// What the text-to-speech voice is given, which can differ from the text on screen.
// Controllers say "SID" as the word "sid". Given capitals, the voice spells it out or drags out
// the last letter ("side D", "PsyD"); in lower case it sometimes says "side". Written "Sid", it
// said the word correctly every time in testing.
export function forSpeech(text) {
  return String(text || '').replace(/\bSID(s?)\b/g, 'Sid$1')
}
