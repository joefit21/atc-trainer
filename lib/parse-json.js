/**
 * Robustly extract and parse the first JSON object from an AI response.
 * Handles cases where the model adds extra text before or after the JSON.
 */
export function parseAIJson(text) {
  // Strip markdown code fences
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  // Find the first { and the last matching } to extract just the JSON object
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in AI response')
  }

  return JSON.parse(cleaned.slice(start, end + 1))
}
