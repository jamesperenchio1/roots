export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-light tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 mb-8">Last updated: June 1, 2025</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect the following information to operate Root Plant Market:</p>
            <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 space-y-2 text-sm">
              <p><span className="text-white">Account:</span> Email, display name, password hash, profile photo (optional)</p>
              <p><span className="text-white">Shipping:</span> Name, address, district, province, postal code, phone number</p>
              <p><span className="text-white">Payment:</span> PromptPay ID (phone or national ID number) — we do not store bank details</p>
              <p><span className="text-white">Listings:</span> Photos, descriptions, pricing, plant species information</p>
              <p><span className="text-white">Transactions:</span> Purchase history, sale history, dispute records</p>
              <p><span className="text-white">Usage:</span> Pages visited, searches made, device type, IP address</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-500">
              <li>To provide the marketplace service — connecting buyers and sellers</li>
              <li>To process payments via Omise PromptPay</li>
              <li>To generate QR provenance codes for plants</li>
              <li>To calculate and display aggregate price history (anonymous)</li>
              <li>To resolve disputes between users</li>
              <li>To send order updates, payment confirmations, and platform notifications</li>
              <li>To detect fraud, abuse, and market manipulation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">3. What We Share</h2>
            <p>We do not sell your personal data. We only share:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              <li><strong>Seller to buyer (post-payment):</strong> Your shipping address is shared with the seller only after you pay</li>
              <li><strong>Buyer to seller (post-payment):</strong> Your display name and contact details are shared with the seller</li>
              <li><strong>Omise:</strong> Payment processing data is shared with our payment provider Omise</li>
              <li><strong>Legal:</strong> We may disclose data if required by Thai law or court order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">4. Price Data and Anonymity</h2>
            <p>All price history data displayed on Root is fully anonymous. We aggregate sale prices by species and date. Individual transactions, buyer identities, and seller identities are never shown in price graphs. Even logged-in users cannot see who bought or sold at a specific price point.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">5. Data Retention</h2>
            <p>We retain your account data as long as you maintain an account. Transaction records are retained for 7 years for tax and legal compliance. If you delete your account, your display name is anonymized in provenance chains but the transaction record itself is preserved as it forms part of plant history.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">6. Security</h2>
            <p>We use industry-standard security measures: Supabase Row-Level Security on all database tables, HTTPS encryption, HMAC-signed QR codes, and webhook signature verification for payment processing. However, no internet transmission is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">7. Your Rights</h2>
            <p>Under Thai personal data protection law (PDPA), you have the right to access, correct, delete, and port your personal data. Contact us at privacy@root.market to exercise these rights. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">8. Contact</h2>
            <p>For privacy-related questions, email <span className="text-emerald-400">privacy@root.market</span> or write to Root Plant Market Co., Ltd., 88/19 Soi Sukhumvit 24, Klongton, Klongtoey, Bangkok 10110.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
