import { toast } from 'sonner';
import type { TFunction } from 'i18next';
import {
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  reportMessage,
  updateParticipantSettings,
  setTypingWithDebounce,
  searchMessages,
} from '@/lib/messaging';
import { queryClient } from '@/lib/queryClient';
import { messageKeys } from '@/lib/queryKeys';
import type { Message, MessageAttachment, Profile } from '@/types';

interface DraftApi {
  save: (value: string) => void;
  clear: () => void;
}

interface UseMessageActionsParams {
  user?: Profile | null;
  activeConversationId?: string;
  activeConversationListingId?: string;
  currentParticipant?: {
    is_pinned: boolean;
    is_archived: boolean;
    is_muted: boolean;
  };
  draft: DraftApi;
  replyTo: Message | null;
  setReplyTo: (message: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (message: Message | null) => void;
  pendingAttachments: MessageAttachment[];
  pendingMessageId: string;
  setPendingMessageId: (id: string) => void;
  input: string;
  setInput: (value: string) => void;
  setSending: (value: boolean) => void;
  setOptimisticMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  refreshConversations: () => void;
  t: TFunction;
}

export function useMessageActions({
  user,
  activeConversationId,
  activeConversationListingId,
  currentParticipant,
  draft,
  replyTo,
  setReplyTo,
  editingMessage,
  setEditingMessage,
  pendingAttachments,
  pendingMessageId,
  setPendingMessageId,
  input,
  setInput,
  setSending,
  setOptimisticMessages,
  refreshConversations,
  t,
}: UseMessageActionsParams) {
  const handleSend = async () => {
    if (!input.trim() || !user || !activeConversationId) return;
    const text = input.trim();
    setSending(true);
    // Optimistic: immediately clear input and draft, add a local optimistic message.
    setInput('');
    draft.clear();
    if (!editingMessage) {
      const optimisticMsg: Message = {
        id: pendingMessageId,
        conversation_id: activeConversationId,
        sender_id: user.id,
        content: text,
        created_at: new Date().toISOString(),
        edited_at: undefined,
        deleted_at: undefined,
        reply_to_message_id: replyTo?.id ?? undefined,
        content_type: 'text',
        flagged_contact_info: false,
        is_system_event: false,
        sender: user,
        reactions: [],
        reads: [],
        attachments: pendingAttachments.length ? pendingAttachments : undefined,
      };
      setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    }
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, user.id, text);
        setEditingMessage(null);
      } else {
        await sendMessage({
          conversationId: activeConversationId,
          senderId: user.id,
          content: text,
          listingId: activeConversationListingId,
          replyToMessageId: replyTo?.id,
          attachments: pendingAttachments,
        });
      }
      setReplyTo(null);
      setOptimisticMessages([]);
      refreshConversations();
      // Replace optimistic message with confirmed server state.
      await queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(user.id, activeConversationId),
      });
      setPendingMessageId(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    } catch (err) {
      // Roll back optimistic message on failure.
      setOptimisticMessages([]);
      setInput(text);
      toast.error(err instanceof Error ? err.message : t('messages:errors.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    draft.save(value);
    if (activeConversationId && user) {
      setTypingWithDebounce(
        activeConversationId,
        user.id,
        user.display_name || 'Someone',
        value.trim().length > 0
      );
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    if (message.sender_id !== user?.id) return;
    setEditingMessage(message);
    setInput(message.content);
    setReplyTo(null);
  };

  const handleDelete = async (message: Message) => {
    if (!user || message.sender_id !== user.id) return;
    try {
      await deleteMessage(message.id, user.id);
      if (activeConversationId) {
        queryClient.invalidateQueries({
          queryKey: messageKeys.conversation(user.id, activeConversationId),
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages:errors.deleteFailed'));
    }
  };

  const handleReact = async (messageId: string, reaction: string) => {
    if (!user) return;
    await addReaction(messageId, user.id, reaction);
    if (activeConversationId) {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(user.id, activeConversationId),
      });
    }
  };

  const handleRemoveReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    await removeReaction(messageId, user.id, reaction);
    if (activeConversationId) {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(user.id, activeConversationId),
      });
    }
  };

  const handleReport = async (message: Message) => {
    if (!user) return;
    try {
      await reportMessage(message.id, user.id, 'inappropriate', undefined);
      toast.success(t('messages:reportSubmitted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages:errors.reportFailed'));
    }
  };

  const handleSearch = async (query: string) => {
    if (!user) return [];
    return searchMessages(user.id, query);
  };

  const handleJump = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-500', 'rounded-2xl');
      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500', 'rounded-2xl'), 2000);
    }
  };

  const handleTogglePin = async () => {
    if (!user || !activeConversationId) return;
    const isPinned = currentParticipant?.is_pinned ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_pinned: !isPinned });
    refreshConversations();
  };

  const handleToggleArchive = async () => {
    if (!user || !activeConversationId) return;
    const isArchived = currentParticipant?.is_archived ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_archived: !isArchived });
    refreshConversations();
  };

  const handleToggleMute = async () => {
    if (!user || !activeConversationId) return;
    const isMuted = currentParticipant?.is_muted ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_muted: !isMuted });
    refreshConversations();
  };

  return {
    handleSend,
    handleInputChange,
    handleReply,
    handleEdit,
    handleDelete,
    handleReact,
    handleRemoveReaction,
    handleReport,
    handleSearch,
    handleJump,
    handleTogglePin,
    handleToggleArchive,
    handleToggleMute,
  };
}
