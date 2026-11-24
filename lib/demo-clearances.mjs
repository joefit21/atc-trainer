// The fixed sample clearances: the home-page samples and the practice lab's IFR demo.
// Everything shown for a sample (the audio, the quoted text and the CRAFT breakdown) comes
// from the one entry here, so they cannot disagree. scripts/test-demos.mjs checks that
// the breakdown matches the spoken clearance and that the SID, runway and flight level
// are real.

export const GROUND = {
  callsign: 'N4521H',
  airport: 'KSLE – Salem',
  clearance_text: 'November four five two one Hotel, Salem Ground, runway tree one, taxi via Alpha, hold short of runway one six.',
}

// The practice lab's IFR demo (/demo mode, IFR Clearance tab).
export const IFR_DEMO = {
  callsign: 'N7823K',
  airport: 'KDFW – Dallas Fort Worth',
  destination: 'KIAH – Houston Intercontinental',
  clearance_text: 'November seven eight two tree Kilo is cleared to the Houston Intercontinental Airport via the DARTZ Niner departure, TORNN transition, then as filed. Climb via the SID, expect one five thousand one zero minutes after departure. Departure frequency one two four point tree, squawk four five tree two.',
  craft: {
    limit: 'Houston Intercontinental',
    route: 'DARTZ Niner departure, TORNN transition, then as filed',
    altitude: 'Climb via the SID · Expect 15,000 (10 min out)',
    frequency: '124.3',
    transponder: '4532',
  },
}

// The IFR sample on the home page: a different airport, route and callsign from the lab
// demo. Denver to Chicago is eastbound, so an airline flight gets an odd flight level.
export const IFR_LANDING = {
  callsign: 'United 714',
  airport: 'KDEN – Denver',
  destination: 'KORD – Chicago O\'Hare',
  clearance_text: 'United seven fourteen is cleared to the Chicago O\'Hare Airport via the PLAIN Two departure, ASHBY transition, then as filed. Climb and maintain one zero thousand, expect flight level tree five zero one zero minutes after departure. Departure frequency one two five point tree, squawk two zero six four.',
  craft: {
    limit: 'Chicago O\'Hare',
    route: 'PLAIN Two departure, ASHBY transition, then as filed',
    altitude: 'Climb/maintain 10,000 · Expect FL350 (10 min out)',
    frequency: '125.3',
    transponder: '2064',
  },
}
