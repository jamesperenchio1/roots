import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, QrCode, AlertTriangle, MessageSquare, Camera, Upload, Loader2 } from 'lucide-react';
import { getTransactionById, PLANT_IMAGES } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { updateOrderStatus, uploadDisputeEvidence } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Transaction } from '@/types';

export default function OrderPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | undefined>(getTransactionById(transactionId || ''));
  const [confirming, setConfirming] = useState(false);

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
    // Poll every 10s for status updates while viewing the order
    const interval = setInterval(refreshTx, 10000);
    return () => clearInterval(interval);
  }, [refreshTx]);

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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm receipt. Please try again.');
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
              <img src={tx.listing?.photos?.[0]?.storage_path || PLANT_IMAGES[tx.listing?.plant_id?.replace('p-', 'sp-') || 'sp-1']} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{tx.listing?.species?.common_name_en || 'Your plant'}</p>
              <p className="text-xs text-zinc-500">Order total: {tx.sale_price_thb.toLocaleString()} THB</p>
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
        </div>

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
