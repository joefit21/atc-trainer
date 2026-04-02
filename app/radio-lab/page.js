'use client'
import { useState, useRef, useEffect } from 'react'

// ─── shared helpers ────────────────────────────────────────────────────────────
const scoreColor  = (s) => s >= 90 ? 'text-green-400'      : s >= 70 ? 'text-yellow-400'      : 'text-red-400'
const scoreBorder = (s) => s >= 90 ? 'border-green-400/20' : s >= 70 ? 'border-yellow-400/20' : 'border-red-400/20'

export default function RadioLab() {
  // ── scenario type ────────────────────────────────────────────────────────────
  const [scenarioType, setScenarioType] = useState('ctaf') // 'ctaf' | 'classd' | 'classdarrival' | 'flightfollowing'

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
  const [classDStep, setClassDStep]                       = useState(0) // 0=ground call, 1=ground readback, 2=tower call, 3=tower readback
  const [classDExchanges, setClassDExchanges]             = useState([])

  // ── Class D arrival state ─────────────────────────────────────────────────────
  const [classDArrivalStep, setClassDArrivalStep]         = useState(0)
  const [classDArrivalExchanges, setClassDArrivalExchanges] = useState([])

  // ── Flight following state ────────────────────────────────────────────────────
  const [ffStep, setFFStep]           = useState(0) // 0=initial call, 1=squawk readback, 2=radar contact ack
  const [ffExchanges, setFFExchanges] = useState([])

  // ── shared controller audio (one scenario runs at a time) ─────────────────────
  const [controllerText, setControllerText]               = useState('')
  const [controllerAudioUrl, setControllerAudioUrl]       = useState(null)
  const [controllerLoading, setControllerLoading]         = useState(false)
  const controllerAudioRef = useRef(null)

  useEffect(() => { loadScenario('ctaf') }, [])

  // Auto-play controller audio as soon as it arrives
  useEffect(() => {
    if (!controllerAudioUrl) return
    const audio = controllerAudioRef.current
    if (!audio) return
    audio.load()
    audio.play().catch(() => {})
  }, [controllerAudioUrl])

  // ── load scenario ─────────────────────────────────────────────────────────────
  const loadScenario = async (type) => {
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
    setControllerText('')
    setControllerAudioUrl(null)
    try {
      const endpoint = type === 'classd'
        ? '/api/vfr-class-d-scenario'
        : type === 'classdarrival'
          ? '/api/vfr-class-d-arrival-scenario'
          : type === 'flightfollowing'
            ? '/api/vfr-flight-following-scenario'
            : '/api/vfr-scenario?type=ctaf'
      const res  = await fetch(endpoint)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScenario(data)
      setPhase('ready')
    } catch (e) {
      setErrorMessage(e.message || 'Failed to load scenario.')
      setPhase('error')
    }
  }

  const handleTypeChange = (type) => {
    setScenarioType(type)
    loadScenario(type)
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
          const res     = await fetch('/api/transcribe', { method: 'POST', body: fd })
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
        const res    = await fetch('/api/vfr-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, calls: updatedCalls }) })
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
        const res    = await fetch('/api/vfr-class-d-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: apiPhase, pilot_said: pilotSaid }) })
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
          const res    = await fetch('/api/vfr-class-d-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges }) })
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
      case 0: return `You are ${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference} at ${scenario.altitude.toLocaleString()} ft MSL, VFR en route to ${scenario.destination_name}. Contact ${scenario.facility_name} on ${scenario.facility_freq} and request flight following.`
      case 1: return `${scenario.facility_name} has assigned you a squawk code. Write it down, then read it back.`
      case 2: return `${scenario.facility_name} has confirmed radar contact and given your altimeter. Acknowledge.`
      default: return ''
    }
  }

  const ffGetHint = (step) => {
    if (!scenario) return ''
    switch (step) {
      case 0: return `Say: "${scenario.facility_name}", aircraft type, callsign, position (${scenario.position_distance} miles ${scenario.position_direction} of ${scenario.position_reference}), altitude (${scenario.altitude.toLocaleString()} ft), VFR to ${scenario.destination_name}, request flight following.`
      case 1: return `Read back: callsign, "squawking [code]", "ident." Write down the code — you'll need it for your transponder.`
      case 2: return `Acknowledge: callsign, "roger." You may also read back the altimeter (${scenario.altimeter}).`
      default: return ''
    }
  }

  const ffGetTitle = (step) => [
    'Request Flight Following',
    'Read Back Squawk Code',
    'Acknowledge Radar Contact',
  ][step] || ''

  const ffIsReadback = (step) => step === 1 || step === 2

  // ── Flight following submit ───────────────────────────────────────────────────
  const ffSubmitCall = async (text) => {
    const pilotSaid = text

    if (ffStep === 0) {
      // Initial call — fetch squawk assignment
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      setFFExchanges(prev => [...prev, {
        step: 0, phase: 'initial_call', situation: ffGetSituation(0), pilot_said: pilotSaid,
      }])
      try {
        const res    = await fetch('/api/vfr-flight-following-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: 'squawk_assignment', pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setFFStep(1)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else if (ffStep === 1) {
      // Squawk readback — save with controller_said (squawk assignment), then fetch radar contact
      const squawkText = controllerText
      setFFExchanges(prev => [...prev, {
        step: 1, phase: 'squawk_readback', situation: ffGetSituation(1),
        controller_said: squawkText, pilot_said: pilotSaid,
      }])
      setControllerLoading(true)
      setControllerText('')
      setControllerAudioUrl(null)
      try {
        const res    = await fetch('/api/vfr-flight-following-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: 'radar_contact', pilot_said: pilotSaid }) })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setControllerText(result.controller_text)
        setControllerAudioUrl(result.audio_url)
        setFFStep(2)
      } catch (e) { setErrorMessage(e.message); setPhase('error') }
      setControllerLoading(false)

    } else {
      // Step 2: radar contact ack — save and grade
      const radarText = controllerText
      const finalExchanges = [...ffExchanges, {
        step: 2, phase: 'radar_contact_ack', situation: ffGetSituation(2),
        controller_said: radarText, pilot_said: pilotSaid,
      }]
      setFFExchanges(finalExchanges)
      setPhase('grading')
      try {
        const res    = await fetch('/api/vfr-flight-following-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges }) })
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
        const res    = await fetch('/api/vfr-class-d-arrival-response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, phase: apiPhase, pilot_said: pilotSaid }) })
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
        const res    = await fetch('/api/vfr-class-d-arrival-grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, exchanges: finalExchanges }) })
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
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <a href="/" className="text-xl font-bold">✈️ ATC Trainer</a>
        <span className="text-xs text-yellow-400 border border-yellow-400/30 px-3 py-1 rounded-full">🔬 Radio Lab — Dev Preview</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Scenario type selector ── */}
        {(phase === 'ready' || phase === 'practicing' || phase === 'classd_pilot' || phase === 'classdarrival_pilot' || phase === 'ff_pilot') && (
          <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1">
            {[
              { key: 'ctaf',           label: '📻 CTAF'       },
              { key: 'classd',         label: '🛫 Departure'  },
              { key: 'classdarrival',  label: '🛬 Arrival'    },
              { key: 'flightfollowing', label: '✈️ Flight Following' },
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
              <h1 className="text-2xl font-bold mb-1">VFR Radio Lab</h1>
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
              <h1 className="text-2xl font-bold mb-1">VFR Radio Lab</h1>
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
              <h1 className="text-2xl font-bold mb-1">VFR Radio Lab</h1>
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
              <h1 className="text-2xl font-bold mb-1">VFR Radio Lab</h1>
              <p className="text-gray-400">VFR Flight Following Request</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 mb-1">Facility</p><p className="text-xl font-bold text-blue-400">{scenario.facility_name}</p><p className="text-sm text-gray-400">{scenario.facility_freq}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Aircraft</p><p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p><p className="text-sm text-gray-400">{scenario.aircraft_type}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Your Position</p><p className="text-lg font-bold text-yellow-400">{scenario.position_distance} miles {scenario.position_direction}</p><p className="text-sm text-gray-400">of {scenario.position_reference}</p></div>
                <div><p className="text-xs text-gray-500 mb-1">Altitude</p><p className="text-xl font-bold text-yellow-400">{scenario.altitude.toLocaleString()} ft MSL</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-500 mb-1">Destination</p><p className="text-lg font-bold text-blue-400">{scenario.destination_name} ({scenario.destination_id})</p></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 3 Transmissions</h2>
              <div className="space-y-2">
                {['Request flight following from ' + scenario.facility_name, 'Read back squawk code + ident', 'Acknowledge radar contact'].map((s, i) => (
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
              {[0,1,2].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < ffStep ? 'bg-green-400' : i === ffStep ? 'bg-blue-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <p className="text-sm text-gray-400">Transmission {ffStep + 1} of 3</p>

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
                  {ffStep === 1 ? 'Squawk assignment — write it down, then read it back' : 'Radar contact confirmed — acknowledge'}
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

            <button onClick={() => loadScenario(scenarioType)} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition">
              Try Another Scenario →
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
