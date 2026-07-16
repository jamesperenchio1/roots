'use client'

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import { ShoppingBag, Leaf, Heart, MessageSquare, AlertTriangle, Settings, Package, ChevronRight, X, Trash2, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, toggleWatch, withdrawOffer, respondToOffer, deletePriceAlert } from '@/lib/api';
import { toast } from 'sonner';
import { sanitizeText, isValidPromptPayId } from '@/lib/validation';
import OfferCard from '@/components/OfferCard';
import { useConversations } from '@/hooks/queries/useMessages';
import SavedPlacesManager from '@/components/SavedPlacesManager';
import { UnsavedChangesBlocker } from '@/components/UnsavedChangesBlocker';
import { useUserTransactions, useOffers, useWatchlist, usePriceAlerts, useDisputes } from '@/hooks/queries/useUserData';

const getTabs = (t: (key: string) => string) => [
  { id: 'purchases', label: t('dashboard:buyer.purchases'), icon: ShoppingBag },
  { id: 'plants', label: t('dashboard:buyer.myPlants'), icon: Leaf },
  { id: 'watchlist', label: t('dashboard:buyer.watchlist'), icon: Heart },
  { id: 'messages', label: t('dashboard:buyer.messages'), icon: MessageSquare },
  { id: 'disputes', label: t('dashboard:buyer.disputes'), icon: AlertTriangle },
  { id: 'settings', label: t('dashboard:buyer.settings'), icon: Settings },
];

