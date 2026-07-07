import { Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';

const TOPICS = [
  { value: 'General Question', key: 'general' },
  { value: 'Buying Help', key: 'buying' },
  { value: 'Selling Help', key: 'selling' },
  { value: 'Dispute Question', key: 'dispute' },
  { value: 'Bug Report', key: 'bug' },
  { value: 'Partnership', key: 'partnership' },
];

const FAQS = [
  { qKey: 'startSelling', aKey: 'startSellingAnswer' },
  { qKey: 'damaged', aKey: 'damagedAnswer' },
  { qKey: 'qr', aKey: 'qrAnswer' },
  { qKey: 'commonPlants', aKey: 'commonPlantsAnswer' },
  { qKey: 'paid', aKey: 'paidAnswer' },
];

export default function ContactPage() {
  const { t } = useTranslation(['common']);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', topic: 'General Question', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t('common:contact.form.required'));
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    setSubmitting(false);
    setSubmitted(true);
    toast.success(t('common:contact.form.successToast'));

    const subject = encodeURIComponent(`ROOTS contact: ${form.topic}`);
    const body = encodeURIComponent(
      `Name: ${form.name.trim()}\nEmail: ${form.email.trim()}\nTopic: ${form.topic}\n\n${form.message.trim()}`
    );
    window.open(`mailto:rootsthailand1@gmail.com?subject=${subject}&body=${body}`, '_blank');

    logger.info('Contact form submitted', {
      topic: form.topic,
    });
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-light tracking-tight mb-2">{t('common:contact.title')}</h1>
          <p className="text-zinc-500">{t('common:contact.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <a
            href="mailto:rootsthailand1@gmail.com"
            className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center block hover:border-white/15 transition-colors"
          >
            <Mail className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">{t('common:contact.channels.email')}</p>
            <p className="text-sm text-zinc-500">rootsthailand1@gmail.com</p>
            <p className="text-xs text-zinc-600 mt-1">{t('common:contact.channels.responseTime')}</p>
          </a>
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <MapPin className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">{t('common:contact.channels.office')}</p>
            <p className="text-sm text-zinc-500">88/19 Soi Sukhumvit 24</p>
            <p className="text-xs text-zinc-600 mt-1">Klongtoey, Bangkok 10110</p>
          </div>
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
            <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium mb-1">{t('common:contact.channels.hours')}</p>
            <p className="text-sm text-zinc-500">Mon – Sat, 9:00 – 18:00</p>
            <p className="text-xs text-zinc-600 mt-1">{t('common:contact.channels.timezone')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-medium mb-4">{t('common:contact.form.title')}</h2>
            {submitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-emerald-400 font-medium mb-1">{t('common:contact.form.successTitle')}</p>
                <p className="text-sm text-zinc-500">{t('common:contact.form.successMessage')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('common:contact.form.name')}</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('common:contact.form.email')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('common:contact.form.topic')}</label>
                  <select
                    value={form.topic}
                    onChange={e => setForm({ ...form, topic: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                  >
                    {TOPICS.map(topic => (
                      <option key={topic.value} value={topic.value}>{t(`common:contact.topics.${topic.key}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block">{t('common:contact.form.message')}</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-500 text-black font-medium py-2.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? t('common:contact.form.sending') : <><Send className="w-4 h-4" /> {t('common:contact.form.send')}</>}
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">{t('common:contact.faq.title')}</h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-lg p-4">
                  <p className="font-medium text-sm mb-1">{t(`common:contact.faq.${faq.qKey}`)}</p>
                  <p className="text-sm text-zinc-500">{t(`common:contact.faq.${faq.aKey}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
