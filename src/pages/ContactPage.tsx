import { Mail, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-tight mb-2">Contact Us</h1>
          <p className="text-zinc-500">We are here to help. Reach out any time.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <Mail className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Email</p>
            <p className="text-sm text-zinc-500">support@root.market</p>
            <p className="text-xs text-zinc-600 mt-1">Response within 24 hours</p>
          </div>
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <MapPin className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Office</p>
            <p className="text-sm text-zinc-500">88/19 Soi Sukhumvit 24</p>
            <p className="text-xs text-zinc-600 mt-1">Klongtoey, Bangkok 10110</p>
          </div>
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Support Hours</p>
            <p className="text-sm text-zinc-500">Mon – Sat, 9:00 – 18:00</p>
            <p className="text-xs text-zinc-600 mt-1">ICT (Bangkok time)</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-medium mb-4">Send a Message</h2>
            {submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <p className="text-emerald-400 font-medium mb-1">Message sent!</p>
                <p className="text-sm text-zinc-500">We will get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Name</label>
                  <input type="text" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" required />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Email</label>
                  <input type="email" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" required />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Topic</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50">
                    <option>General Question</option>
                    <option>Buying Help</option>
                    <option>Selling Help</option>
                    <option>Dispute Question</option>
                    <option>Bug Report</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">Message</label>
                  <textarea rows={5} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 resize-none" required />
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-black font-medium py-2.5 rounded-lg hover:bg-emerald-600 transition-colors">
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Common Questions</h2>
            <div className="space-y-4">
              {[
                { q: 'How do I start selling?', a: 'Create an account, go to Seller Dashboard, and click "New Listing". You will need a PromptPay ID for payouts.' },
                { q: 'What if my plant arrives damaged?', a: 'Open a dispute within 48 hours of delivery. Upload photos and our team will review within 24 hours.' },
                { q: 'How does the QR provenance work?', a: 'When you list a plant, we generate a unique QR code. Attach it to the plant. Every future owner can scan it to see full history.' },
                { q: 'Can I sell common plants like basil?', a: 'Absolutely. Root is for every plant — from 10-baht basil cuttings to rare variegated monsters.' },
                { q: 'When do I get paid as a seller?', a: 'Funds are released 48 hours after delivery confirmation (or auto-confirmed). Payouts process within 1-2 business days.' },
              ].map((faq, i) => (
                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-lg p-4">
                  <p className="font-medium text-sm mb-1">{faq.q}</p>
                  <p className="text-sm text-zinc-500">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
