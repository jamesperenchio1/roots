'use client'

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, ImagePlus, X, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createComment, uploadUserImage } from '@/lib/api';
import { supabase } from '@/lib/supabase/client';
import type { Comment, Profile } from '@/types';

interface CommentComposerProps {
  speciesId?: string;
  listingId?: string;
  author: Profile | null | undefined;
  parentComment?: Comment | null;
  onSubmitted?: (comment: Comment) => void;
  onCancelReply?: () => void;
}

export function CommentComposer({ speciesId, listingId, author, parentComment, onSubmitted, onCancelReply }: CommentComposerProps) {
  const { t } = useTranslation(['common']);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ storage_path: string; file_name: string; mime_type: string; width?: number; height?: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!author) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: typeof images = [];
      for (const file of Array.from(files)) {
        const result = await uploadUserImage(file, author.id);
        uploaded.push({
          storage_path: result.storage_path,
          file_name: file.name,
          mime_type: file.type,
        });
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await createComment(
        {
          species_id: speciesId,
          listing_id: listingId,
          parent_comment_id: parentComment?.id,
          content,
          images: images.map((img) => ({
            storage_bucket: 'comment-images',
            ...img,
          })),
        },
        author.id
      );
      setContent('');
      setImages([]);
      onSubmitted?.(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!author) {
    return (
      <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 text-center text-sm text-zinc-400">
        {t('common:comments.loginToJoin')}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/5 bg-zinc-900/30 p-3">
      {parentComment && (
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <CornerDownRight className="h-3.5 w-3.5" />
          {t('common:comments.replyingTo', { author: parentComment.author?.display_name || t('common:unknown') })}
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-auto text-zinc-500 hover:text-zinc-200"
          >
            {t('common:actions.cancel')}
          </button>
        </div>
      )}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={author.avatar_url} alt={author.display_name} />
          <AvatarFallback className="bg-emerald-900/40 text-emerald-100 text-xs">
            {author.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentComment ? t('common:comments.replyPlaceholder') : t('common:comments.placeholder')}
            className="min-h-[80px] resize-y border-white/10 bg-black/30 text-white placeholder:text-zinc-600"
            maxLength={5000}
          />
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => {
                const { data } = supabase.storage.from('comment-images').getPublicUrl(img.storage_path);
                return (
                  <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                    <img src={data.publicUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600"
                      aria-label={t('common:actions.remove')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                {uploading ? t('common:actions.uploading') : t('common:actions.addImage')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="mr-1.5 h-4 w-4" />
              {submitting ? t('common:actions.sending') : t('common:actions.send')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
