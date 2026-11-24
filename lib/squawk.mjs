// Beacon (transponder) codes the trainer assigns.
//
// A discrete code is four octal digits (0-7). Any single digit can be zero, but the last two digits
// are never both zero: codes ending in 00 are not assigned as discrete codes (and 1200, 7500, 7600,
// 7700, 7000 and 0000 all end in 00). A few other codes are never assigned: 1255 (firefighting),
// 1276 (ADIZ), 1277 (search and rescue) and 7777 (military intercept).
const NEVER = new Set(['1255', '1276', '1277', '7777'])

export const isAssignableSquawk = (code) => /^[0-7]{4}$/.test(code) && !code.endsWith('00') && !NEVER.has(code)

export function generateSquawk(rand = Math.random) {
  let code
  do code = Array.from({ length: 4 }, () => Math.floor(rand() * 8)).join('')
  while (!isAssignableSquawk(code))
  return code
}
