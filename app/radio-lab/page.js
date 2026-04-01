'use client'
import { useState, useRef, useEffect } from 'react'

export default function RadioLab() {
  const [phase, setPhase] = useState('loading') // loading | ready | practicing | grading | debrief | error
  const [scenario, setScenario] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [calls, setCalls] = useState([])
  const [currentTranscription, setCurrentTranscription] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [debrief, setDebrief] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => { loadScenario() }, [])

  const loadScenario = async () => {
    setPhase('loading')
    setCurrentStep(0)
    setCalls([])
    setCurrentTranscription('')
    setDebrief(null)
    setErrorMessage('')
    try {
      const res = await fetch('/api/vfr-scenario?type=ctaf')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScenario(data)
      setPhase('ready')
    } catch (e) {
      setErrorMessage(e.message || 'Failed to load scenario.')
      setPhase('error')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'call.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const { text } = await res.json()
          setCurrentTranscription(text || '')
        } catch {
          setCurrentTranscription('[transcription failed — type your call below or re-record]')
        }
        setIsTranscribing(false)
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch {
      alert('Microphone access is required. Please allow microphone permissions and try again.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    setIsRecording(false)
  }

  const saveCallAndAdvance = async () => {
    const step = scenario.steps[currentStep]
    const updatedCalls = [...calls, {
      step: currentStep,
      phase: step.phase,
      situation: step.situation,
      transcription: currentTranscription,
    }]
    setCalls(updatedCalls)
    setCurrentTranscription('')

    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setPhase('grading')
      try {
        const res = await fetch('/api/vfr-grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario, calls: updatedCalls }),
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        if (!result.call_feedback) throw new Error('Debrief response was missing call feedback.')
        setDebrief(result)
        setPhase('debrief')
      } catch (e) {
        setErrorMessage(e.message || 'Debrief failed. Please try again.')
        setPhase('error')
      }
    }
  }

  const scoreColor  = (s) => s >= 90 ? 'text-green-400'  : s >= 70 ? 'text-yellow-400'  : 'text-red-400'
  const scoreBorder = (s) => s >= 90 ? 'border-green-400/20' : s >= 70 ? 'border-yellow-400/20' : 'border-red-400/20'

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <a href="/" className="text-xl font-bold">✈️ ATC Trainer</a>
        <span className="text-xs text-yellow-400 border border-yellow-400/30 px-3 py-1 rounded-full">
          🔬 Radio Lab — Dev Preview
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Loading */}
        {phase === 'loading' && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-4xl mb-4">📻</div>
            <p>Loading scenario...</p>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="text-center py-24 space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-400 font-semibold">Something went wrong</p>
            <p className="text-gray-400 text-sm">{errorMessage}</p>
            <button
              onClick={loadScenario}
              className="mt-4 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ready */}
        {phase === 'ready' && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">VFR Radio Lab</h1>
              <p className="text-gray-400">CTAF — Uncontrolled Airport Arrival</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Airport</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.airport_id}</p>
                  <p className="text-sm text-gray-400">{scenario.airport_name}, {scenario.airport_state}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">CTAF Frequency</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.ctaf}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Runway in Use</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.runway}</p>
                  <p className="text-sm text-gray-400">{scenario.pattern} traffic</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your Aircraft</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.callsign_display}</p>
                  <p className="text-sm text-gray-400">{scenario.aircraft_type}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">You Will Make 5 Calls</h2>
              <div className="space-y-2">
                {scenario.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-500 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step.situation.split('.')[0]}.</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPhase('practicing')}
              className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition"
            >
              Start Scenario →
            </button>
          </div>
        )}

        {/* Practicing */}
        {phase === 'practicing' && scenario && (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              {scenario.steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < currentStep ? 'bg-green-400' : i === currentStep ? 'bg-blue-400' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400">Call {currentStep + 1} of {scenario.steps.length}</p>

            {/* Situation */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Current Situation</h2>
              <p className="text-white text-lg leading-relaxed">{scenario.steps[currentStep].situation}</p>
              <p className="text-gray-500 text-sm mt-4">💡 {scenario.steps[currentStep].hint}</p>
            </div>

            {/* Quick reference strip */}
            <div className="flex gap-6 text-sm bg-white/3 border border-white/5 rounded-xl px-4 py-3">
              <span className="text-gray-500">CTAF <span className="text-white font-medium">{scenario.ctaf}</span></span>
              <span className="text-gray-500">Runway <span className="text-white font-medium">{scenario.runway} {scenario.pattern}</span></span>
              <span className="text-gray-500">Callsign <span className="text-white font-medium">{scenario.callsign_display}</span></span>
            </div>

            {/* Recording interface */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              {!currentTranscription && !isTranscribing && (
                <div className="space-y-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-3 bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-semibold transition"
                    >
                      🎙️ Record Your Call
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-3 bg-red-700 px-6 py-3 rounded-lg font-semibold animate-pulse"
                    >
                      ⏹ Stop Recording
                    </button>
                  )}
                  {isRecording && (
                    <p className="text-red-400 text-sm">Recording... make your CTAF call now.</p>
                  )}
                </div>
              )}

              {isTranscribing && (
                <p className="text-gray-400 text-sm">Transcribing...</p>
              )}

              {currentTranscription && !isTranscribing && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">You said</p>
                    <p className="text-gray-200 italic">&ldquo;{currentTranscription}&rdquo;</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentTranscription('')}
                      className="flex-1 border border-white/20 hover:border-white/40 py-3 rounded-lg font-semibold transition text-sm"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={saveCallAndAdvance}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 py-3 rounded-lg font-semibold transition"
                    >
                      {currentStep < scenario.steps.length - 1 ? 'Next Call →' : 'Finish & Get Debrief →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grading */}
        {phase === 'grading' && (
          <div className="text-center py-24 text-gray-400">
            <div className="text-4xl mb-4">📋</div>
            <p>Generating your debrief...</p>
          </div>
        )}

        {/* Debrief */}
        {phase === 'debrief' && debrief && scenario && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Debrief</h1>
              <p className="text-gray-400">CTAF — {scenario.airport_name} ({scenario.airport_id})</p>
            </div>

            {/* Overall score */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className={`text-7xl font-bold ${scoreColor(debrief.overall_score)}`}>
                {debrief.overall_score}
              </div>
              <div className="text-gray-400 text-sm mt-1">overall score</div>
              <p className="text-gray-300 mt-4 leading-relaxed">{debrief.summary}</p>
            </div>

            {/* Per-call breakdown */}
            <div className="space-y-4">
              {(debrief.call_feedback || []).slice(0, scenario.steps.length).map((cf, i) => (
                <div key={i} className={`border rounded-2xl p-5 bg-white/3 ${scoreBorder(cf.score)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-300">
                      Call {i + 1} — {(scenario.steps[i]?.phase || '').replace(/_/g, ' ')}
                    </span>
                    <span className={`text-2xl font-bold ${scoreColor(cf.score)}`}>{cf.score}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{scenario.steps[i]?.situation}</p>
                  <div className="bg-black/20 rounded-lg px-4 py-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">You said</p>
                    <p className="text-sm text-gray-300 italic">
                      &ldquo;{cf.what_you_said || calls[i]?.transcription || '—'}&rdquo;
                    </p>
                  </div>
                  {cf.key_issue && (
                    <p className="text-sm text-yellow-400 mb-2">⚠ {cf.key_issue}</p>
                  )}
                  {cf.feedback && (
                    <p className="text-sm text-gray-300">{cf.feedback}</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={loadScenario}
              className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold text-lg transition"
            >
              Try Another Scenario →
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
