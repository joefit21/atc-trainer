export const articles = [
  {
    slug: 'how-to-read-back-ifr-clearance',
    title: 'How to Read Back an IFR Clearance',
    description: 'A CFI and former air traffic controller explains the CRAFT format, what you must read back, and the mistakes that make controllers repeat themselves.',
    date: 'April 20, 2026',
    readTime: '6 min read',
    intro: "Reading back an IFR clearance correctly is one of the first things that separates a pilot who sounds like they belong in the system from one who doesn't. The readback isn't just a formality — it's a closed-loop verification that you received the clearance correctly. Here's how to do it right.",
    sections: [
      {
        heading: 'The CRAFT Format',
        paragraphs: [
          'CRAFT is the standard memory aid for IFR clearance components: Clearance limit, Route, Altitude, Frequency (departure), Transponder (squawk code). Every IFR clearance contains these elements, and your readback should too — in the same order they were given.',
          'Clearance limit is almost always your destination airport, but occasionally — when ATC cannot issue a full-route clearance — it may be a fix or navaid near the departure airport. In that case you\'d proceed to that fix and hold until ATC can issue the rest of your route. Route includes your departure procedure (SID), airways, and any amendments. Altitude means your initial assigned altitude and any crossing restrictions. Frequency is the departure control frequency. Squawk is the four-digit transponder code.',
        ],
      },
      {
        heading: 'What You Must Read Back',
        paragraphs: [
          'FAA regulations (14 CFR 91.123) and ATC orders require pilots to read back any ATC instruction that contains an altitude assignment, a heading, or a clearance to enter a runway. For IFR clearances, that means the altitude, the route, and the squawk code at minimum.',
          'In practice, experienced pilots read back the entire clearance. Controllers use your readback to verify you got it right. If you read back something incorrectly, the controller will catch it and correct it before you depart. That\'s the whole point.',
        ],
      },
      {
        heading: 'How to Sound Like You\'ve Done It Before',
        paragraphs: [
          'Start your readback with your callsign, then work through CRAFT in order. Don\'t editorialize or add filler. "November 4-5-3 Tango Foxtrot, cleared to Denver International via the KORDA2 departure, then as filed, climb and maintain 5,000, expect flight level 2-3-0 one-zero minutes after departure, departure frequency 1-2-4-point-4, squawk 4-5-1-7" is a complete, professional readback.',
          'Two common habits that identify inexperienced pilots: reading back in a rush and dropping words, and adding "uh" or "roger" before starting. Start with your callsign. Speak at a pace the controller can follow. Read it back in order.',
        ],
      },
      {
        heading: 'When the Clearance Is Long or Fast',
        paragraphs: [
          'If the clearance came in faster than you could write it down, say so: "November 4-5-3 Tango Foxtrot, unable to copy, say again." Controllers expect this from time to time — it\'s much better than reading back something wrong.',
          'If you got most of it but missed the squawk: "November 4-5-3 Tango Foxtrot, ready to copy squawk code only." Controllers will give you just that element. Never guess at a squawk code.',
        ],
      },
      {
        heading: 'What Happens When You Read Back Wrong',
        paragraphs: [
          'The controller will say "Negative" or "Correction" and re-issue the element you got wrong. This is not a problem. Read-back errors happen to everyone and catching them is exactly why the readback system exists.',
          'What controllers notice more than a read-back error is a pilot who reads back confidently wrong and doesn\'t respond to the correction. Pay attention after your readback — if the controller comes back, something didn\'t match.',
        ],
      },
    ],
    cta: 'ATC Clearance Trainer lets you practice IFR clearance readbacks with a realistic controller voice and instant feedback on exactly what you got right and what you missed. Try it free at practice.flight-levels.com/demo.',
  },

  {
    slug: 'atc-radio-basics-student-pilots',
    title: 'ATC Radio Basics for Student Pilots',
    description: 'The first time you key the mic, it feels nothing like the ground school version. A CFI and former controller explains how radio communication actually works — and how to get comfortable with it.',
    date: 'April 20, 2026',
    readTime: '7 min read',
    intro: "Every pilot remembers the first time they froze on the radio. Ground school teaches you the theory of radio communication. What it can't teach you is what it actually feels like to key the mic while flying an airplane and have a controller respond faster than you expected. Here's the foundation you need.",
    sections: [
      {
        heading: 'The Structure of Every Radio Call',
        paragraphs: [
          'Every ATC radio call follows the same structure: who you\'re calling, who you are, where you are, what you have, what you want. "Riverside Ground, Cessna 8-8-6 Papa Kilo, at the south ramp, with Information X-Ray, VFR to Big Bear, request taxi." That\'s it. Facility, callsign, position, ATIS, request.',
          'New pilots often skip elements or reorder them. The most common mistake is leading with the request instead of the callsign: "I\'d like to request taxi to runway 2-6." Controllers hear dozens of transmissions a minute. They need your callsign before anything else.',
        ],
      },
      {
        heading: 'What "Say Again" Actually Means',
        paragraphs: [
          '"Say again" is standard phraseology for "please repeat." It is not rude. It does not mean you failed. Every pilot uses it, including airline crews. If you missed part of a transmission, say "Say again" or "Say again after [the last part you caught]."',
          'Never say "repeat" on aviation radio. In aviation, "repeat" has a specific artillery-derived meaning in some contexts and is avoided to prevent confusion. "Say again" is the correct phrase.',
        ],
      },
      {
        heading: 'Readbacks: What to Read Back and What Not To',
        paragraphs: [
          'Read back runway assignments, taxi instructions that include crossing a runway, altimeter settings, altitude assignments, heading assignments, and clearances. Say back what the controller told you, using your callsign at the end.',
          'You don\'t need to read back every word. If ground says "Cessna 8-8-6 Papa Kilo, taxi to runway 2-6 via Alpha, hold short of runway 3-1," a correct readback is: "Taxi to 2-6 via Alpha, hold short of 3-1, 8-8-6 Papa Kilo." You\'ve confirmed the key elements — runway, routing, restriction.',
        ],
      },
      {
        heading: 'The Radio Alphabet and Numbers',
        paragraphs: [
          'The NATO phonetic alphabet (Alpha, Bravo, Charlie...) exists because letters sound alike over radio. A and K sound similar. B and D sound similar. Using "Bravo" instead of "B" eliminates that ambiguity.',
          'Numbers have their own rules. Altitudes, headings, and frequencies are spoken digit by digit: 5,000 feet is "five thousand," runway 28 is "two-eight," frequency 121.9 is "one-two-one-point-niner." "Niner" is used instead of "nine" to prevent confusion with the German word "nein." These conventions exist for a reason — use them.',
        ],
      },
      {
        heading: 'What to Do When You Get Confused',
        paragraphs: [
          'If you\'re not sure what to do, don\'t do anything yet. Say "8-8-6 Papa Kilo, say again" or "8-8-6 Papa Kilo, unable, say again." Controllers would rather give you an instruction twice than have you execute the wrong one.',
          'If you\'re in the pattern and got confused about a sequence or landing clearance, say "8-8-6 Papa Kilo, request clarification." The controller will sort it out. The one thing you should not do is guess and act without being sure.',
        ],
      },
      {
        heading: 'Why Practice Matters More Than Study',
        paragraphs: [
          'You can memorize every phraseology standard in the AIM and still freeze the first time a controller rattles off a complex taxi instruction. Radio competence is built through repetition — hearing the patterns, forming the responses, getting comfortable with the pace.',
          'The pressure of talking on the radio while managing an airplane is something you can only reduce through practice. The more times you\'ve formed a readback before the checkride, the more automatic it becomes when you\'re also tracking traffic and running through a checklist.',
        ],
      },
    ],
    cta: 'ATC Clearance Trainer is built around this exact problem. Practice every type of ATC radio call — ground, tower, departure, en route — with a realistic controller voice and real-time feedback. Try it free at practice.flight-levels.com/demo.',
  },

  {
    slug: 'icao-language-proficiency-pilots',
    title: 'ICAO Language Proficiency: What Pilots Need to Know',
    description: 'ICAO language proficiency requirements affect pilots worldwide. A CFI explains what the six proficiency levels mean, what is actually tested, and what Level 4 requires in practice.',
    date: 'April 20, 2026',
    readTime: '6 min read',
    intro: "If you're training to fly internationally — or working toward a license in a country where English is not the primary language — ICAO language proficiency requirements are part of your path to the cockpit. Here's what those requirements actually mean and what Level 4 looks like in practice.",
    sections: [
      {
        heading: 'Why ICAO English Proficiency Exists',
        paragraphs: [
          'Aviation communication failures have contributed to some of the worst accidents in history. The 1977 Tenerife disaster — the deadliest accident in aviation history — involved, among other factors, communication misunderstandings between non-native English speakers and ATC.',
          'In 2003, ICAO established formal language proficiency requirements for all pilots and controllers involved in international operations. The goal: ensure that every person in the system can communicate well enough to prevent misunderstandings that lead to accidents.',
        ],
      },
      {
        heading: 'The Six Proficiency Levels',
        paragraphs: [
          'ICAO defines six levels of language proficiency, from Level 1 (Pre-elementary) to Level 6 (Expert). The levels assess six skills: pronunciation, structure (grammar), vocabulary, fluency, comprehension, and interactions (ability to handle unexpected or non-routine situations).',
          'Level 4 (Operational) is the minimum required for a pilot license used in international operations. Level 5 (Extended) and Level 6 (Expert) demonstrate higher capability. Native English speakers are generally assessed at Level 6, though formal testing varies by country.',
        ],
      },
      {
        heading: 'What Level 4 Actually Requires',
        paragraphs: [
          'At Level 4, a pilot must be able to communicate effectively in routine and some non-routine situations. Pronunciation must be intelligible even if an accent is present. Vocabulary must cover common and job-related topics. Comprehension must be accurate on familiar topics.',
          'The key requirement at Level 4 that trips people up is interactions — the ability to handle something unexpected. If ATC gives you an unusual instruction, requests clarification, or asks you to explain a situation, you need to respond appropriately without excessive pausing or misunderstanding. This is the skill that pure vocabulary study doesn\'t develop.',
        ],
      },
      {
        heading: 'How Testing Works',
        paragraphs: [
          'Most countries administer ICAO language proficiency tests through approved testing organizations. In India, DGCA requires pilots to demonstrate ICAO Level 4 proficiency. The test typically involves a structured interview, a listening component, and a role-play element where you respond to simulated ATC communications.',
          'Renewal frequency depends on your level: Level 4 must be renewed every three years, Level 5 every six years, and Level 6 is permanent. This means maintaining proficiency — not just passing once — is part of holding an international license.',
        ],
      },
      {
        heading: 'The Practical Side: Sounding Like You Belong',
        paragraphs: [
          'Passing a formal test and communicating confidently in a real cockpit are related but different skills. The test is structured. The real environment involves controllers speaking at full speed, background noise, non-standard phraseology, and the additional workload of actually flying the aircraft.',
          'Pilots who prepare only for the test often find the real environment harder. The best preparation combines formal knowledge of phraseology with enough repetition that the patterns become automatic — so when you\'re busy in the cockpit, the radio doesn\'t require active concentration.',
        ],
      },
    ],
    cta: 'ATC Clearance Trainer is designed for exactly this gap — building the repetition and automaticity that formal test prep doesn\'t cover. Practice real ATC scenarios with a native English controller voice until it feels natural. Try it free at practice.flight-levels.com/demo.',
  },

  {
    slug: 'common-atc-readback-mistakes',
    title: 'Common ATC Readback Mistakes Pilots Make',
    description: 'A former air traffic controller explains the readback errors he heard most often — and what each one tells a controller about where a pilot is in their training.',
    date: 'April 20, 2026',
    readTime: '5 min read',
    intro: "Working the radar room, you develop a quick read on a pilot within the first few transmissions. Readback errors aren't just procedural problems — each one is a signal. Here are the mistakes controllers hear most often and what to do instead.",
    sections: [
      {
        heading: '1. Reading Back Only Part of the Instruction',
        paragraphs: [
          '"Climb and maintain flight level 3-5-0, direct BOSSS, contact Denver Center on 1-3-4-point-5." The pilot comes back: "Flight level 3-5-0, 8-8-6 Papa Kilo." Controllers hear this constantly. The pilot acknowledged the altitude but not the route change or the frequency.',
          'The correct readback confirms everything: "Flight level 3-5-0, direct BOSSS, 1-3-4-point-5, 8-8-6 Papa Kilo." If the controller says it, read it back. A partial readback forces the controller to ask if you got the rest — or worse, assume you did when you didn\'t.',
        ],
      },
      {
        heading: '2. "Roger" Instead of a Readback',
        paragraphs: [
          '"Roger" means "I received your transmission." It does not confirm that you understood it correctly. On a frequency clearance or altitude assignment, "roger" is not an acceptable substitute for a readback.',
          'The fix is simple: read back the instruction. "Climb and maintain 8,000 — 8-8-6 Papa Kilo" is correct. "Roger" is not. The distinction matters because a misheard altitude or frequency cannot be caught without the readback.',
        ],
      },
      {
        heading: '3. Rushing the Readback',
        paragraphs: [
          'Anxious pilots rush. The readback comes out at half the speed of comprehension and controllers miss elements. If you got the clearance, slow down and read it back at a pace that\'s easy to follow.',
          'This is particularly common with IFR clearances. The clearance comes in fast, the pilot scrambles to write it down, then reads it back in a rush. If you\'re not ready to read it back calmly, it\'s fine to say "stand by" or ask the controller to wait a moment.',
        ],
      },
      {
        heading: '4. Garbling Numbers',
        paragraphs: [
          'Altitudes and headings require precision. "Climb and maintain 5,000" read back as "five thousand" is correct. Read back as "five-zero-zero-zero" is technically correct but non-standard. Read back as something mumbled that sounds like it might be five thousand — that\'s a problem.',
          'Speak numbers clearly and in the standard format. Thousands are spoken as thousands ("five thousand"), not digit by digit. Headings are digit by digit ("turn left heading two-seven-zero"). Frequencies are spoken with the decimal point ("one-two-one-point-niner"). Know the conventions and use them.',
        ],
      },
      {
        heading: '5. Not Including Your Callsign',
        paragraphs: [
          'On a busy frequency, multiple aircraft may be ready to respond at once. Your callsign at the end of the readback tells the controller which aircraft confirmed the instruction. Without it, the controller doesn\'t have a complete loop.',
          'Put your callsign at the end of every readback: "Descend and maintain 4,000, 8-8-6 Papa Kilo." Some pilots put it at the front. Either is acceptable, but end is the more common convention in the US.',
        ],
      },
      {
        heading: '6. Confidently Reading Back the Wrong Thing',
        paragraphs: [
          'This is the one that keeps controllers alert. A pilot mishears an altitude — say, 6,000 instead of 16,000 — and reads it back with complete confidence. The controller catches it and corrects it. The pilot, embarrassed, assumes they misheard and reads it back correctly.',
          'But occasionally, a pilot mishears and reads back the wrong altitude and the controller misses it — or the readback is garbled and the controller thinks it matched. That\'s how altitude deviations happen. Read back carefully, not confidently. There\'s a difference.',
        ],
      },
    ],
    cta: 'ATC Clearance Trainer scores your readbacks the way a real controller would — identifying exactly what you got right, what you missed, and what was garbled. Try it free at practice.flight-levels.com/demo.',
  },
]

export function getArticle(slug) {
  return articles.find(a => a.slug === slug) || null
}
