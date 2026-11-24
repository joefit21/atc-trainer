// Ground Control never issues a wind report: only Tower does, and only with a landing or takeoff
// clearance. The prompts forbid it, and this is the safety net for a reply that includes one anyway.
// Drops any comma- or period-separated phrase that mentions the wind ("wind one three zero at eight",
// "winds calm"), then tidies the punctuation. Returns the text unchanged if nothing would be left.
export function stripWindReport(text) {
  const original = String(text || '')
  const parts = original.split(/([,.;])/)
  const kept = []
  for (let i = 0; i < parts.length; i += 2) {
    const phrase = parts[i]
    const sep = parts[i + 1] || ''
    if (/\bwinds?\b/i.test(phrase)) continue
    kept.push(phrase + sep)
  }
  let out = kept.join('').replace(/\s{2,}/g, ' ').replace(/^[\s,;]+/, '').replace(/\s+([,.;])/g, '$1').trim()
  if (!out || !/[a-z]/i.test(out)) return original
  out = out.replace(/[,;]+$/, '.')
  return out
}
