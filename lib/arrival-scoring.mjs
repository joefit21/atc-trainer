// The Class D arrival scenario's scoring, now a thin layer over the shared engine
// (lib/call-scoring.mjs, tables in lib/grading-scenarios.mjs). Kept so the arrival tests
// and any older imports keep working.
import { modelKeys as mk, scoreCall, summarize as sum } from './call-scoring.mjs'
import { ARRIVAL } from './grading-scenarios.mjs'

export { spokenDigits, hasRunwayNumber, hasReportPoint, hasEntry, callsignIsAbsent, quoteIsInTranscript } from './call-scoring.mjs'
export const PHASES = ARRIVAL.table
export const modelKeys = (phase) => mk(PHASES, phase, {}, {})
export const scoreExchange = (phase, present, pilotSaid) => scoreCall(PHASES, phase, present, pilotSaid, { phase }, {})
export const summarize = (results) => sum(results, ARRIVAL.what, ARRIVAL.cleanLabel)
