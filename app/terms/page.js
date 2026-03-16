export default function Terms() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block">← Back to Home</a>
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using ATC Trainer ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>ATC Trainer is an aviation training tool that provides simulated ATC clearance practice scenarios, voice recording, AI-powered transcription, and readback scoring. It is intended for educational purposes only and does not replace formal flight training or instruction from a certified flight instructor.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Subscription and Billing</h2>
            <p>Access to the full Service requires a paid subscription at $29 per month. Subscriptions are billed monthly and renew automatically until canceled. You may cancel at any time through your account settings. No refunds are issued for partial months.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Free Demo</h2>
            <p>A limited free demo is available without an account. The demo provides access to fixed practice scenarios and does not require payment information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. User Responsibilities</h2>
            <p>You agree to provide accurate account information and to keep your login credentials secure. You are responsible for all activity under your account. You may not share your account with others or use the Service for any unlawful purpose.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>All content, scenarios, audio, and software associated with ATC Trainer are the property of Flight Levels and are protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. ATC Trainer does not guarantee that practice scenarios reflect current FAA procedures, that AI scoring is 100% accurate, or that use of the Service will result in passing any aviation checkride or proficiency test.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ATC Trainer and its owners shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:joe@flight-levels.com" className="text-blue-400 hover:text-blue-300">joe@flight-levels.com</a>.</p>
          </section>

        </div>
      </div>
    </main>
  )
}
