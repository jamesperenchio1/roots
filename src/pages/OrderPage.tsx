import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, QrCode, AlertTriangle, MessageSquare, Camera, Upload, Loader2, Shield, Banknote, RotateCcw, FileCheck, XCircle } from 'lucide-react';
import { getTransactionById, PLANT_IMAGES } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { updateOrderStatus, uploadDisputeEvidence, hasReviewed, verifyOrderManually, notifyPaymentVerified, notifyPaymentRejected } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import ReviewForm from '@/components/ReviewForm';
import type { Transaction } from '@/types';

export default function OrderPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tx, setTx] = useState<Transaction | undefined>(getTransactionById(transactionId || ''));
  const [confirming, setConfirming] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [retryingVerify, setRetryingVerify] = useState(false);
  const [manualReviewing, setManualReviewing] = useState(false);

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
              toast.info(`Order status updated: ${(nextStatus as string).replace(/_/g, ' ')}`);
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
  }, [transactionId, refreshTx]);

  if (!tx) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Order not found</h1>
        <Link to="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const status = tx.status;

  const statusSteps = [
    { key: 'paid_in_escrow', label: 'Paid', icon: CheckCircle },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Package },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ];

  const currentStep = statusSteps.findIndex(s => s.key === status);
  const effectiveStep = currentStep >= 0 ? currentStep : status === 'completed' ? 3 : 0;

  const handleConfirmReceipt = async (file: File, method: 'qr' | 'photo') => {
    setConfirming(true);
    try {
      await uploadDisputeEvidence(file, tx.buyer_id || 'anonymous');
      await updateOrderStatus(tx.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await refreshTx();
      toast.success(method === 'qr' ? 'QR verified — escrow released to seller.' : 'Receipt confirmed — escrow released to seller.');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm receipt. Please try again.');
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

  const isBuyer = user?.id === tx.buyer_id;
  const isSeller = user?.id === tx.seller_id;

  const handleRetryVerification = async () => {
    if (!tx.payment_slip_url || !tx.listing) return;
    setRetryingVerify(true);
    try {
      const { verifyPaymentSlip } = await import('@/lib/slipVerification');
      const result = await verifyPaymentSlip(
        tx.payment_slip_url,
        tx.sale_price_thb,
        tx.seller?.promptpay_id || '',
        tx.seller?.display_name || ''
      );

      if (result.passed) {
        await updateOrderStatus(tx.id, {
          status: 'paid_in_escrow',
          verification_method: 'slipok_auto',
        });
        await refreshTx();
        toast.success('Payment verified! Order is now processing.');
      } else if (result.failureType === 'mismatch') {
        toast.error(result.reasons[0] || 'Slip does not match this order.');
      } else {
        toast.info('Still could not verify. Seller will review manually.');
      }
    } catch {
      toast.error('Verification service unavailable. Please try again later.');
    } finally {
      setRetryingVerify(false);
    }
  };

  const handleManualVerify = async (decision: 'approve' | 'reject') => {
    setManualReviewing(true);
    try {
      await verifyOrderManually(tx.id, decision);
      await refreshTx();
      if (decision === 'approve') {
        toast.success('Payment approved — order is now processing.');
        void notifyPaymentVerified(tx.buyer_id || '', tx.id);
      } else {
        toast.error('Payment rejected — order cancelled.');
        void notifyPaymentRejected(tx.buyer_id || '', tx.id, 'Payment could not be verified.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order.');
    } finally {
      setManualReviewing(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light tracking-tight">Order #{tx.id.slice(-6)}</h1>
          <span className={`text-xs px-3 py-1 rounded-full ${
            status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
            status === 'disputed' ? 'bg-red-500/10 text-red-400' :
            status === 'pending_verification' ? 'bg-purple-500/10 text-purple-400' :
            'bg-amber-500/10 text-amber-400'
          }`}>{status.replace(/_/g, ' ')}</span>
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
              <img src={tx.listing?.photos?.[0]?.storage_path || PLANT_IMAGES[tx.listing?.plant_id?.replace('p-', 'sp-') || 'sp-1']} alt={tx.listing?.species?.scientific_name || 'Plant listing'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{tx.listing?.species?.common_name_en || 'Your plant'}</p>
              <p className="text-xs text-zinc-500">
                Plant: {((tx.sale_price_thb || 0) - (tx.shipping_cost_thb || 0)).toLocaleString()} THB
                {tx.shipping_cost_thb ? ` · Shipping: ${tx.shipping_cost_thb.toLocaleString()} THB` : ' · Free shipping'}
              </p>
              <p className="text-xs text-zinc-500 font-medium">Total: {tx.sale_price_thb.toLocaleString()} THB</p>
              <p className="text-xs text-zinc-500">Seller: {tx.seller?.display_name}</p>
            </div>
          </div>

          {tx.tracking_number && (
            <div className="border-t border-white/5 pt-4">
              <div className="flex items-center gap-2 text-sm mb-1">
                <Truck className="w-4 h-4 text-zinc-500" />
                <span>{tx.courier}</span>
              </div>
              <p className="text-sm text-zinc-400">Tracking: {tx.tracking_number}</p>
            </div>
          )}

          {/* Payment Info */}
          <div className="border-t border-white/5 pt-4 mt-4">
            {status === 'pending_verification' ? (
              <div>
                <div className="flex items-start gap-2 text-xs text-purple-400 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p>Payment slip submitted — awaiting verification.</p>
                    <p className="mt-1 text-zinc-500">
                      {isSeller
                        ? 'Please review the payment slip below and approve or reject.'
                        : 'The seller is reviewing your payment slip. You can retry auto-verification below.'}
                    </p>
                  </div>
                </div>

                {/* Buyer retry */}
                {isBuyer && (
                  <button
                    onClick={handleRetryVerification}
                    disabled={retryingVerify}
                    className="w-full py-2 rounded-lg text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {retryingVerify ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    {retryingVerify ? 'Retrying verification…' : 'Retry Auto-Verification'}
                  </button>
                )}

                {/* Seller manual review */}
                {isSeller && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleManualVerify('approve')}
                      disabled={manualReviewing}
                      className="flex-1 py-2 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Approve Payment
                    </button>
                    <button
                      onClick={() => handleManualVerify('reject')}
                      disabled={manualReviewing}
                      className="flex-1 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-zinc-500">
                <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-400">
                    {tx.verification_method === 'slipok_auto'
                      ? 'Payment auto-verified via SlipOK against bank records. Funds are held in escrow until you confirm delivery.'
                      : tx.verification_method === 'seller_manual'
                        ? 'Payment verified by the seller. Funds are held in escrow until you confirm delivery.'
                        : 'Payment verified. Funds are held in escrow until you confirm delivery.'}
                  </p>
                  <p className="mt-1">
                    If the plant does not match the listing, you can open a dispute within 48 hours of delivery.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Slip / Reference */}
        {(tx.payment_slip_url || tx.payment_ref_number) && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium">Payment Details</h3>
              {status === 'paid_in_escrow' && (
                <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Auto-verified
                </span>
              )}
            </div>
            {tx.payment_slip_url && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 mb-1.5">Payment Slip</p>
                <button
                  onClick={() => window.open(tx.payment_slip_url!, '_blank')}
                  className="relative group cursor-pointer block w-fit"
                >
                  <img
                    src={tx.payment_slip_url}
                    alt="Payment slip"
                    className="max-h-64 rounded-lg border border-white/5 object-contain"
                  />
                  <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white rounded-lg">
                    View Full Size
                  </span>
                </button>
              </div>
            )}
            {tx.payment_ref_number && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-zinc-500">Transaction Ref:</span>
                <span className="text-sm font-mono text-zinc-300 bg-zinc-900/50 px-2 py-0.5 rounded">{tx.payment_ref_number}</span>
              </div>
            )}
            <div className="text-xs text-zinc-600">
              Verified by SlipOK against bank records
            </div>
          </div>
        )}

        {/* Actions */}
        {status === 'delivered' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Confirm Receipt
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              Scan the QR code on the plant's tag to verify authenticity and confirm receipt.
              This will release funds to the seller.
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
                    Scan QR Code
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
                    Upload Photo
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {status === 'shipped' && (
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-400">Your plant is on the way! You will be able to confirm receipt once it arrives.</p>
          </div>
        )}

        {status === 'paid_in_escrow' && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-400">Waiting for seller to ship. You will receive tracking info once shipped.</p>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Order completed — escrow released to seller. Enjoy your plant!
            </p>
          </div>
        )}

        {status === 'completed' && user && tx.buyer_id === user.id && !reviewSubmitted && !hasReviewed(tx.id, user.id) && tx.listing && (
          <div className="mb-6">
            <ReviewForm
              transactionId={tx.id}
              listingId={tx.listing_id}
              sellerId={tx.seller_id}
              onSubmitted={() => setReviewSubmitted(true)}
            />
          </div>
        )}

        {status === 'completed' && (reviewSubmitted || (user && hasReviewed(tx.id, user.id))) && (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Thanks for your review!
            </p>
          </div>
        )}

        {/* Dispute Button */}
        {(status === 'shipped' || status === 'delivered' || status === 'paid_in_escrow') && (
          <Link to={`/order/${tx.id}/dispute`}>
            <Button variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Report a Problem
            </Button>
          </Link>
        )}

        <div className="mt-4 text-center">
          <Link to="/dashboard/messages" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors">
            <MessageSquare className="w-4 h-4" /> Message Seller
          </Link>
        </div>
      </div>
    </div>
  );
}
