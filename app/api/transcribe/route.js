import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Patterns that indicate Whisper hallucinated rather than transcribed real speech
const HALLUCINATION_PATTERNS = [
  /www\./i,
  /\.com/i,
  /\.co\./i,
  /subs by/i,
  /subtitles by/i,
  /transcript/i,
  /facebook\.com/i,
  /youtube\.com/i,
]

export async function POST(request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio')

    // Reject suspiciously small blobs — likely silence or accidental taps
    if (!audioFile || audioFile.size < 3000) {
      return Response.json({ text: '' })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      temperature: 0,
      prompt: 'ATC radio communication. Aviation phraseology: N-number, squawk, altitude, frequency, cleared, roger, wilco, readback, approach, departure, runway, taxiway, hold short, contact.',
    })

    const text = transcription.text?.trim() ?? ''

    // Reject hallucinated output
    if (HALLUCINATION_PATTERNS.some(p => p.test(text))) {
      return Response.json({ text: '' })
    }

    return Response.json({ text })
  } catch {
    return Response.json({ text: '' })
  }
}
