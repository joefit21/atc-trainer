'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── auth-aware fetch — attaches the Supabase session token to every API call ──
async function authedFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

// ─── shared helpers ────────────────────────────────────────────────────────────
const scoreColor  = (s) => s >= 90 ? 'text-green-400'      : s >= 70 ? 'text-yellow-400'      : 'text-red-400'
const scoreBorder = (s) => s >= 90 ? 'border-green-400/20' : s >= 70 ? 'border-yellow-400/20' : 'border-red-400/20'

// ─── fixed demo scenarios (same every time — non-paying users can't reload for new ones) ──
const DEMO_SCENARIOS = {
  ctaf: {
    scenario_type: 'ctaf', airport_id: 'KAUN', airport_name: 'Auburn', airport_state: 'CA',
    ctaf: '122.8', runway: '7', pattern: 'left',
    aircraft_type: 'Cessna 172', callsign_display: 'N4521H',
    callsign_spoken: 'November four five two one Hotel', approach_direction: 'south',
    steps: [
      { index: 0, phase: 'inbound_10',  situation: 'You are 10 miles south of Auburn at 3,400 ft MSL, inbound for landing. Runway in use is 7, left traffic. CTAF is 122.8.', hint: 'Say: "Auburn traffic", aircraft type, callsign, distance and direction, intentions, runway.' },
      { index: 1, phase: 'entering_45', situation: 'You are entering the 45° to the left downwind for Runway 7 at Auburn.', hint: 'Say: "Auburn traffic", type, callsign, "entering 45 left downwind", runway, "Auburn".' },
      { index: 2, phase: 'base',        situation: 'You are turning left base for Runway 7 at Auburn.', hint: 'Say: "Auburn traffic", type, callsign, "left base runway 7", "Auburn".' },
      { index: 3, phase: 'final',       situation: 'You are turning final for Runway 7 at Auburn, full stop.', hint: 'Say: "Auburn traffic", type, callsign, "final runway 7", full stop, "Auburn".' },
      { index: 4, phase: 'clear_runway',situation: 'You have landed and are clear of Runway 7 at Auburn.', hint: 'Say: "Auburn traffic", type, callsign, "clear of runway 7", "Auburn".' },
    ],
  },
  classd: {
    scenario_type: 'classd', airport_id: 'KRDM', airport_name: 'Redmond', state: 'OR',
    tower_freq: '124.5', ground_freq: '121.8', runway: '5', pattern: 'left',
    aircraft_type: 'Cessna 172', callsign_display: 'N4521H',
    callsign_spoken: 'November four five two one Hotel',
    position: 'the general aviation ramp',
    departure_intention: 'northbound departure',
    atis: { letter: 'Bravo', phonetic: 'bravo', wind_dir: '050', wind_speed: 10, visibility: '10', sky: 'clear', altimeter: '30.02', active_runway: '5' },
  },
  classdarrival: {
    scenario_type: 'classdarrival', airport_id: 'KPAO', airport_name: 'Palo Alto', state: 'CA',
    tower_freq: '118.6', ground_freq: '125.0', runway: '13', pattern: 'left',
    aircraft_type: 'Cessna 172', callsign_display: 'N4521H',
    callsign_spoken: 'November four five two one Hotel',
    atis: { letter: 'Alpha', phonetic: 'alpha', wind_dir: '130', wind_speed: 8, visibility: '10', sky: 'clear', altimeter: '29.98', active_runway: '13' },
    approach_direction: 'southeast', approach_distance: 10, approach_altitude: 3200, parking_destination: 'GA ramp',
  },
  flightfollowing: {
    scenario_type: 'flight_following', facility_name: 'NorCal Approach', facility_freq: '132.45',
    altimeter_station: 'Sacramento', aircraft_type: 'Cessna 172',
    callsign_display: 'N4521H', callsign_spoken: 'November four five two one Hotel',
    destination_name: 'Sacramento Executive', destination_id: 'KSAC',
    position_reference: 'Auburn', position_direction: 'south', position_distance: 12,
    altitude: 5500, altimeter: '30.04',
  },
}

