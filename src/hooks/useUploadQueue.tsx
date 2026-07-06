import { useState, useCallback, useRef } from 'react';
import { uploadMessageAttachment } from '@/lib/messaging';
import type { MessageAttachment } from '@/types';
import { validateAttachmentFile } from '@/lib/validation';

export interface UploadQueueItem {
  id: string;
  file: File;
  category: 'image' | 'video' | 'audio' | 'file';
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
  attachment?: MessageAttachment;
  previewUrl?: string;
}

interface UseUploadQueueOptions {
  conversationId: string;
  messageId: string;
}

export function useUploadQueue({ conversationId, messageId }: UseUploadQueueOptions) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const abortControllers = useRef<Record<string, AbortController>>({});

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newItems: UploadQueueItem[] = [];
    Array.from(files).forEach((file) => {
      const validation = validateAttachmentFile(file);
      if (!validation.ok || !validation.category) {
        newItems.push({
          id: `${file.name}-${Date.now()}`,
          file,
          category: validation.category || 'file',
          progress: 0,
          status: 'error',
          error: validation.error || 'Unsupported file',
        });
        return;
      }
      const previewUrl = validation.category === 'image' || validation.category === 'video'
        ? URL.createObjectURL(file)
        : undefined;
      newItems.push({
        id: `${file.name}-${Date.now()}`,
        file,
        category: validation.category,
        progress: 0,
        status: 'queued',
        previewUrl,
      });
    });
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }
  }, []);

  const uploadAll = useCallback(async (): Promise<MessageAttachment[]> => {
    const attachments: MessageAttachment[] = [];
    const pending = items.filter((i) => i.status === 'queued' || i.status === 'error');

    for (const item of pending) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 0, error: undefined } : i)));
      const controller = new AbortController();
      abortControllers.current[item.id] = controller;

      try {
        // Simulate progress updates (Supabase JS doesn't expose granular progress easily)
        const progressInterval = setInterval(() => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id && i.status === 'uploading' && i.progress < 90
                ? { ...i, progress: i.progress + 10 }
                : i
            )
          );
        }, 200);

        const attachment = await uploadMessageAttachment(item.file, conversationId, messageId);
        clearInterval(progressInterval);

        attachments.push(attachment);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'done', progress: 100, attachment } : i))
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
              : i
          )
        );
      } finally {
        delete abortControllers.current[item.id];
      }
    }

    return attachments;
  }, [conversationId, messageId, items]);

  const hasPending = items.some((i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'error');
  const hasErrors = items.some((i) => i.status === 'error');

  return {
    items,
    addFiles,
    removeItem,
    uploadAll,
    hasPending,
    hasErrors,
    clear: useCallback(() => {
      items.forEach((i) => {
        if (i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      });
      setItems([]);
    }, [items]),
  };
}

export function usePasteFiles(onFiles: (files: FileList) => void) {
  return useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles]
  );
}
