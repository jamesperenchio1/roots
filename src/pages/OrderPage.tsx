import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, QrCode, AlertTriangle, MessageSquare, Camera, Upload, Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTransactionById, PLANT_IMAGES } from '@/data/mockData';
import { getSrcSet } from '@/lib/images';
import { Button } from '@/components/ui/button';
import { updateOrderStatus, uploadDisputeEvidence, hasReviewedTransaction } from '@/lib/api';
import { verifyQrFromFile } from '@/lib/qr-verify';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { SellerReviewForm } from '@/components/SellerReviewForm';
import type { Transaction } from '@/types';

export default function OrderPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['checkout', 'common', 'marketplace']);
  const [tx, setTx] = useState<Transaction | undefined>(getTransactionById(transactionId || ''));
  const [confirming, setConfirming] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Re-fetch transaction from Supabase to get latest status
  const refreshTx = useCallback(async () => {
    if (!transactionId) return;
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      if (data) {
        // Merge with local cache
        const local = getTransactionById(transactionId);
        setTx({ ...local, ...data, status: data.status } as Transaction);
      }
    } catch {
      // offline — keep local data
    }
  }, [transactionId]);

  useEffect(() => {
    refreshTx();
  }, [refreshTx]);

  useEffect(() => {
    if (!transactionId) return;

    // Subscribe to realtime updates for this transaction
    const channel = supabase
      .channel(`transaction-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (!newData) return;
          const local = getTransactionById(transactionId);
          const updatedTx = { ...local, ...newData, status: newData.status } as Transaction;
          setTx((prev) => {
            const prevStatus = prev?.status;
            const nextStatus = updatedTx.status;
            if (prevStatus && nextStatus && prevStatus !== nextStatus) {
              toast.info(t('checkout:order.statusUpdated', { status: t(`common:status.${nextStatus as string}`) }));
            }
            return updatedTx;
          });
        }
      )
      .subscribe();

    // Fallback polling every 30s
    const interval = setInterval(refreshTx, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [transactionId, refreshTx, t, i18n]);

  if (!tx) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">{t('checkout:order.notFound')}</h1>
        <Link to="/dashboard" className="text-emerald-400 hover:underline">{t('checkout:backToDashboard')}</Link>
      </div>
    );
  }

  const status = tx.status;

  const statusSteps = [
    { key: 'paid_in_escrow', label: t('checkout:order.timeline.paid'), icon: CheckCircle },
    { key: 'shipped', label: t('checkout:order.timeline.shipped'), icon: Truck },
    { key: 'delivered', label: t('checkout:order.timeline.delivered'), icon: Package },
    { key: 'completed', label: t('checkout:order.timeline.completed'), icon: CheckCircle },
  ];

  const currentStep = statusSteps.findIndex(s => s.key === status);
  const effectiveStep = currentStep >= 0 ? currentStep : status === 'completed' ? 3 : 0;

  const handleConfirmReceipt = async (file: File, method: 'qr' | 'photo') => {
    setConfirming(true);
    try {
      if (method === 'qr') {
        const expectedPlantId = tx.plant_id || tx.listing?.plant_id || tx.listing_id;
        const result = await verifyQrFromFile(file, expectedPlantId);
        if (!result.ok) {
          toast.error(result.error || t('checkout:order.qrVerifyFailed'));
          return;
        }
      }
      await uploadDisputeEvidence(file, tx.buyer_id || 'anonymous');
      await updateOrderStatus(tx.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await refreshTx();
      toast.success(method === 'qr' ? t('checkout:order.qrVerified') : t('checkout:order.photoVerified'));
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:order.confirmError'));
    } finally {
      setConfirming(false);
    }
  };

  const handleFileSelect = (method: 'qr' | 'photo') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleConfirmReceipt(file, method);
    e.target.value = '';
  };

  const dateLocale = i18n.language === 'th' ? 'th-TH' : 'en-GB';

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common:nav.dashboard')}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light tracking-tight">{t('checkout:order.idLabel', { id: tx.id.slice(-6) })}</h1>
          <span className={`text-xs px-3 py-1 rounded-full ${
            status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
            status === 'disputed' ? 'bg-red-500/10 text-red-400' :
            'bg-amber-500/10 text-amber-400'
          }`}>{t(`common:status.${status}`)}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {statusSteps.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i <= effectiveStep ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                <step.icon className="w-4 h-4" />
              </div>
              {i < statusSteps.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < effectiveStep ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Order Details */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={tx.listing?.photos?.[0]?.storage_path || PLANT_IMAGES[tx.listing?.plant_id?.replace('p-', 'sp-') || 'sp-1']} srcSet={getSrcSet(tx.listing?.photos?.[0]?.storage_path, { widths: [64, 128, 256], resize: 'cover' })} sizes="64px" alt={tx.listing?.species?.scientific_name || t('common:unknown')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{tx.listing?.species?.common_name_en || t('checkout:order.yourPlant')}</p>
              <p className="text-xs text-zinc-500">
                {t('checkout:order.plantPrice')}: {((tx.sale_price_thb || 0) - (tx.shipping_cost_thb || 0)).toLocaleString()} {t('common:currency')}
                {tx.shipping_cost_thb ? ` · ${t('checkout:checkout.shipping')}: ${tx.shipping_cost_thb.toLocaleString()} ${t('common:currency')}` : ` · ${t('checkout:order.freeShipping')}`}
              </p>
              <p className="text-xs text-zinc-500 font-medium">{t('checkout:checkout.total')}: {tx.sale_price_thb.toLocaleString()} {t('common:currency')}</p>
              <p className="text-xs text-zinc-500">{t('checkout:order.seller')}: {tx.seller?.display_name}</p>
            </div>
          </div>

          {(tx.payment_slip_path || tx.payment_confirmed) && (
            <div className="border-t border-white/5 pt-4">
              {tx.payment_confirmed ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>{tx.payment_confirmed_at ? t('checkout:order.paymentVerifiedDate', { date: new Date(tx.payment_confirmed_at).toLocaleDateString(dateLocale) }) : t('checkout:order.paymentVerified')}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-amber-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{t('checkout:order.paymentPending')}</span>
                </div>
              )}
            </div>
          )}

          {tx.tracking_number && (
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Truck className="w-4 h-4 text-zinc-500" />
                <span>{tx.courier}</span>
              </div>
              <p className="text-sm text-zinc-400">{t('checkout:order.trackingLabel', { number: tx.tracking_number })}</p>
              {tx.shipment_photo_url && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500 mb-1.5">{t('checkout:order.shipmentPhoto')}</p>
                  <a href={tx.shipment_photo_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={tx.shipment_photo_url}
                      srcSet={getSrcSet(tx.shipment_photo_url, { widths: [320, 640], resize: 'cover' })}
                      sizes="320px"
                      alt={t('checkout:packedShipmentAlt')}
                      className="w-full max-w-xs h-40 object-cover rounded-lg border border-white/10"
                    />
                  </a>
                </div>
              )}
            </div>
          )}

          {tx.delivery_method === 'pickup' && tx.listing?.pickup_lat != null && tx.listing?.pickup_lng != null && (
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 text-sm mb-1">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span>{t('checkout:order.pickupLocation')}</span>
              </div>
              {tx.listing.pickup_location && <p className="text-sm text-zinc-400 mb-1">{tx.listing.pickup_location}</p>}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${tx.listing.pickup_lat},${tx.listing.pickup_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-400 hover:underline"
              >
                {t('checkout:order.openPin')}
              </a>
            </div>
          )}

          {/* Payment Info */}
          <div className="border-t border-white/5 pt-4 mt-4">
            <div className="flex items-start gap-2 text-xs text-zinc-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-zinc-400">
                  {t('checkout:order.escrowInfo')}
                </p>
                <p className="mt-1">
                  {t('checkout:order.disputeInfo')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {status === 'delivered' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              {t('checkout:order.confirmReceipt')}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {t('checkout:order.confirmReceiptDescription')}
            </p>
            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect('qr')}
                  disabled={confirming}
                />
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600 text-black" disabled={confirming}>
                  <span className="flex items-center justify-center gap-2">
                    {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {t('checkout:order.scanQr')}
                  </span>
                </Button>
              </label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect('photo')}
                  disabled={confirming}
                />
                <Button asChild variant="outline" className="border-white/10 hover:bg-white/5" disabled={confirming}>
                  <span className="flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    {t('checkout:order.uploadPhoto')}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {status === 'shipped' && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-400">{t('checkout:order.statusMessages.shipped')}</p>
          </div>
        )}

        {status === 'paid_in_escrow' && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-400">{t('checkout:order.statusMessages.paid')}</p>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('checkout:order.statusMessages.completed')}
            </p>
          </div>
        )}

        {status === 'completed' && user && tx.buyer_id === user.id && !reviewSubmitted && !hasReviewedTransaction(tx.id, user.id) && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-200">{t('checkout:order.leaveSellerReview')}</h3>
            <SellerReviewForm
              transactionId={tx.id}
              sellerId={tx.seller_id}
              reviewerId={user.id}
              onSubmitted={() => setReviewSubmitted(true)}
            />
          </div>
        )}

        {status === 'completed' && (reviewSubmitted || (user && hasReviewedTransaction(tx.id, user.id))) && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('checkout:order.thanksReview')}
            </p>
          </div>
        )}

        {/* Dispute Button */}
        {(status === 'shipped' || status === 'delivered' || status === 'paid_in_escrow') && (
          <Link to={`/order/${tx.id}/dispute`}>
            <Button variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('checkout:order.reportProblem')}
            </Button>
          </Link>
        )}

        <div className="mt-4 text-center">
          <Link to="/dashboard/messages" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors">
            <MessageSquare className="w-4 h-4" /> {t('marketplace:listing.messageSeller')}
          </Link>
        </div>
      </div>
    </div>
  );
}
