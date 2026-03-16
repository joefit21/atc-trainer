export default function Privacy() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block">← Back to Home</a>
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect the following information when you use ATC Trainer:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
              <li><strong className="text-gray-300">Account information:</strong> Email address and password (encrypted) when you create an account</li>
              <li><strong className="text-gray-300">Payment information:</strong> Processed securely by Stripe. We do not store your credit card details.</li>
              <li><strong className="text-gray-300">Usage data:</strong> Your readback recordings (used only for transcription and scoring), scenario scores, and feedback</li>
              <li><strong className="text-gray-300">Technical data:</strong> Browser type, device information, and IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
              <li>Provide and improve the Service</li>
              <li>Process your subscription payments</li>
              <li>Transcribe and score your readback recordings using AI</li>
              <li>Send account-related communications</li>
              <li>Analyze usage patterns to improve training content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Voice Recordings</h2>
            <p>When you record a readback, your audio is sent to OpenAI's Whisper API for transcription. Audio is processed in real time and is not permanently stored by ATC Trainer or OpenAI beyond the duration of the transcription request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-400">
              <li><strong className="text-gray-300">Supabase</strong> — database and authentication</li>
              <li><strong className="text-gray-300">Stripe</strong> — payment processing</li>
              <li><strong className="text-gray-300">OpenAI</strong> — voice transcription and audio generation</li>
              <li><strong className="text-gray-300">Anthropic</strong> — AI readback scoring and feedback</li>
              <li><strong className="text-gray-300">Vercel</strong> — hosting and infrastructure</li>
            </ul>
            <p className="mt-3">Each of these services has their own privacy policies governing their use of data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal information. We do not share your data with third parties except as necessary to provide the Service (as described in Section 4) or as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>We retain your account information and score history for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Security</h2>
            <p>We take reasonable measures to protect your information, including encrypted passwords and secure HTTPS connections. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Children's Privacy</h2>
            <p>ATC Trainer is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the site.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>For privacy questions or data deletion requests, contact us at <a href="mailto:joe@flight-levels.com" className="text-blue-400 hover:text-blue-300">joe@flight-levels.com</a>.</p>
          </section>

        </div>
      </div>
    </main>
  )
}
