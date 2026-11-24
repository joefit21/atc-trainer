// Shared helpers for the scripts that build airport lists from the FAA's NASR CSV files.

// Parses one CSV file (quoted fields, embedded commas and quotes) into an array of objects keyed by header.
export function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const head = rows.shift()
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

// Whether an FAA runway surface code is hard (paved): ASPH, CONC, ASPH-CONC, PEM (permanent), treated.
const HARD = new Set(['ASPH', 'CONC', 'PEM', 'TRTD'])
export const hardSurface = (code) => code.split('-').every((p) => HARD.has(p))
