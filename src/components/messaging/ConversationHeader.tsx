import { ArrowLeft, Search, MoreVertical, Phone, Pin, Archive, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile, UserPresence, Listing, ConversationParticipant } from '@/types';
import PresenceIndicator from './PresenceIndicator';

interface ConversationHeaderProps {
  otherUser?: Profile;
  listing?: Listing;
  legacyListingId?: string;
  legacyListingName?: string;
  presence?: UserPresence;
  currentParticipant?: ConversationParticipant;
  onBack: () => void;
  onToggleSearch: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onToggleMute: () => void;
}

export default function ConversationHeader({
  otherUser,
  listing,
  legacyListingId,
  legacyListingName,
  presence,
  currentParticipant,
  onBack,
  onToggleSearch,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
}: ConversationHeaderProps) {
  const { t } = useTranslation(['messages', 'common']);

  const listingLink = listing?.id
    ? `/listing/${listing.id}`
    : legacyListingId
      ? `/listing/${legacyListingId}`
      : undefined;
  const listingLabelName =
    listing?.species?.common_name_en || legacyListingName || t('common:unknown');

  return (
    <div className="border-b border-white/10 p-4 flex items-center gap-3">
      <button
        onClick={onBack}
        className="md:hidden text-zinc-400 hover:text-white transition-colors"
        aria-label={t('common:actions.back')}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium flex items-center gap-1.5">
          {otherUser?.display_name || t('common:unknown')}
          <PresenceIndicator presence={presence} showText />
        </p>
        {listingLink && (
          <Link
            to={listingLink}
            className="text-xs text-emerald-400 hover:underline truncate block"
          >
            {t('messages:reLabel', { name: listingLabelName })}
          </Link>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-zinc-500 hover:text-white"
        onClick={onToggleSearch}
        aria-label={t('messages:search')}
      >
        <Search className="w-4 h-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
          <DropdownMenuItem onClick={onTogglePin} className="cursor-pointer">
            <Pin className="w-4 h-4 mr-2" />
            {currentParticipant?.is_pinned
              ? t('messages:actions.unpin')
              : t('messages:actions.pin')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleArchive} className="cursor-pointer">
            <Archive className="w-4 h-4 mr-2" />
            {currentParticipant?.is_archived
              ? t('messages:actions.unarchive')
              : t('messages:actions.archive')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleMute} className="cursor-pointer">
            <VolumeX className="w-4 h-4 mr-2" />
            {currentParticipant?.is_muted
              ? t('messages:actions.unmute')
              : t('messages:actions.mute')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem disabled className="cursor-pointer opacity-50">
            <Phone className="w-4 h-4 mr-2" /> {t('messages:actions.call')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
