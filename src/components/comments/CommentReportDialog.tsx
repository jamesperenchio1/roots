'use client'

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportComment } from '@/lib/api';

interface CommentReportDialogProps {
  commentId: string;
  currentUserId?: string;
  onReported?: () => void;
}

export function CommentReportDialog({ commentId, currentUserId, onReported }: CommentReportDialogProps) {
  const { t } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId || !reason) return;
    setSubmitting(true);
    try {
      await reportComment(commentId, currentUserId, reason, details);
      setOpen(false);
      setReason('');
      setDetails('');
      onReported?.();
    } finally {
      setSubmitting(false);
    }
  }

  const reasons = [
    'spam',
    'harassment',
    'misinformation',
    'inappropriate',
    'off_topic',
    'other',
  ];

  if (!currentUserId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          aria-label={t('common:comments.report.label')}
        >
          <Flag className="h-3.5 w-3.5" />
          {t('common:comments.report.label')}
        </button>
      </DialogTrigger>
      <DialogContent closeLabel={t('common:actions.close')} className="border-white/10 bg-zinc-900 text-white sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('common:comments.report.title')}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t('common:comments.report.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="report-reason">{t('common:comments.report.reason')}</Label>
              <Select value={reason} onValueChange={setReason} required>
                <SelectTrigger id="report-reason" className="border-white/10 bg-black/30 text-white">
                  <SelectValue placeholder={t('common:comments.report.selectReason')} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-white">
                  {reasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`common:comments.report.reasons.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="report-details">{t('common:comments.report.details')}</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('common:comments.report.detailsPlaceholder')}
                className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600"
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-zinc-300">
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={!reason || submitting} className="bg-red-600 hover:bg-red-700">
              {submitting ? t('common:actions.saving') : t('common:comments.report.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