export default function RadioLab() {
  const router = useRouter()

  // ── auth / demo ──────────────────────────────────────────────────────────────
  const [user, setUser]     = useState(null)
  const [isDemo, setIsDemo] = useState(false)

  // ── scenario type ────────────────────────────────────────────────────────────
  const [scenarioType, setScenarioType] = useState('ctaf')

  // ── shared state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState('loading')
  const [scenario, setScenario]         = useState(null)
  const [debrief, setDebrief]           = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // ── recording ────────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording]       = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionFailed, setTranscriptionFailed] = useState(false)
  const mediaRecorderRef  = useRef(null)
  const audioChunksRef    = useRef([])
  const submitFnRef       = useRef(null)

  // ── CTAF state ───────────────────────────────────────────────────────────────
  const [ctafStep, setCtafStep]   = useState(0)
  const [ctafCalls, setCtafCalls] = useState([])

  // ── Class D departure state ───────────────────────────────────────────────────
  const [classDStep, setClassDStep]           = useState(0)
  const [classDExchanges, setClassDExchanges] = useState([])

  // ── Class D arrival state ─────────────────────────────────────────────────────
  const [classDArrivalStep, setClassDArrivalStep]           = useState(0)
  const [classDArrivalExchanges, setClassDArrivalExchanges] = useState([])

  // ── Flight following state ────────────────────────────────────────────────────
  const [ffStep, setFFStep]             = useState(0)
  const [ffExchanges, setFFExchanges]   = useState([])
  const [ffSquawkCode, setFFSquawkCode] = useState(null)

  // ── IFR Clearance state ───────────────────────────────────────────────────────
  const [ifrScenario, setIFRScenario]       = useState(null)
  const [ifrAudioUrl, setIFRAudioUrl]       = useState(null)
  const [ifrIsLoading, setIFRIsLoading]     = useState(false)
  const [ifrIsGrading, setIFRIsGrading]     = useState(false)
  const [ifrReadbackText, setIFRReadbackText] = useState('')
  const [ifrScore, setIFRScore]             = useState(null)
  const [ifrFeedback, setIFRFeedback]       = useState('')
  const [ifrShowResults, setIFRShowResults] = useState(false)
  const ifrAudioRef = useRef(null)

  // ── shared controller audio (one scenario runs at a time) ─────────────────────
  const [controllerText, setControllerText]     = useState('')
  const [controllerAudioUrl, setControllerAudioUrl] = useState(null)
  const [controllerLoading, setControllerLoading]   = useState(false)
  const controllerAudioRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const demo   = params.get('demo') === 'true'
    setIsDemo(demo)
    if (demo) {
      loadScenario('ctaf', true)
    } else {
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: profile } = await supabase.from('profiles').select('is_subscribed').eq('id', user.id).single()
        if (!profile?.is_subscribed) { router.push('/signup'); return }
        setUser(user)
        loadScenario('ctaf', false)
      }
      checkAuth()
    }
  }, [])

  // Auto-play controller audio as soon as it arrives
  useEffect(() => {
    if (!controllerAudioUrl) return
    const audio = controllerAudioRef.current
    if (!audio) return
    audio.load()
    audio.play().catch(() => {})
  }, [controllerAudioUrl])

  // ── load scenario ─────────────────────────────────────────────────────────────
  const loadScenario = async (type, demoMode = false) => {
    setPhase('loading')
    setScenario(null)
    setDebrief(null)
    setErrorMessage('')
    setTranscriptionFailed(false)
    setCtafStep(0)
    setCtafCalls([])
    setClassDStep(0)
    setClassDExchanges([])
    setClassDArrivalStep(0)
    setClassDArrivalExchanges([])
    setFFStep(0)
    setFFExchanges([])
    setFFSquawkCode(null)
    setControllerText('')
    setControllerAudioUrl(null)
    try {
      if (demoMode) {
        const key = type === 'classd' ? 'classd' : type === 'classdarrival' ? 'classdarrival' : type === 'flightfollowing' ? 'flightfollowing' : 'ctaf'
        setScenario(DEMO_SCENARIOS[key])
        setPhase('ready')
        return
      }
      const endpoint = type === 'classd'
        ? '/api/vfr-class-d-scenario'
        : type === 'classdarrival'
          ? '/api/vfr-class-d-arrival-scenario'
          : type === 'flightfollowing'
            ? '/api/vfr-flight-following-scenario'
            : '/api/vfr-scenario?type=ctaf'
      const res  = await authedFetch(endpoint)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScenario(data)
      setPhase('ready')
    } catch (e) {
      setErrorMessage(e.message || 'Failed to load scenario.')
      setPhase('error')
    }
  }

  const loadIFRScenario = async (demoMode = false) => {
    setIFRIsLoading(true)
    setIFRShowResults(false)
    setIFRReadbackText('')
    setIFRScore(null)
    setIFRFeedback('')
    setIFRAudioUrl(null)
    setIFRScenario(null)
    try {
      const endpoint = demoMode ? '/api/demo-scenario?type=ifr' : '/api/scenario?type=ifr'
      const res  = demoMode ? await fetch(endpoint) : await authedFetch(endpoint)
      const data = await res.json()
      setIFRScenario(data)
      setIFRAudioUrl(data.audio_url)
    } catch (e) { /* silent — audio just won't play */ }
    setIFRIsLoading(false)
  }

  const ifrSubmitCall = async (text) => {
    if (!ifrScenario) return
    setIFRIsGrading(true)
    setIFRReadbackText(text)
    try {
      const res = await authedFetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearance_text: ifrScenario.clearance_text, readback_text: text, scenario_type: 'ifr' }),
      })
      const result = await res.json()
      setIFRScore(result.score)
      setIFRFeedback(result.feedback)
      setIFRShowResults(true)
    } catch (e) { /* silent */ }
    setIFRIsGrading(false)
  }

  const handleTypeChange = (type) => {
    setScenarioType(type)
    if (type === 'ifr') {
      loadIFRScenario(isDemo)
    } else {
      loadScenario(type, isDemo)
    }
  }

  // ── recording helpers ─────────────────────────────────────────────────────────
  const startRecording = async (onComplete) => {
    setTranscriptionFailed(false)
    submitFnRef.current = onComplete
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current   = []
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'call.webm')
          const res     = await authedFetch('/api/transcribe', { method: 'POST', body: fd })
          const { text } = await res.json()
          setIsTranscribing(false)
          if (submitFnRef.current) submitFnRef.current(text || '')
        } catch {
          setIsTranscribing(false)
          setTranscriptionFailed(true)
        }
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch { alert('Microphone access required.') }
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }

  // ── CTAF flow ─────────────────────────────────────────────────────────────────
  const ctafSaveAndAdvance = async (text) => {
    const step        = scenario.steps[ctafStep]
    const updatedCalls = [...ctafCalls, { step: ctafStep, phase: step.phase, situation: step.situation, transcription: text }]
    setCtafCalls(updatedCalls)
    if (ctafStep < scenario.steps.length - 1) {
      setCtafStep(ctafStep + 1)
    } else {
      setPhase('grading')
      try {
        const res    = await authedFetch('/api/vfr-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, calls: updatedCalls }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        if (!result.call_feedback) throw new Error('Missing call feedback in response.')
        setDebrief(result)
        setPhase('debrief')
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
    }
  }

  // ── Class D flow ──────────────────────────────────────────────────────────────
  const classDSubmitCall = async (text) => {
    const pilotSaid = text

    if (classDStep === 0 || classDStep === 2) {
      // Pilot just made an initiating call — fetch controller response
      const apiPhase = classDStep === 0 ? 'ground' : 'tower'
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      setClassDExchanges(prev => [...prev, {
        step: classDStep,
        phase: classDStep === 0 ? 'ground_call' : 'tower_call',
        situation: classDGetSituation(classDStep),
        pilot_said: pilotSaid,
      }])
      try {
        const res    = await authedFetch('/api/vfr-class-d-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: apiPhase, pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setClassDStep(classDStep + 1)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else {
      // Pilot just did a readback — save and advance
      const ctrlSaid = controllerText
      setClassDExchanges(prev => [...prev, {
        step: classDStep,
        phase: classDStep === 1 ? 'ground_readback' : 'tower_readback',
        situation: classDGetSituation(classDStep),
        controller_said: ctrlSaid,
        pilot_said: pilotSaid,
      }])
      setControllerText('')
      setControllerAudioUrl(null)

      if (classDStep === 1) {
        setClassDStep(2)
      } else {
        // All 4 exchanges done — grade
        const finalExchanges = [...classDExchanges, {
          step: classDStep,
          phase: 'tower_readback',
          situation: classDGetSituation(classDStep),
          controller_said: ctrlSaid,
          pilot_said: pilotSaid,
        }]
        setPhase('grading')
        try {
          const res    = await authedFetch('/api/vfr-class-d-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges }) })
          const result = await res.json()
          if (result.error) throw new Error(result.error)
          if (!result.call_feedback) throw new Error('Missing call feedback in response.')
          setDebrief(result)
          setPhase('debrief')
        } catch (e) { setErrorMessage(e.message); setPhase('error') }
      }
    }
  }

  const classDGetSituation = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `You are parked at ${scenario.position}. You have copied ATIS Information ${scenario.atis.letter}. You intend a ${scenario.departure_intention}. Request taxi from Ground.`
      case 1: return `Ground has issued your taxi clearance. Write it down, then read it back.`
      case 2: return `You have taxied to the hold short line for Runway ${scenario.runway}. Call Tower and request departure.`
      case 3: return `Tower has issued your takeoff clearance. Write it down, then read it back.`
      default: return ''
    }
  }

  const classDGetHint = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `Say: "${scenario.airport_name} Ground", aircraft type, callsign, your position (${scenario.position}), "with Information ${scenario.atis.letter}", and your intended departure (${scenario.departure_intention}). Ground will assign your runway.`
      case 1: return `Write down what Ground said, then read it back: callsign, assigned runway, taxiway route, and any hold short instructions.`
      case 2: return `Say: "${scenario.airport_name} Tower", aircraft type, callsign, "holding short Runway ${scenario.runway}", ready for departure, and your departure direction (${scenario.departure_intention}). Do not reference ATIS again.`
      case 3: return `Write down what Tower said, then read it back: callsign, "cleared for takeoff Runway ${scenario.runway}", and any heading instructions issued.`
      default: return ''
    }
  }

  const classDGetTitle = (step) => ['Call Ground for Taxi', 'Read Back Taxi Clearance', 'Call Tower — Ready for Departure', 'Read Back Takeoff Clearance'][step] || ''
  const classDIsReadback = (step) => step === 1 || step === 3

  // ── Class D arrival helpers ───────────────────────────────────────────────────
  const classDArrivalGetSituation = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `You are ${scenario.approach_distance} miles ${scenario.approach_direction} of ${scenario.airport_name} at ${scenario.approach_altitude.toLocaleString()} ft MSL, inbound for landing. You have ATIS Information ${scenario.atis.letter}. Contact Tower on ${scenario.tower_freq}.`
      case 1: return `Tower has given you a pattern entry instruction. Write it down, then read it back.`
      case 2: {
        const patternInstruction = classDArrivalExchanges[1]?.controller_said
        return `Make your required position report to Tower.${patternInstruction ? ` Tower said: "${patternInstruction}"` : ''}`
      }
      case 3: return `Tower has issued your landing clearance. Write it down, then read it back.`
      case 4: return `You have landed and cleared Runway ${scenario.runway}. Switch to Ground on ${scenario.ground_freq}. You are requesting taxi to ${scenario.parking_destination}.`
      case 5: return `Ground has issued your taxi-to-parking clearance. Write it down, then read it back.`
      default: return ''
    }
  }

  const classDArrivalGetHint = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `Say: "${scenario.airport_name} Tower", aircraft type, callsign, distance and direction (${scenario.approach_distance} miles ${scenario.approach_direction}), altitude (${scenario.approach_altitude.toLocaleString()} ft), "with Information ${scenario.atis.letter}", inbound for landing.`
      case 1: return `Read back: callsign, entry type and runway (e.g., "left downwind runway ${scenario.runway}"), and the reporting point — either "midfield" or "three-mile final."`
      case 2: return `Callsign only — no need to say "${scenario.airport_name} Tower." Report the position Tower asked for (midfield downwind or three-mile final) and include the runway number.`
      case 3: return `Read back: callsign, "cleared to land runway ${scenario.runway}", and wind if Tower stated it.`
      case 4: return `Say: "${scenario.airport_name} Ground", callsign, "clear of runway ${scenario.runway}", request taxi to ${scenario.parking_destination}. Must say the specific runway number. Do NOT say "Tower."`
      case 5: return `Read back: callsign, taxiway, and destination (${scenario.parking_destination}).`
      default: return ''
    }
  }

  const classDArrivalGetTitle = (step) => [
    'Initial Call — Tower Inbound',
    'Read Back Pattern Entry',
    'Make Your Position Report',
    'Read Back Landing Clearance',
    'Clear of Runway — Call Ground',
    'Read Back Taxi to Parking',
  ][step] || ''

  const classDArrivalIsReadback = (step) => step === 1 || step === 3 || step === 5

  // ── Flight following helpers ──────────────────────────────────────────────────
  const ffGetSituation = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `You are ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}. Contact ${scenario.facility_name} on ${scenario.facility_freq} with your callsign and position.`
      case 1: return `${scenario.facility_name} has issued a squawk code and altimeter setting. Write the code down, then read it back and confirm ident.`
      case 2: return `${scenario.facility_name} said "go ahead with your request." Give them your aircraft type, destination, and request flight following.`
      case 3: return `${scenario.facility_name} has radar contact and is asking for your altitude. Report it.`
      default: return ''
    }
  }

  const ffGetHint = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `Say: "${scenario.facility_name}, ${scenario.callsign_display}, [X] miles [direction] of [reference]."`
      case 1: return `Say: "Squawking [code], altimeter [setting], ${scenario.callsign_display}." Write down the squawk code — you'll need to set it on your transponder.`
      case 2: return `Say: "${scenario.aircraft_type}, VFR to ${scenario.destination_name}, request flight following, ${scenario.callsign_display}."`
      case 3: return `Say: "${scenario.altitude.toLocaleString()}, ${scenario.callsign_display}."`
      default: return ''
    }
  }

  const ffGetTitle = (step) => [
    'Initial Contact',
    'Read Back Squawk Code',
    'State Your Request',
    'Report Altitude',
  ][step] || ''

  // Steps 1, 2, and 3 all follow a controller transmission
  const ffIsReadback = (step) => step === 1 || step === 2 || step === 3

  // ── Flight following submit ───────────────────────────────────────────────────
  const ffSubmitCall = async (text) => {
    const pilotSaid = text

    if (ffStep === 0) {
      // Step 0: Initial contact — fetch squawk + altimeter response
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      setFFExchanges(prev => [...prev, {
        step: 0, phase: 'initial_contact', situation: ffGetSituation(0), pilot_said: pilotSaid,
      }])
      try {
        const res    = await authedFetch('/api/vfr-flight-following-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: 'initial_contact', pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        if (result.squawk_code) setFFSquawkCode(result.squawk_code)
        setFFStep(1)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else if (ffStep === 1) {
      // Step 1: Squawk readback — save with controller_said, then fetch "go ahead"
      const prevControllerText = controllerText
      setFFExchanges(prev => [...prev, {
        step: 1, phase: 'squawk_readback', situation: ffGetSituation(1),
        controller_said: prevControllerText, pilot_said: pilotSaid,
      }])
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      try {
        const res    = await authedFetch('/api/vfr-flight-following-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: 'go_ahead', pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setFFStep(2)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else if (ffStep === 2) {
      // Step 2: Full request — save with controller_said, then fetch radar contact
      const prevControllerText = controllerText
      setFFExchanges(prev => [...prev, {
        step: 2, phase: 'full_request', situation: ffGetSituation(2),
        controller_said: prevControllerText, pilot_said: pilotSaid,
      }])
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      try {
        const res    = await authedFetch('/api/vfr-flight-following-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: 'radar_contact', pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setFFStep(3)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else {
      // Step 3: Altitude report — save and grade all 4 exchanges
      const prevControllerText = controllerText
      const finalExchanges = [...ffExchanges, {
        step: 3, phase: 'altitude_report', situation: ffGetSituation(3),
        controller_said: prevControllerText, pilot_said: pilotSaid,
      }]
      setFFExchanges(finalExchanges)
      setPhase('grading')
      try {
        const res    = await authedFetch('/api/vfr-flight-following-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges, squawk_code: ffSquawkCode }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        if (!result.call_feedback) throw new Error('Missing call feedback in response.')
        setDebrief(result)
        setPhase('debrief')
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
    }
  }

  // ── Class D arrival submit ────────────────────────────────────────────────────
  const classDArrivalSubmitCall = async (text) => {
    const pilotSaid = text

    if (classDArrivalStep === 0 || classDArrivalStep === 2 || classDArrivalStep === 4) {
      // Initiating call — fetch controller response
      const apiPhase = classDArrivalStep === 0 ? 'initial_call'
        : classDArrivalStep === 2 ? 'position_report'
        : 'taxi_to_parking'
      const phaseLabel = classDArrivalStep === 0 ? 'initial_call'
        : classDArrivalStep === 2 ? 'position_report'
        : 'clear_runway_to_ground'
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      setClassDArrivalExchanges(prev => [...prev, {
        step: classDArrivalStep,
        phase: phaseLabel,
        situation: classDArrivalGetSituation(classDArrivalStep),
        pilot_said: pilotSaid,
      }])
      try {
        const res    = await authedFetch('/api/vfr-class-d-arrival-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: apiPhase, pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setClassDArrivalStep(classDArrivalStep + 1)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else if (classDArrivalStep === 1 || classDArrivalStep === 3) {
      // Readback of Tower instruction — save and advance
      const ctrlSaid = controllerText
      setClassDArrivalExchanges(prev => [...prev, {
        step: classDArrivalStep,
        phase: classDArrivalStep === 1 ? 'pattern_readback' : 'landing_readback',
        situation: classDArrivalGetSituation(classDArrivalStep),
        controller_said: ctrlSaid,
        pilot_said: pilotSaid,
      }])
      setControllerText('')
      setControllerAudioUrl(null)
      setClassDArrivalStep(classDArrivalStep + 1)

    } else {
      // Step 5: ground taxi readback — grade all 6 exchanges
      const ctrlSaid = controllerText
      const finalExchanges = [...classDArrivalExchanges, {
        step: classDArrivalStep,
        phase: 'ground_taxi_readback',
        situation: classDArrivalGetSituation(classDArrivalStep),
        controller_said: ctrlSaid,
        pilot_said: pilotSaid,
      }]
      setClassDArrivalExchanges(finalExchanges)
      setPhase('grading')
      try {
        const res    = await authedFetch('/api/vfr-class-d-arrival-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        if (!result.call_feedback) throw new Error('Missing call feedback in response.')
        setDebrief(result)
        setPhase('debrief')
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
    }
  }

  // ── recording UI ──────────────────────────────────────────────────────────────
  const RecordingPanel = ({ onStart }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      {!isRecording && !isTranscribing && !transcriptionFailed && (
        <button onClick={() => startRecording(onStart)} className="flex items-center gap-3 bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-semibold transition">
          🎙️ Record Your Call
        </button>
      )}
      {isRecording && (
        <div className="space-y-3">
          <button onClick={stopRecording} className="flex items-center gap-3 bg-red-700 px-6 py-3 rounded-lg font-semibold animate-pulse">
            ⏹ Stop Recording
          </button>
          <p className="text-red-400 text-sm">Recording... make your call now.</p>
        </div>
      )}
      {isTranscribing && <p className="text-gray-400 text-sm animate-pulse">Processing...</p>}
      {transcriptionFailed && (
        <div className="space-y-3">
          <p className="text-red-400 text-sm">Transcription failed — please try again.</p>
          <button onClick={() => setTranscriptionFailed(false)} className="flex items-center gap-3 bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-semibold transition">
            🎙️ Try Again
          </button>
        </div>
      )}
    </div>
  )

  // ── debrief card ──────────────────────────────────────────────────────────────
  const DebriefCard = ({ cf, index, steps, calls }) => (
    <div className={`border rounded-2xl p-5 bg-white/3 ${scoreBorder(cf.score)}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-300">
          Call {index + 1} — {(cf.phase || (steps && steps[index]?.phase) || '').replace(/_/g, ' ')}
        </span>
        <span className={`text-2xl font-bold ${scoreColor(cf.score)}`}>{cf.score}</span>
      </div>
      {steps && steps[index] && <p className="text-xs text-gray-500 mb-3">{steps[index].situation}</p>}
      <div className="bg-black/20 rounded-lg px-4 py-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">You said</p>
        <p className="text-sm text-gray-300 italic">&ldquo;{cf.what_you_said || calls?.[index]?.transcription || '—'}&rdquo;</p>
      </div>
      {cf.key_issue && <p className="text-sm text-yellow-400 mb-2">⚠ {cf.key_issue}</p>}
      {cf.feedback  && <p className="text-sm text-gray-300">{cf.feedback}</p>}
    </div>
  )

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-[#0a0f1e]" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <a href="/" className="text-xl font-bold">✈️ Flight Levels</a>
        {isDemo ? (
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 text-sm font-medium">🔓 Demo Mode</span>
            <a href="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition">Subscribe →</a>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">{user?.email}</span>
            <button onClick={async () => {
              const res = await fetch('/api/create-portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id }) })
              const { url } = await res.json()
              window.location.href = url
            }} className="text-gray-400 hover:text-white text-sm transition">Manage Subscription</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="text-gray-400 hover:text-white text-sm transition">Log Out</button>
          </div>
        )}
      </nav>
      {isDemo && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-8 py-3 text-center">
          <p className="text-blue-300 text-sm">
            🎯 <strong>Demo Mode</strong> — Fixed scenarios, unlimited attempts.
            <a href="/signup" className="underline ml-2 hover:text-blue-200">Subscribe for unlimited random scenarios →</a>
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Scenario type selector ── */}
        {(phase === 'ready' || phase === 'practicing' || phase === 'classd_pilot' || phase === 'classdarrival_pilot' || phase === 'ff_pilot' || scenarioType === 'ifr') && (
          <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1">
            {[
              { key: 'ctaf',            label: '📻 CTAF'            },
              { key: 'classd',          label: '🛫 Departure'       },
              { key: 'classdarrival',   label: '🛬 Arrival'         },
              { key: 'flightfollowing', label: '✈️ Following'       },
              { key: 'ifr',             label: '📋 IFR Clearance'   },
            ].map(opt => (
              <button key={opt.key} onClick={() => handleTypeChange(opt.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${scenarioType === opt.key ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading ── */}
        {phase === 'loading' && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-4xl mb-4">{scenarioType === 'classd' ? '🛫' : scenarioType === 'classdarrival' ? '🛬' : scenarioType === 'flightfollowing' ? '✈️' : '📻'}</div>
            <p>Loading scenario...</p>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="text-center py-24 space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-400 font-semibold">Something went wrong</p>
            <p className="text-gray-400 text-sm">{errorMessage}</p>
            <button onClick={() => loadScenario(scenarioType)} className="mt-4 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition">Try Again</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CTAF — Ready
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'ready' && scenarioType === 'ctaf' && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">ATC Radio Lab</h1>
              <p className="text-gray-400">CTAF — Uncontrolled Airport Arrival</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Airport</p><p className="text-xl font-bold text-blue-400">{scenario.airport_id}</p><p className="text-sm text-gray-400">{scenario.airport_name}, {scenario.airport_state}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">CTAF</p><p className="text-xl font-bold text-blue-400">{scenario.ctaf}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Runway in Use</p><p className="text-xl font-bold text-blue-400">{scenario.runway}</p><p className="text-sm text-gray-400">{scenario.pattern} traffic</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Aircraft</p><p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p><p className="text-sm text-gray-400">{scenario.aircraft_type}</p></div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 5 Calls</h2>
              <div className="space-y-2">
                {scenario.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step.situation.split('.')[0]}.</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setPhase('practicing')} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">Start Scenario →</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CTAF — Practicing
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'practicing' && scenarioType === 'ctaf' && scenario && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              {scenario.steps.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < ctafStep ? 'bg-green-400' : i === ctafStep ? 'bg-blue-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-400">Call {ctafStep + 1} of {scenario.steps.length}</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Current Situation</h2>
              <p className="text-white text-lg leading-relaxed">{scenario.steps[ctafStep].situation}</p>
              <p className="text-gray-500 text-sm mt-4">💡 {scenario.steps[ctafStep].hint}</p>
            </div>
            <div className="flex gap-6 text-sm bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              <span className="text-gray-500">CTAF <span className="text-white font-medium">{scenario.ctaf}</span></span>
              <span className="text-gray-500">Runway <span className="text-white font-medium">{scenario.runway} {scenario.pattern}</span></span>
              <span className="text-gray-500">Callsign <span className="text-white font-medium">{scenario.callsign_display}</span></span>
            </div>
            <RecordingPanel onStart={ctafSaveAndAdvance} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CLASS D — Ready
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'ready' && scenarioType === 'classd' && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">ATC Radio Lab</h1>
              <p className="text-gray-400">Class D — Departure from a Towered Airport</p>
            </div>

            {/* Airport + frequencies */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Airport</p><p className="text-xl font-bold text-blue-400">{scenario.airport_id}</p><p className="text-sm text-gray-400">{scenario.airport_name}, {scenario.state}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Aircraft</p><p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p><p className="text-sm text-gray-400">{scenario.aircraft_type}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Ground</p><p className="text-xl font-bold text-blue-400">{scenario.ground_freq}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Tower</p><p className="text-xl font-bold text-blue-400">{scenario.tower_freq}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Active Runway</p><p className="text-xl font-bold text-blue-400">{scenario.runway}</p><p className="text-sm text-gray-400">{scenario.pattern} traffic</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Parked At</p><p className="text-lg font-bold text-blue-400">{scenario.position}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500 mb-1">Intended Departure</p><p className="text-lg font-bold text-yellow-400 capitalize">{scenario.departure_intention}</p></div>
              </div>
            </div>

            {/* ATIS card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">ATIS — Information {scenario.atis.letter}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-400">Wind <span className="text-white font-medium">{scenario.atis.wind_dir}° at {scenario.atis.wind_speed} kt</span></div>
                <div className="text-gray-400">Visibility <span className="text-white font-medium">{scenario.atis.visibility} SM</span></div>
                <div className="text-gray-400">Sky <span className="text-white font-medium">{scenario.atis.sky}</span></div>
                <div className="text-gray-400">Altimeter <span className="text-white font-medium">{scenario.atis.altimeter}</span></div>
                <div className="text-gray-400">Active Runway <span className="text-white font-medium">{scenario.atis.active_runway}</span></div>
              </div>
            </div>

            {/* Steps preview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 4 Transmissions</h2>
              <div className="space-y-2">
                {['Call Ground for taxi', 'Read back taxi clearance', 'Call Tower ready for departure', 'Read back takeoff clearance'].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setPhase('classd_pilot')} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
              Start — Call Ground →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CLASS D — Pilot Turn
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'classd_pilot' && scenarioType === 'classd' && scenario && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[0,1,2,3].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < classDStep ? 'bg-green-400' : i === classDStep ? 'bg-blue-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-400">Transmission {classDStep + 1} of 4</p>

            {/* Title + situation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-2">{classDGetTitle(classDStep)}</h2>
              <p className="text-white leading-relaxed">{classDGetSituation(classDStep)}</p>
              <p className="text-gray-500 text-sm mt-4">💡 {classDGetHint(classDStep)}</p>
            </div>

            {/* Controller audio — text hidden, audio-only with replay */}
            {classDIsReadback(classDStep) && controllerAudioUrl && (
              <div className="bg-white/5 border border-blue-400/20 rounded-2xl p-5 space-y-3">
                <p className="text-xs text-blue-400 uppercase tracking-wide">
                  {classDStep === 1 ? 'Ground Control' : 'Tower'} — write down the clearance, then read it back
                </p>
                <audio ref={controllerAudioRef} src={controllerAudioUrl} />
                <button
                  onClick={() => { controllerAudioRef.current?.load(); controllerAudioRef.current?.play() }}
                  className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-4 py-2 rounded-lg text-sm text-blue-300 transition"
                >
                  ▶ Play Clearance Again
                </button>
              </div>
            )}

            {/* Controller loading */}
            {controllerLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-gray-400">
                <p>{classDStep === 0 ? '📡 Ground is responding...' : '📡 Tower is responding...'}</p>
              </div>
            )}

            {/* Quick reference */}
            <div className="flex flex-wrap gap-4 text-sm bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              {classDStep <= 1
                ? <><span className="text-gray-500">Ground <span className="text-white font-medium">{scenario.ground_freq}</span></span><span className="text-gray-500">ATIS <span className="text-white font-medium">Info {scenario.atis.letter}</span></span></>
                : <><span className="text-gray-500">Tower <span className="text-white font-medium">{scenario.tower_freq}</span></span><span className="text-gray-500">Runway <span className="text-white font-medium">{scenario.runway}</span></span></>
              }
              <span className="text-gray-500">Callsign <span className="text-white font-medium">{scenario.callsign_display}</span></span>
            </div>

            {!controllerLoading && (
              <RecordingPanel onStart={classDSubmitCall} />
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CLASS D ARRIVAL — Ready
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'ready' && scenarioType === 'classdarrival' && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">ATC Radio Lab</h1>
              <p className="text-gray-400">Class D — Arrival at a Towered Airport</p>
            </div>

            {/* Airport + frequencies */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Airport</p><p className="text-xl font-bold text-blue-400">{scenario.airport_id}</p><p className="text-sm text-gray-400">{scenario.airport_name}, {scenario.state}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Aircraft</p><p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p><p className="text-sm text-gray-400">{scenario.aircraft_type}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Tower</p><p className="text-xl font-bold text-blue-400">{scenario.tower_freq}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Active Runway</p><p className="text-xl font-bold text-blue-400">{scenario.runway}</p><p className="text-sm text-gray-400">{scenario.pattern} traffic</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Position</p><p className="text-lg font-bold text-yellow-400">{scenario.approach_distance} miles {scenario.approach_direction}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Altitude</p><p className="text-lg font-bold text-yellow-400">{scenario.approach_altitude.toLocaleString()} ft MSL</p></div>
              </div>
            </div>

            {/* ATIS card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">ATIS — Information {scenario.atis.letter}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-400">Wind <span className="text-white font-medium">{scenario.atis.wind_dir}° at {scenario.atis.wind_speed} kt</span></div>
                <div className="text-gray-400">Visibility <span className="text-white font-medium">{scenario.atis.visibility} SM</span></div>
                <div className="text-gray-400">Sky <span className="text-white font-medium">{scenario.atis.sky}</span></div>
                <div className="text-gray-400">Altimeter <span className="text-white font-medium">{scenario.atis.altimeter}</span></div>
                <div className="text-gray-400">Active Runway <span className="text-white font-medium">{scenario.atis.active_runway}</span></div>
              </div>
            </div>

            {/* Steps preview */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 6 Transmissions</h2>
              <div className="space-y-2">
                {['Initial call to Tower (inbound)', 'Read back pattern entry instruction', 'Position report as directed', 'Read back landing clearance', 'Call Ground — clear of runway, request taxi to parking', 'Read back taxi-to-parking clearance'].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setPhase('classdarrival_pilot')} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
              Start — Call Tower →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            CLASS D ARRIVAL — Pilot Turn
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'classdarrival_pilot' && scenarioType === 'classdarrival' && scenario && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < classDArrivalStep ? 'bg-green-400' : i === classDArrivalStep ? 'bg-blue-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-400">Transmission {classDArrivalStep + 1} of 6</p>

            {/* Title + situation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-2">{classDArrivalGetTitle(classDArrivalStep)}</h2>
              <p className="text-white leading-relaxed">{classDArrivalGetSituation(classDArrivalStep)}</p>
              <p className="text-gray-500 text-sm mt-4">💡 {classDArrivalGetHint(classDArrivalStep)}</p>
            </div>

            {/* Controller audio — text hidden, audio-only with replay */}
            {classDArrivalIsReadback(classDArrivalStep) && controllerAudioUrl && (
              <div className="bg-white/5 border border-blue-400/20 rounded-2xl p-5 space-y-3">
                <p className="text-xs text-blue-400 uppercase tracking-wide">
                  {classDArrivalStep === 5 ? 'Ground Control' : 'Tower'} — write down the clearance, then read it back
                </p>
                <audio ref={controllerAudioRef} src={controllerAudioUrl} />
                <button
                  onClick={() => { controllerAudioRef.current?.load(); controllerAudioRef.current?.play() }}
                  className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-4 py-2 rounded-lg text-sm text-blue-300 transition"
                >
                  ▶ Play Again
                </button>
              </div>
            )}

            {/* Controller loading */}
            {controllerLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-gray-400">
                <p>📡 Tower is responding...</p>
              </div>
            )}

            {/* Quick reference */}
            <div className="flex flex-wrap gap-4 text-sm bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              {classDArrivalStep <= 3
                ? <><span className="text-gray-500">Tower <span className="text-white font-medium">{scenario.tower_freq}</span></span><span className="text-gray-500">ATIS <span className="text-white font-medium">Info {scenario.atis.letter}</span></span></>
                : <><span className="text-gray-500">Ground <span className="text-white font-medium">{scenario.ground_freq}</span></span><span className="text-gray-500">Parking <span className="text-white font-medium">{scenario.parking_destination}</span></span></>
              }
              <span className="text-gray-500">Runway <span className="text-white font-medium">{scenario.runway}</span></span>
              <span className="text-gray-500">Callsign <span className="text-white font-medium">{scenario.callsign_display}</span></span>
            </div>

            {!controllerLoading && (
              <RecordingPanel onStart={classDArrivalSubmitCall} />
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            FLIGHT FOLLOWING — Ready
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'ready' && scenarioType === 'flightfollowing' && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">ATC Radio Lab</h1>
              <p className="text-gray-400">VFR Flight Following Request</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Facility</p><p className="text-xl font-bold text-blue-400">{scenario.facility_name}</p><p className="text-sm text-gray-400">{scenario.facility_freq}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Callsign</p><p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Aircraft Type</p><p className="text-xl font-bold text-yellow-400">{scenario.aircraft_type}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Altitude</p><p className="text-xl font-bold text-yellow-400">{scenario.altitude.toLocaleString()} ft MSL</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Position</p><p className="text-lg font-bold text-white">{scenario.position_distance} miles {scenario.position_direction}</p><p className="text-sm text-gray-400">of {scenario.position_reference}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Destination</p><p className="text-lg font-bold text-blue-400">{scenario.destination_name}</p><p className="text-sm text-gray-400">{scenario.destination_id}</p></div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-5">
              <p className="text-sm text-blue-300 leading-relaxed">
                <span className="font-semibold text-blue-200">About this method:</span> This exercise teaches the short-initial-contact approach preferred at busy facilities. Your first call is just the facility name, your callsign, and position — nothing more. The controller finds you on radar, issues a squawk to confirm your target, then invites your full request. If you learned the all-in-one method, set it aside for now — this flow is what controllers at busy approach facilities expect.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 4 Transmissions</h2>
              <div className="space-y-2">
                {[
                  'Initial contact — ' + scenario.facility_name + ', callsign, position',
                  'Read back squawk code + altimeter setting',
                  'State aircraft type, destination, request flight following',
                  'Report your altitude',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setPhase('ff_pilot')} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
              Start — Call {scenario.facility_name} →
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            FLIGHT FOLLOWING — Pilot Turn
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'ff_pilot' && scenarioType === 'flightfollowing' && scenario && (
          <div className="space-y-6">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[0,1,2,3].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < ffStep ? 'bg-green-400' : i === ffStep ? 'bg-blue-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-400">Transmission {ffStep + 1} of 4</p>

            {/* Title + situation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-2">{ffGetTitle(ffStep)}</h2>
              <p className="text-white leading-relaxed">{ffGetSituation(ffStep)}</p>
              <p className="text-gray-500 text-sm mt-4">💡 {ffGetHint(ffStep)}</p>
            </div>

            {/* Controller audio */}
            {ffIsReadback(ffStep) && controllerAudioUrl && (
              <div className="bg-white/5 border border-blue-400/20 rounded-2xl p-5 space-y-3">
                <p className="text-xs text-blue-400 uppercase tracking-wide">
                  {ffStep === 1 ? 'Squawk assignment — write it down, then read it back'
                    : ffStep === 2 ? 'Controller says go ahead — state your full request'
                    : 'Radar contact — controller is asking for your altitude'}
                </p>
                <audio ref={controllerAudioRef} src={controllerAudioUrl} />
                <button
                  onClick={() => { controllerAudioRef.current?.load(); controllerAudioRef.current?.play() }}
                  className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-4 py-2 rounded-lg text-sm text-blue-300 transition"
                >
                  ▶ Play Again
                </button>
              </div>
            )}

            {/* Controller loading */}
            {controllerLoading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-gray-400">
                <p>📡 {scenario.facility_name} is responding...</p>
              </div>
            )}

            {/* Quick reference */}
            <div className="flex flex-wrap gap-4 text-sm bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              <span className="text-gray-500">Freq <span className="text-white font-medium">{scenario.facility_freq}</span></span>
              <span className="text-gray-500">Type <span className="text-yellow-300 font-medium">{scenario.aircraft_type}</span></span>
              <span className="text-gray-500">Alt <span className="text-white font-medium">{scenario.altitude.toLocaleString()} ft</span></span>
              <span className="text-gray-500">Dest <span className="text-white font-medium">{scenario.destination_id}</span></span>
              <span className="text-gray-500">Callsign <span className="text-white font-medium">{scenario.callsign_display}</span></span>
            </div>

            {!controllerLoading && (
              <RecordingPanel onStart={ffSubmitCall} />
            )}
          </div>
        )}

        {/* ── Grading ── */}
        {phase === 'grading' && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-4xl mb-4">📋</div>
            <p>Generating your debrief...</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            DEBRIEF — shared for both scenario types
        ════════════════════════════════════════════════════════════════════════ */}
        {phase === 'debrief' && debrief && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Debrief</h1>
              <p className="text-gray-400">
                {scenarioType === 'ctaf'
                  ? `CTAF — ${scenario.airport_name} (${scenario.airport_id})`
                  : scenarioType === 'classdarrival'
                    ? `Class D Arrival — ${scenario.airport_name} (${scenario.airport_id})`
                    : scenarioType === 'flightfollowing'
                      ? `Flight Following — ${scenario.facility_name}`
                      : `Class D Departure — ${scenario.airport_name} (${scenario.airport_id})`}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className={`text-7xl font-bold ${scoreColor(debrief.overall_score)}`}>{debrief.overall_score}</div>
              <div className="text-gray-400 text-sm mt-1">overall score</div>
              <p className="text-gray-300 mt-4 leading-relaxed">{debrief.summary}</p>
            </div>

            <div className="space-y-4">
              {(debrief.call_feedback || []).slice(0,
                scenarioType === 'ctaf' ? scenario.steps?.length
                : scenarioType === 'classdarrival' ? classDArrivalExchanges.length
                : scenarioType === 'flightfollowing' ? ffExchanges.length
                : classDExchanges.length + 1
              ).map((cf, i) => (
                <DebriefCard key={i} cf={cf} index={i}
                  steps={scenarioType === 'ctaf' ? scenario.steps : null}
                  calls={scenarioType === 'ctaf' ? ctafCalls : scenarioType === 'classdarrival' ? classDArrivalExchanges : scenarioType === 'flightfollowing' ? ffExchanges : classDExchanges}
                />
              ))}
            </div>

            {isDemo ? (
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-sm text-gray-400 mb-3 text-center">Try another demo scenario:</p>
                  <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {[
                      { key: 'ctaf',            label: '📻 CTAF'          },
                      { key: 'classd',          label: '🛫 Departure'     },
                      { key: 'classdarrival',   label: '🛬 Arrival'       },
                      { key: 'flightfollowing', label: '✈️ Following'     },
                      { key: 'ifr',             label: '📋 IFR Clearance' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => handleTypeChange(opt.key)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${scenarioType === opt.key ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 text-center">
                  <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Nice work</p>
                  <h3 className="text-xl font-bold mb-2">Now do it again — with a different airport, callsign, and scenario.</h3>
                  <p className="text-gray-400 mb-6">The full version randomizes everything every session. That's how you build the kind of confidence that doesn't disappear when ATC calls your tail number. Unlimited reps across all five scenario types.</p>
                  <a href="/signup" className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold transition">Start Practicing — $29/mo</a>
                  <p className="text-gray-600 text-xs mt-4">Cancel anytime.</p>
                </div>
              </div>
            ) : (
              <button onClick={() => loadScenario(scenarioType, false)} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
                Try Another Scenario →
              </button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            IFR CLEARANCE — full flow (listen → record readback → results)
        ════════════════════════════════════════════════════════════════════════ */}
        {scenarioType === 'ifr' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">ATC Radio Lab</h1>
              <p className="text-gray-400">IFR Clearance Readback</p>
            </div>

            {ifrIsLoading ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-4">📋</div>
                <p>Loading your clearance...</p>
              </div>
            ) : ifrScenario ? (
              <div className="space-y-6">
                {/* Scenario info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Your Scenario</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-gray-500 mb-1">Callsign</p><p className="text-xl font-bold text-blue-400">{ifrScenario.callsign}</p></div>
                    <div><p className="text-xs text-gray-500 mb-1">{ifrScenario.destination ? 'Departure Airport' : 'Airport'}</p><p className="text-xl font-bold text-blue-400">{ifrScenario.airport}</p></div>
                    {ifrScenario.destination && (
                      <div className="col-span-2"><p className="text-xs text-gray-500 mb-1">Destination</p><p className="text-xl font-bold text-blue-400">{ifrScenario.destination}</p></div>
                    )}
                  </div>
                </div>

                {/* Step 1 — Listen */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Step 1 — Listen to the Clearance</h2>
                  {ifrAudioUrl && <audio ref={ifrAudioRef} src={ifrAudioUrl} />}
                  <button onClick={() => ifrAudioRef.current?.play()}
                    className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition">
                    ▶ Play Clearance
                  </button>
                  <p className="text-gray-500 text-sm mt-3">Write it down as you listen — CRAFT format. Then read it back.</p>
                </div>

                {/* Step 2 — Record */}
                {!ifrShowResults && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Step 2 — Record Your Readback</h2>
                    <RecordingPanel onStart={ifrSubmitCall} />
                    {ifrIsGrading && <p className="text-gray-400 mt-3 text-sm animate-pulse">Grading your readback...</p>}
                  </div>
                )}

                {/* Results */}
                {ifrShowResults && (
                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                      <h2 className="text-sm text-gray-400 uppercase tracking-wide">Results</h2>
                      <div className="text-center">
                        <div className={`text-7xl font-bold ${scoreColor(ifrScore)}`}>{ifrScore}</div>
                        <div className="text-gray-400 text-sm mt-1">out of 100</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">Feedback</p>
                        <p className="text-gray-200">{ifrFeedback}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-2">Original Clearance</p>
                          <p className="text-gray-200 text-sm">{ifrScenario.clearance_text}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                          <p className="text-xs text-gray-500 mb-2">Your Readback</p>
                          <p className="text-gray-200 text-sm">{ifrReadbackText}</p>
                        </div>
                      </div>
                    </div>

                    {isDemo ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 text-center">
                        <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-2">Nice work</p>
                        <h3 className="text-xl font-bold mb-2">CRAFT starts to feel automatic around rep 20. You're on rep 1.</h3>
                        <p className="text-gray-400 mb-6">The full version generates different airports, departure procedures, altitudes, and squawk codes every session — so the format becomes second nature before your checkride. Unlimited IFR clearances, plus all four other scenario types.</p>
                        <a href="/signup" className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold transition">Keep Practicing — $29/mo</a>
                        <p className="text-gray-600 text-xs mt-4">Cancel anytime.</p>
                      </div>
                    ) : (
                      <button onClick={() => loadIFRScenario(false)} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
                        Next Scenario →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

      </div>
    </main>
  )
}