export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const { tab } = useParams<{ tab?: string }>() ?? { tab: '' };
  const { t, i18n } = useTranslation(['dashboard', 'common', 'marketplace', 'messages']);
  const tabs = getTabs(t);
  const [activeTab, setActiveTab] = useState(tab && tabs.some((ta) => ta.id === tab) ? tab : 'purchases');
  const [saving, setSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    display_name: user?.display_name || '',
    promptpay_id: user?.promptpay_id || '',
    language_preference: user?.language_preference || 'en',
  });

  const isDirty = useMemo(() => {
    if (!user) return false;
    return (
      settingsForm.display_name !== (user.display_name || '') ||
      settingsForm.promptpay_id !== (user.promptpay_id || '') ||
      settingsForm.language_preference !== (user.language_preference || 'en')
    );
  }, [user, settingsForm]);

  const { data: transactions = [] } = useUserTransactions(user?.id);
  const { data: offers = [] } = useOffers(user?.id);
  const { data: watchlist = [] } = useWatchlist(user?.id);
  const { data: priceAlerts = [] } = usePriceAlerts(user?.id);
  const { data: disputes = [] } = useDisputes(user?.id);
  const { data: conversations = [] } = useConversations(user?.id);

  useEffect(() => {
    if (tab && tabs.some((ta) => ta.id === tab)) {
      setActiveTab(tab);
    }
  }, [tab, tabs]);

  // Keep form in sync when user loads
  useEffect(() => {
    if (user) {
      setSettingsForm({
        display_name: user.display_name || '',
        promptpay_id: user.promptpay_id || '',
        language_preference: user.language_preference || 'en',
      });
    }
  }, [user]);

  const handleTabChange = (tabId: string) => {
    if (activeTab === 'settings' && isDirty) {
      if (!window.confirm(t('common:unsavedChanges.description'))) {
        return;
      }
    }
    setActiveTab(tabId);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    const trimmedPromptPay = settingsForm.promptpay_id.trim();
    if (trimmedPromptPay && !isValidPromptPayId(trimmedPromptPay)) {
      toast.error(t('common:errors.invalidPromptPay'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: sanitizeText(settingsForm.display_name, 50),
        promptpay_id: trimmedPromptPay ? sanitizeText(trimmedPromptPay, 20) : null,
        language_preference: settingsForm.language_preference as 'th' | 'en',
        updated_at: new Date().toISOString(),
      });
      await refreshProfile();
      toast.success(t('dashboard:buyer.settingsSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('dashboard:buyer.settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWatch = async (targetId: string, type: 'species' | 'listing') => {
    if (!user) return;
    try {
      await toggleWatch(user.id, type, targetId, false);
      toast.success(t('marketplace:listing.removedFromWatchlist'));
    } catch {
      toast.error(t('marketplace:listing.watchlistError'));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'purchases': {
        const myOffers = offers;
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">{t('dashboard:buyer.offers')} ({myOffers.filter((o) => o.status === 'pending').length} {t('common:status.pending').toLowerCase()})</h2>
              <div className="space-y-3">
                {myOffers.length > 0 ? myOffers.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={o}
                    mode="buyer"
                    onWithdraw={async () => {
                      try {
                        await withdrawOffer(o.id);
                        toast.success(t('dashboard:buyer.offerWithdrawn'));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : t('dashboard:buyer.offerWithdrawFailed'));
                      }
                    }}
                    onRespond={async (status) => {
                      try {
                        await respondToOffer(o.id, status);
                        toast.success(t('dashboard:seller.offerResponded'));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
                      }
                    }}
                  />
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:buyer.noOffers')}</p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium mb-1">{t('dashboard:buyer.purchases')} ({transactions.length})</h2>
              <div className="space-y-3">
                {transactions.length > 0 ? transactions.map((tx) => (
                  <Link href={`/order/${tx.id}`} key={tx.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Package className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t('dashboard:buyer.orderLabel', { id: tx.id.slice(-4) })}</p>
                        <p className="text-xs text-zinc-500">{tx.sale_price_thb.toLocaleString()} {t('common:currency')} {t('dashboard:buyer.fromSeller', { name: tx.seller?.display_name })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        tx.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' :
                        tx.status === 'delivered' ? 'bg-purple-500/10 text-purple-400' :
                        tx.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>{t(`common:status.${tx.status}`)}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </Link>
                )) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-2">{t('dashboard:buyer.noPurchases')}</p>
                    <Link href="/browse" className="text-emerald-400 text-sm hover:underline">{t('common:empty.cta')}</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'plants':
        return (
          <div className="grid sm:grid-cols-2 gap-4">
            {transactions.filter((t) => t.buyer_id === user?.id && t.status === 'completed' && t.plant_id).map((tx) => (
              <div key={tx.id} className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <p className="text-sm font-medium mb-1">{t('dashboard:buyer.plantLabel', { id: tx.plant_id!.slice(-4) })}</p>
                <p className="text-xs text-zinc-500 mb-2">{t('dashboard:buyer.purchasedFor', { amount: tx.sale_price_thb.toLocaleString(), currency: t('common:currency') })}</p>
                <div className="flex gap-2">
                  <Link href={`/p/${tx.plant_id}`} className="text-xs text-emerald-400 hover:underline">{t('dashboard:buyer.viewProvenance')}</Link>
                  <Link href={`/seller-dashboard/listings/new`} className="text-xs text-emerald-400 hover:underline">{t('common:actions.relist')}</Link>
                </div>
              </div>
            ))}
            {transactions.filter((t) => t.buyer_id === user?.id && t.status === 'completed').length === 0 && (
              <div className="text-center py-12 col-span-2">
                <p className="text-zinc-500 mb-2">{t('dashboard:buyer.noPlants')}</p>
                <Link href="/browse" className="text-emerald-400 text-sm hover:underline">{t('dashboard:buyer.startCollecting')}</Link>
              </div>
            )}
          </div>
        );
      case 'watchlist':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-1">{t('dashboard:buyer.priceAlerts')} ({priceAlerts.length})</h2>
              <div className="space-y-3">
                {priceAlerts.length > 0 ? priceAlerts.map((pa) => (
                  <div key={pa.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pa.species?.common_name_en || pa.species?.scientific_name || t('common:unknown')}</p>
                        <p className="text-xs text-zinc-500">{t('dashboard:buyer.priceAlertSummary', { direction: pa.direction, amount: pa.threshold_thb.toLocaleString(), currency: t('common:currency') })}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await deletePriceAlert(pa.id);
                          toast.success(t('dashboard:buyer.priceAlertDeleted'));
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 p-2 -mr-2 rounded-md hover:bg-white/5"
                    >
                      <Trash2 className="w-3 h-3" /> {t('common:actions.remove')}
                    </button>
                  </div>
                )) : (
                  <p className="text-zinc-600 text-sm py-4 text-center">{t('dashboard:buyer.noPriceAlerts')}</p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-medium mb-1">{t('dashboard:buyer.watchlist')} ({watchlist.length})</h2>
              <div className="space-y-3">
                {watchlist.length > 0 ? watchlist.map((w) => {
                  const species = w.watch_type === 'species' ? w.species : null;
                  const listing = w.watch_type === 'listing' ? w.listing : null;
                  const label = species?.common_name_en || species?.scientific_name || listing?.species?.common_name_en || listing?.species?.scientific_name || w.target_id;
                  return (
                    <div key={w.id} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        {listing?.photos?.[0] && (
                          <img src={listing.photos[0].storage_path} alt="" className="w-12 h-12 rounded-lg object-cover bg-zinc-800" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{w.watch_type === 'species' ? t('dashboard:buyer.speciesWatch') : t('dashboard:buyer.listingWatch')}</p>
                          <p className="text-xs text-zinc-500">{t('dashboard:buyer.watchTarget', { name: label })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.watch_type === 'species' && (
                          <Link
                            href={`/species/${w.target_id}`}
                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 p-2 rounded-md hover:bg-white/5"
                          >
                            <Bell className="w-3 h-3" /> {t('marketplace:species.setPriceAlert')}
                          </Link>
                        )}
                        {listing && (
                          <Link
                            href={`/listing/${listing.id}`}
                            className="text-xs text-emerald-400 hover:underline p-2 rounded-md hover:bg-white/5"
                          >
                            {t('common:actions.view')}
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveWatch(w.target_id, w.watch_type)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 p-2 -mr-2 rounded-md hover:bg-white/5"
                        >
                          <X className="w-3 h-3" /> {t('common:actions.remove')}
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-2">{t('dashboard:buyer.noWatchlist')}</p>
                    <Link href="/browse" className="text-emerald-400 text-sm hover:underline">{t('dashboard:buyer.browseToWatch')}</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="space-y-3">
            {(() => {
              const threads = conversations.map((c) => ({
                threadId: c.conversation.id,
                otherUser: c.otherUser,
                lastMessage: c.lastMessage,
                unreadCount: c.unreadCount,
                listing: c.listing,
              }));
              const totalUnread = threads.reduce((sum, th) => sum + th.unreadCount, 0);
              if (threads.length === 0) {
                return (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-2">{t('dashboard:buyer.noMessages')}</p>
                    <Link href="/browse" className="text-emerald-400 text-sm hover:underline">{t('dashboard:buyer.findPlantsToMessage')}</Link>
                  </div>
                );
              }
              return (
                <>
                  {threads.slice(0, 3).map((thread) => (
                    <Link href={`/messages/${thread.threadId}`} key={thread.threadId} className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden">
                          {thread.listing?.photos?.[0] ? (
                            <img src={thread.listing.photos[0].storage_path} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{thread.otherUser?.display_name || t('common:unknownUser')}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-xs">{thread.lastMessage?.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {thread.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {thread.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">{thread.lastMessage ? new Date(thread.lastMessage.created_at).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-GB') : ''}</span>
                      </div>
                    </Link>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    {totalUnread > 0 && (
                      <span className="text-xs text-emerald-400">{t('dashboard:buyer.unreadMessages', { count: totalUnread })}</span>
                    )}
                    <Link href="/messages" className="text-sm text-emerald-400 hover:underline ml-auto">{t('dashboard:buyer.viewAllMessages')}</Link>
                  </div>
                </>
              );
            })()}
          </div>
        );
      case 'disputes':
        return (
          <div className="space-y-3">
            {disputes.filter((d) => d.status === 'open').map((d) => (
              <div key={d.id} className="bg-zinc-900/30 border border-red-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('dashboard:buyer.disputeLabel', { id: d.id.slice(-4) })}</span>
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">{t(`common:status.${d.status}`)}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-1">{t('checkout:dispute.reasonLabel')}: {d.reason}</p>
                <p className="text-sm text-zinc-400">{d.description}</p>
              </div>
            ))}
            {disputes.filter((d) => d.status === 'open').length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-500 mb-2">{t('dashboard:buyer.noDisputes')}</p>
                <p className="text-zinc-600 text-sm">{t('dashboard:buyer.noDisputesSubtitle')}</p>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('dashboard:buyer.displayNameLabel')}</label>
              <input
                type="text"
                value={settingsForm.display_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, display_name: e.target.value })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('dashboard:buyer.promptpayIdLabel')}</label>
              <input
                type="text"
                value={settingsForm.promptpay_id}
                onChange={(e) => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })}
                placeholder={t('dashboard:buyer.promptpayPlaceholder')}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">{t('dashboard:buyer.languageLabel')}</label>
              <select
                value={settingsForm.language_preference}
                onChange={(e) => setSettingsForm({ ...settingsForm, language_preference: e.target.value as 'th' | 'en' })}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="th">{t('common:language.th')}</option>
                <option value="en">{t('common:language.en')}</option>
              </select>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {saving ? t('common:actions.saving') : t('common:actions.save')}
            </button>
            <div className="pt-6 border-t border-white/10">
              <SavedPlacesManager />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <UnsavedChangesBlocker isDirty={isDirty} />
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-light tracking-tight mb-6">{t('common:nav.dashboard')}</h1>

        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map((ta) => (
            <button
              key={ta.id}
              type="button"
              onClick={() => handleTabChange(ta.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeTab === ta.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ta.icon className="w-4 h-4" />
              {ta.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
    </>
  );
}
