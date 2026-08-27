'use client'

import { useRef, useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Smile, Paperclip, Image, File as FileIcon, Film, Music, Loader2, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';
import { useUploadQueue, usePasteFiles } from '@/hooks/useUploadQueue';
import { useAuth } from '@/hooks/useAuth';
import { generatePromptPayQR } from '@/lib/promptpay';

// Lazy-load emoji picker to keep initial bundle small.
const Picker = lazy(() => import('@emoji-mart/react'));

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  replyTo?: Message | null;
  onClearReply?: () => void;
  placeholder?: string;
  conversationId: string;
  messageId: string;
  onAttachmentsChange?: (attachments: import('@/types').MessageAttachment[]) => void;
}

export default function MessageComposer({
  value,
  onChange,
  onSend,
  sending = false,
  replyTo,
  onClearReply,
  placeholder,
  conversationId,
  messageId,
  onAttachmentsChange,
}: MessageComposerProps) {
  const { t } = useTranslation(['messages', 'common']);
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sharingQr, setSharingQr] = useState(false);
  const { items, addFiles, removeItem, uploadAll, hasPending, hasErrors, clear } = useUploadQueue({
    conversationId,
    messageId,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  useEffect(() => {
    // Notify parent of attachment changes (e.g., after uploads complete)
    const done = items.filter((i) => i.status === 'done' && i.attachment).map((i) => i.attachment!);
    onAttachmentsChange?.(done);
  }, [items, onAttachmentsChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const insertEmoji = (emoji: { native: string }) => {
    onChange(value + emoji.native);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // The picker is rendered via a portal to <body> and positioned with
  // fixed coordinates anchored to the trigger button's viewport rect, so it
  // can't be clipped by an `overflow-hidden` ancestor (e.g. the chat widget
  // panel). Recomputed on open and kept in sync on resize/scroll while open.
  const PICKER_WIDTH = 320;
  const PICKER_HEIGHT = 400;
  const updatePickerPos = useCallback(() => {
    const btn = emojiButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    let left = rect.left;
    if (left + PICKER_WIDTH > window.innerWidth - margin) {
      left = window.innerWidth - PICKER_WIDTH - margin;
    }
    if (left < margin) left = margin;

    let top = rect.top - PICKER_HEIGHT - margin;
    if (top < margin) {
      // Not enough room above the button — place it below instead.
      top = rect.bottom + margin;
    }
    setPickerPos({ top, left });
  }, []);

  const toggleEmoji = () => {
    if (!showEmoji) updatePickerPos();
    setShowEmoji((s) => !s);
  };

  useEffect(() => {
    if (!showEmoji) return;
    updatePickerPos();
    window.addEventListener('resize', updatePickerPos);
    window.addEventListener('scroll', updatePickerPos, true);
    return () => {
      window.removeEventListener('resize', updatePickerPos);
      window.removeEventListener('scroll', updatePickerPos, true);
    };
  }, [showEmoji, updatePickerPos]);

  const handleSend = async () => {
    if (hasErrors) {
      // Retry failed uploads on send
      const attachments = await uploadAll();
      if (attachments.length > 0 || !hasPending) {
        onSend();
        clear();
      }
      return;
    }
    if (hasPending) {
      const attachments = await uploadAll();
      if (attachments.length > 0 || items.every((i) => i.status === 'done' || i.status === 'error')) {
        onSend();
        clear();
      }
      return;
    }
    onSend();
  };

  const handlePaste = usePasteFiles((files) => addFiles(files));

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleShareQr = async () => {
    if (!user?.promptpay_id) {
      toast.error(t('messages:paymentQrMissing'));
      return;
    }
    setSharingQr(true);
    try {
      const dataUrl = await generatePromptPayQR(user.promptpay_id);
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], 'promptpay-qr.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      addFiles(dt.files);
    } catch (error) {
      console.error('Failed to generate payment QR:', error);
      toast.error(t('messages:paymentQrError'));
    } finally {
      setSharingQr(false);
    }
  };

  const categoryIcon = (category: string) => {
    switch (category) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Film className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`border-t border-white/10 p-4 space-y-2 transition-colors ${isDragging ? 'bg-emerald-500/10' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isDragging && (
        <div className="text-center text-sm text-emerald-400 py-2">
          {t('messages:dropFiles')}
        </div>
      )}

      {replyTo && (
        <div className="flex items-start gap-2 bg-zinc-900/50 rounded-lg p-2 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-400">
              {t('messages:replyingTo', { name: replyTo.sender?.display_name || 'Unknown' })}
            </p>
            <p className="text-sm text-zinc-300 truncate">{replyTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={onClearReply}
            aria-label={t('common:actions.clear')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {items.some((i) => i.file.name === 'promptpay-qr.png') && (
        <p className="text-[11px] text-amber-400/90">{t('messages:paymentQrSafetyTip')}</p>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs ${
                item.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-white/10 bg-zinc-900 text-zinc-300'
              }`}
            >
              {item.previewUrl && item.category === 'image' ? (
                <img src={item.previewUrl} alt="" className="w-8 h-8 object-cover rounded" />
              ) : (
                categoryIcon(item.category)
              )}
              <span className="max-w-[120px] truncate">{item.file.name}</span>
              {item.status === 'uploading' && (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{item.progress}%</span>
                </div>
              )}
              {item.status === 'error' && <span className="text-[10px] text-red-300">{item.error}</span>}
              <button
                onClick={() => removeItem(item.id)}
                className="text-zinc-500 hover:text-white"
                aria-label={t('common:actions.remove')}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="relative">
          <Button
            ref={emojiButtonRef}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/10"
            onClick={toggleEmoji}
            aria-label={t('messages:addEmoji')}
          >
            <Smile className="w-5 h-5" />
          </Button>
          {showEmoji && pickerPos && typeof document !== 'undefined' && createPortal(
            <div className="fixed z-[70]" style={{ top: pickerPos.top, left: pickerPos.left }}>
              <Suspense fallback={<div className="w-[320px] h-[400px] bg-zinc-900 rounded-lg animate-pulse" />}>
                <Picker
                  data={async () => {
                    const data = await import('@emoji-mart/data');
                    return data.default;
                  }}
                  onEmojiSelect={insertEmoji}
                  theme="dark"
                />
              </Suspense>
            </div>,
            document.body
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/10"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('messages:attachFile')}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/10"
          onClick={handleShareQr}
          disabled={sharingQr}
          aria-label={t('messages:sharePaymentQr')}
          title={t('messages:sharePaymentQr')}
        >
          {sharingQr ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={placeholder || t('messages:typeMessage')}
          rows={1}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none min-h-[42px]"
        />
        <Button
          onClick={handleSend}
          disabled={(!value.trim() && !hasPending) || sending}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:hover:bg-emerald-500 text-black rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50 flex-shrink-0 h-[42px]"
          aria-label={t('messages:sendAria')}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
