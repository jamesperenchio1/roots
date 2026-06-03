export default function TermsPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-light tracking-tight mb-2">Terms of Service</h1>
        <p className="text-zinc-500 mb-8">Last updated: June 1, 2025</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Root Plant Market ("Root", "we", "us"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform. Root is a marketplace connecting buyers and sellers of plants within Thailand. We are not a party to any transaction between users.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">2. Eligibility</h2>
            <p>You must be at least 18 years old and resident in Thailand to use Root. By creating an account, you represent that you meet these requirements. Accounts registered by automated methods are not permitted.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">3. Account Registration</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use. Root reserves the right to suspend accounts that violate these terms or receive multiple valid reports from other users.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">4. Listing and Selling</h2>
            <p>When you create a listing on Root, you agree that:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              <li>You are the legal owner of the plant or authorized to sell it</li>
              <li>The description, photos, and condition are accurate and not misleading</li>
              <li>The plant is not illegally collected from wild populations (CITES restrictions apply)</li>
              <li>You will ship the plant within 48 hours of payment confirmation</li>
              <li>You will attach the QR provenance tag to the physical plant before shipping</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">5. Buying</h2>
            <p>When you purchase a plant on Root, you agree that:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
              <li>You will complete payment within 15 minutes of initiating checkout</li>
              <li>You will confirm receipt within 48 hours of delivery (or auto-confirm)</li>
              <li>You understand plants are living organisms and some stress from shipping is normal</li>
              <li>You will open disputes within 48 hours of delivery if there are issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">6. Fees</h2>
            <p>Root charges an 8% platform fee on the sale price, deducted from the seller's payout. There are no listing fees, no monthly fees, and no buyer fees. Payouts are processed to the seller's registered PromptPay ID within 1-2 business days of transaction completion.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">7. Prohibited Items</h2>
            <p>The following may not be listed on Root: illegally collected wild plants (without proper permits), plants restricted under CITES Appendix I, seeds of invasive species, synthetic/chemical plant growth regulators offered for human consumption, and any item that violates Thai law.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">8. Disputes and Refunds</h2>
            <p>Disputes must be opened within 48 hours of delivery. Root's dispute resolution team will review evidence from both parties. Decisions may result in full refund to buyer, full release to seller, or partial refund. All decisions are final. Root reserves the right to ban users who abuse the dispute system.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">9. QR Provenance</h2>
            <p>The QR code system is a feature for tracking plant ownership history. Root does not guarantee the accuracy of information entered by users. The QR code remains active even if a user deletes their account, as ownership history is permanent.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">10. Limitation of Liability</h2>
            <p>Root is a marketplace platform, not a seller. We are not liable for the quality, safety, or legality of plants listed. Our total liability to you for any claim arising from your use of Root shall not exceed the amount you paid to Root in fees in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of Thailand. Any dispute shall be resolved in the courts of Bangkok.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
