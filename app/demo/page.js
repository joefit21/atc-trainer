'use client'
import { useState, useRef, useEffect } from 'react'

export default function Demo() {
  const [scenarioType, setScenarioType] = useState('ground')
  const [scenario, setScenario] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isLoadingScenario, setIsLoadingScenario] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [readbackText, setReadbackText] = useState('')
  const [score, setScore] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [showResults, setShowResults] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioRef = useRef(null)

  useEffect(() => { loadScenario('ground') }, [])

  const loadScenario = async (type) => {
    setIsLoadingScenario(true)
    setShowResults(false)
    setReadbackText('')
    setScore(null)
    setFeedback('')
    setAudioUrl(null)
    const res = await fetch(`/api/demo-scenario?type=${type}`)
    const data = await res.json()
    setScenario(data)
    setAudioUrl(data.audio_url)
    setIsLoadingScenario(false)
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    audioChunksRef.current = []
    mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      await transcribeAndGrade(audioBlob)
    }
    mediaRecorderRef.current.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    setIsRecording(false)
  }

  const transcribeAndGrade = async (audioBlob) => {
    setIsTranscribing(true)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'readback.webm')
    const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData })
    const { text } = await transcribeRes.json()
    setReadbackText(text)
    setIsTranscribing(false)
    setIsGrading(true)
    const gradeRes = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearance_text: scenario.clearance_text, readback_text: text, scenario_type: scenarioType })
    })
    const result = await gradeRes.json()
    setScore(result.score)
    setFeedback(result.feedback)
    setIsGrading(false)
    setShowResults(true)
  }

  const switchType = (type) => { setScenarioType(type); loadScenario(type) }
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400'

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <a href="/" className="text-xl font-bold">✈️ ATC Trainer</a>
        <div className="flex items-center gap-4">
          <span className="text-yellow-400 text-sm font-medium">🔓 Demo Mode</span>
          <a href="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition">
            Subscribe — $15/mo
          </a>
        </div>
      </nav>

      <div className="bg-blue-500/10 border-b border-blue-500/20 px-8 py-3 text-center">
        <p className="text-blue-300 text-sm">
          🎯 <strong>Demo Mode</strong> — Practice with 2 fixed scenarios.
          <a href="/signup" className="underline ml-2 hover:text-blue-200">Subscribe for unlimited random scenarios →</a>
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex gap-2 mb-8 bg-white/5 rounded-xl p-1 w-fit">
          <button onClick={() => switchType('ground')}
            className={`px-6 py-2 rounded-lg font-medium transition ${scenarioType === 'ground' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            Ground Control
          </button>
          <button onClick={() => switchType('ifr')}
            className={`px-6 py-2 rounded-lg font-medium transition ${scenarioType === 'ifr' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            IFR Clearance
          </button>
        </div>

        {isLoadingScenario ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">🛫</div>
            <p>Loading your scenario...</p>
          </div>
        ) : scenario ? (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Your Scenario</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Callsign / Tail Number</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.callsign}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{scenario.destination ? 'Departure Airport' : 'Airport'}</p>
                  <p className="text-xl font-bold text-blue-400">{scenario.airport}</p>
                </div>
                {scenario.destination && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Destination Airport</p>
                    <p className="text-xl font-bold text-blue-400">{scenario.destination}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Step 1 — Listen to the Clearance</h2>
              {audioUrl && <audio ref={audioRef} src={audioUrl} />}
              <button onClick={() => audioRef.current?.play()}
                className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold transition">
                ▶ Play Clearance
              </button>
              <p className="text-gray-500 text-sm mt-3">Write down the clearance as you listen, then read it back.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wide mb-4">Step 2 — Record Your Readback</h2>
              {!isRecording ? (
                <button onClick={startRecording} disabled={isTranscribing || isGrading}
                  className="flex items-center gap-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition">
                  🎙️ Start Recording
                </button>
              ) : (
                <button onClick={stopRecording}
                  className="flex items-center gap-3 bg-red-700 px-6 py-3 rounded-lg font-semibold animate-pulse">
                  ⏹ Stop Recording
                </button>
              )}
              {isTranscribing && <p className="text-gray-400 mt-3 text-sm">Transcribing your readback...</p>}
              {isGrading && <p className="text-gray-400 mt-3 text-sm">Grading your readback...</p>}
            </div>

            {showResults && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                  <h2 className="text-sm text-gray-400 uppercase tracking-wide">Results</h2>
                  <div className="text-center">
                    <div className={`text-7xl font-bold ${scoreColor}`}>{score}</div>
                    <div className="text-gray-400 text-sm mt-1">out of 100</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Feedback</p>
                    <p className="text-gray-200">{feedback}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-2">Original Clearance</p>
                      <p className="text-gray-200 text-sm">{scenario.clearance_text}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-2">Your Readback</p>
                      <p className="text-gray-200 text-sm">{readbackText}</p>
                    </div>
                  </div>
                  <button onClick={() => loadScenario(scenarioType)}
                    className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-lg font-semibold transition text-gray-300">
                    ↺ Try This Scenario Again
                  </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8 text-center">
                  <div className="text-3xl mb-3">🚀</div>
                  <h3 className="text-2xl font-bold mb-2">Ready for unlimited practice?</h3>
                  <p className="text-gray-400 mb-6">
                    The demo gives you 2 fixed scenarios. Subscribe to get unlimited random clearances — new airports, callsigns, and routes every time.
                  </p>
                  <a href="/signup"
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-10 py-4 rounded-lg text-lg font-semibold transition">
                    Subscribe for $15/mo →
                  </a>
                  <p className="text-gray-500 text-sm mt-3">Cancel anytime.</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  )
}
