import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CreditCard, QrCode, Truck, Lock, Upload, X, CheckCircle, AlertTriangle, Loader2, RotateCcw, MessageCircle, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { getListingById, PLANT_IMAGES } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createOrder, notifyNewOrder, notifyOrderNeedsReview } from '@/lib/api';
import { generatePromptPayQR } from '@/lib/promptpay';
import { validateShippingAddress } from '@/lib/validation';
import { verifyPaymentSlip, type SlipVerificationResult } from '@/lib/slipVerification';

// Platform fallback PromptPay (used only if a seller has not set their own).
const PLATFORM_PROMPTPAY = '0812345678';

export default function CheckoutPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = getListingById(listingId || '');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'promptpay' | 'card'>('promptpay');
  const [address, setAddress] = useState({ name: '', address: '', district: '', province: '', postal: '', phone: '' });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [slipPreview, setSlipPreview] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SlipVerificationResult | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<SlipVerificationResult['details'] | null>(null);
  const [qr, setQr] = useState('');
  const slipInputRef = useRef<HTMLInputElement>(null);

  const shipping = listing?.shipping_cost_thb || 0;
  const total = (listing?.price_thb || 0) + shipping;
  const sellerPromptPay = listing?.seller?.promptpay_id || PLATFORM_PROMPTPAY;

  useEffect(() => {
    if (listing && method === 'promptpay') {
      generatePromptPayQR(sellerPromptPay, total).then(setQr).catch(() => setQr(''));
    }
  }, [listing, method, sellerPromptPay, total]);

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">Listing not found</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">Back to browse</Link>
      </div>
    );
  }

  const handlePay = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (method === 'card') {
      toast.info('Card payments are coming soon — please use PromptPay.');
      return;
    }
    const validation = validateShippingAddress(address);
    setAddressErrors(validation.errors);
    if (!validation.ok) {
      toast.error('Please fix the errors in your shipping address.');
      return;
    }
    setShowConfirmModal(true);
  };

  const runVerification = async (imageUrl?: string) => {
    const img = imageUrl || slipPreview;
    if (!img || !listing) return;
    setVerifying(true);
    setVerifyResult(null);
    setVerificationDetails(null);
    try {
      const result = await verifyPaymentSlip(
        img,
        total,
        sellerPromptPay,
        listing.seller?.display_name || ''
      );
      setVerifyResult(result);
      setVerificationDetails(result.details || null);
      if (result.passed) {
        toast.success(`Payment verified via ${result.provider || 'bank API'}`);
      } else if (result.status === 'uncertain') {
        toast.info('Could not fully verify — slip data incomplete');
      } else {
        toast.error(result.reasons[0] || 'Slip verification failed');
      }
    } catch {
      toast.error('Verification error — please try again');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!user || !listing) return;

    // If slip uploaded but not verified yet, run verification first
    if (slipPreview && !verifyResult) {
      await runVerification();
      return;
    }

    // Mismatch = hard block. Buyer must fix the slip.
    if (verifyResult?.failureType === 'mismatch') {
      toast.error('Payment does not match this order. Please upload the correct slip.');
      return;
    }

    // Determine path: auto-verified vs manual review fallback
    const canAutoVerify = verifyResult?.passed === true;
    const needsManualReview =
      verifyResult?.failureType === 'service_down' ||
      verifyResult?.failureType === 'qr_not_found';

    const initialStatus = canAutoVerify ? 'paid_in_escrow' : 'pending_verification';
    const verificationMethod = canAutoVerify
      ? 'slipok_auto'
      : needsManualReview
        ? 'retry_pending'
        : undefined;

    setShowConfirmModal(false);
    setPaying(true);
    try {
      const tx = await createOrder({
        listing,
        buyer: user,
        delivery_method: listing.delivery_options?.includes('ship') ? 'ship' : 'pickup',
        shipping_address: address,
        initialStatus,
        payment_slip_url: slipPreview || undefined,
        payment_ref_number: refNumber.trim() || undefined,
        verification_method: verificationMethod,
      });

      if (canAutoVerify) {
        void notifyNewOrder(
          listing.seller_id,
          tx.id,
          listing.species?.common_name_en || 'Plant',
          tx.sale_price_thb
        );
        toast.success('Payment verified — your order is protected by escrow.');
      } else {
        void notifyOrderNeedsReview(
          listing.seller_id,
          tx.id,
          listing.species?.common_name_en || 'Plant',
          tx.sale_price_thb
        );
        toast.success('Order submitted — seller will verify your payment shortly.');
      }

      navigate(`/order/${tx.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not place the order.');
      setPaying(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to={`/listing/${listingId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Listing
        </Link>

        <h1 className="text-2xl font-light tracking-tight mb-6">Checkout</h1>

        {/* Order Summary */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={listing.photos?.[0]?.storage_path || PLANT_IMAGES[listing.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'} alt={listing.species?.scientific_name || 'Plant listing'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{listing.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{listing.species?.scientific_name}</p>
              <p className="text-xs text-zinc-500">Size: {listing.size_category} {listing.pot_size_cm && `| Pot: ${listing.pot_size_cm}cm`}</p>
              <p className="text-xs text-zinc-500">Seller: {listing.seller?.display_name}</p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Plant price</span>
              <span>{listing.price_thb.toLocaleString()} THB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Shipping</span>
              <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                {shipping === 0 ? 'Free' : `${shipping.toLocaleString()} THB`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5 font-semibold text-base">
              <span>Total</span>
              <span>{total.toLocaleString()} THB</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-zinc-400" />
            Shipping Address
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input placeholder="Full name" className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.name ? 'border-red-500/50' : 'border-white/10'}`} value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
              {addressErrors.name && <p className="text-xs text-red-400 mt-1">{addressErrors.name}</p>}
            </div>
            <div>
              <input placeholder="Phone" className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.phone ? 'border-red-500/50' : 'border-white/10'}`} value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
              {addressErrors.phone && <p className="text-xs text-red-400 mt-1">{addressErrors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <input placeholder="Address line" className={`w-full bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 ${addressErrors.address ? 'border-red-500/50' : 'border-white/10'}`} value={address.address} onChange={e => setAddress({ ...address, address: e.target.value })} />
              {addressErrors.address && <p className="text-xs text-red-400 mt-1">{addressErrors.address}</p>}
            </div>
            <input placeholder="District" className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.district} onChange={e => setAddress({ ...address, district: e.target.value })} />
            <input placeholder="Province" className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.province} onChange={e => setAddress({ ...address, province: e.target.value })} />
            <input placeholder="Postal Code" className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.postal} onChange={e => setAddress({ ...address, postal: e.target.value })} />
          </div>
        </div>

        {/* Payment Block */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Secure Payment
          </h2>

          {/* Method Tabs */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setMethod('promptpay')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-colors ${method === 'promptpay' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' : 'border-white/10 hover:border-white/20'}`}>
              <QrCode className="w-4 h-4" />
              PromptPay
            </button>
            <button onClick={() => setMethod('card')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-colors ${method === 'card' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' : 'border-white/10 hover:border-white/20'}`}>
              <CreditCard className="w-4 h-4" />
              Credit / Debit Card
            </button>
          </div>

          {/* PromptPay Panel */}
          {method === 'promptpay' && (
            <div className="text-center py-6 bg-zinc-800/30 rounded-lg border border-white/5">
              <div className="w-44 h-44 bg-white rounded-xl mx-auto mb-4 p-2 shadow-lg flex items-center justify-center">
                {qr
                  ? <img src={qr} alt="PromptPay QR" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                  : <QrCode className="w-12 h-12 text-zinc-400" />}
              </div>
              <p className="text-sm text-zinc-300 mb-1">Scan with your banking app to pay {total.toLocaleString()} THB</p>
              <p className="text-xs text-zinc-500">Pays {listing.seller?.display_name || 'the seller'} directly via any Thai bank</p>
              <p className="text-[11px] text-zinc-600 mt-1">After paying, tap the button below to confirm.</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {['Krungthai', 'SCB', 'KBank', 'BBL'].map(bank => (
                  <span key={bank} className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500">{bank}</span>
                ))}
              </div>
            </div>
          )}

          {/* Card Panel */}
          {method === 'card' && (
            <div className="space-y-3">
              <div className="bg-zinc-800/30 rounded-lg border border-white/5 p-4">
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 mb-1 block">Card Number</label>
                  <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg px-3 py-2.5">
                    <CreditCard className="w-4 h-4 text-zinc-600" />
                    <input type="text" placeholder="4242 4242 4242 4242" className="bg-transparent text-sm w-full focus:outline-none" maxLength={19} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Expiry</label>
                    <input type="text" placeholder="MM/YY" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none" maxLength={5} />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">CVC</label>
                    <input type="text" placeholder="123" className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none" maxLength={3} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-600">Powered by Omise. Your card details are encrypted and never stored on our servers.</p>
            </div>
          )}
        </div>

        {/* Escrow Notice */}
        <div className="flex items-start gap-3 text-sm text-zinc-500 mb-6 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 font-medium mb-0.5">Buyer Protection</p>
            <p>Your payment is held in escrow. The seller only receives the money after you confirm the plant arrived safely. If there's a problem, you can open a dispute within 48 hours.</p>
          </div>
        </div>

        <Button
          onClick={handlePay}
          disabled={paying}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
        >
          {paying ? 'Confirming…' : method === 'promptpay' ? `I've paid ${total.toLocaleString()} THB` : `Pay ${total.toLocaleString()} THB`}
        </Button>

        <p className="text-xs text-zinc-500 text-center mt-3">
          Your payment is held safely until you confirm delivery. No hidden fees — the price above is all you pay.
        </p>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Confirm Your Payment
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
              After paying via your banking app, upload your payment slip. We verify the amount and recipient against bank records before creating your order.
            </p>

            <div className="space-y-4">
              {/* Slip upload */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Payment Slip *</label>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setSlipPreview(dataUrl);
                        setVerifyResult(null);
                        setVerificationDetails(null);
                        void runVerification(dataUrl);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {slipPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    <img src={slipPreview} alt="Payment slip" className="w-full h-32 object-contain bg-zinc-800" />
                    <button
                      onClick={() => { setSlipPreview(''); setVerifyResult(null); setVerificationDetails(null); }}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => slipInputRef.current?.click()}
                    className="w-full py-6 border border-dashed border-white/10 rounded-lg text-zinc-500 hover:border-white/20 hover:text-zinc-300 transition-colors flex flex-col items-center gap-1"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Upload payment slip screenshot</span>
                  </button>
                )}
              </div>

              {/* Reference number */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Transaction Reference (optional)</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. 20240605ABC123"
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Verifying spinner */}
              {verifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying slip against bank records…
                </div>
              )}

              {/* ── PASS: Verified ── */}
              {verifyResult?.status === 'passed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Payment verified</span>
                  </div>
                  <p className="text-xs text-emerald-300/70 mb-3">
                    SlipOK confirmed this payment matches the expected amount and recipient.
                  </p>
                  {verificationDetails && (
                    <div className="bg-black/20 rounded-lg p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Amount</span>
                        <span className="text-emerald-300 font-medium">{verificationDetails.amount?.toLocaleString()} THB</span>
                      </div>
                      {verificationDetails.transRef && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Transaction Ref</span>
                          <span className="text-zinc-300 font-mono">{verificationDetails.transRef}</span>
                        </div>
                      )}
                      {verificationDetails.transDate && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Date</span>
                          <span className="text-zinc-300">{verificationDetails.transDate} {verificationDetails.transTime}</span>
                        </div>
                      )}
                      {verificationDetails.sendingBank && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">From Bank</span>
                          <span className="text-zinc-300">{verificationDetails.sendingBank}</span>
                        </div>
                      )}
                      {verificationDetails.receiverName && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">To</span>
                          <span className="text-zinc-300">{verificationDetails.receiverName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── MISMATCH: Hard block ── */}
              {verifyResult?.status === 'failed' && verifyResult.failureType === 'mismatch' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-red-400">Payment mismatch</span>
                  </div>
                  {verifyResult.reasons.length > 0 && (
                    <ul className="text-xs text-red-300/80 space-y-1 mb-3">
                      {verifyResult.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-red-500 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="bg-black/20 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">Expected amount</span>
                      <span className="text-zinc-300">{total.toLocaleString()} THB</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">Expected recipient</span>
                      <span className="text-zinc-300">{sellerPromptPay}</span>
                    </div>
                    {verificationDetails?.amount !== undefined && (
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Found on slip</span>
                        <span className="text-red-300">{verificationDetails.amount.toLocaleString()} THB</span>
                      </div>
                    )}
                    {verificationDetails?.receiverName && (
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Recipient on slip</span>
                        <span className="text-red-300">{verificationDetails.receiverName}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">
                    The slip does not match this order. Please check you paid the correct amount to the correct recipient, then upload a new screenshot.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSlipPreview(''); setVerifyResult(null); setVerificationDetails(null); slipInputRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-zinc-800 border border-white/10 hover:bg-zinc-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Upload new slip
                    </button>
                    <Link
                      to={`/messages?to=${listing.seller_id}&listing=${listing.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-zinc-800 border border-white/10 hover:bg-zinc-700 transition-colors text-center"
                      onClick={() => setShowConfirmModal(false)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Contact seller
                    </Link>
                  </div>
                </div>
              )}

              {/* ── SERVICE DOWN / QR NOT FOUND: Manual review fallback ── */}
              {verifyResult?.status === 'failed' && (verifyResult.failureType === 'service_down' || verifyResult.failureType === 'qr_not_found') && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-amber-400">
                      {verifyResult.failureType === 'qr_not_found' ? 'Could not read QR code' : 'Verification service unavailable'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/70 mb-3">
                    {verifyResult.failureType === 'qr_not_found'
                      ? 'We could not find a QR code in this image. Try a clearer photo, or send the order to the seller for manual review.'
                      : 'SlipOK is temporarily down. Your order can still be placed — the seller will manually verify your payment slip.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSlipPreview(''); setVerifyResult(null); setVerificationDetails(null); slipInputRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-zinc-800 border border-white/10 hover:bg-zinc-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* ── UNCERTAIN: Treat as manual review fallback ── */}
              {verifyResult?.status === 'uncertain' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-amber-400">Could not fully verify</span>
                  </div>
                  <p className="text-xs text-amber-300/70 mb-3">
                    We found the slip in bank records but some details were missing. The seller can review it manually.
                  </p>
                  {verifyResult.warnings && verifyResult.warnings.length > 0 && (
                    <ul className="text-xs text-amber-300/60 space-y-1 mb-3">
                      {verifyResult.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSlipPreview(''); setVerifyResult(null); setVerificationDetails(null); slipInputRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs bg-zinc-800 border border-white/10 hover:bg-zinc-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Try different slip
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>

              {/* PASS → active confirm */}
              {verifyResult?.status === 'passed' && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={paying}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  {paying ? 'Creating order…' : 'Confirm & Place Order'}
                </button>
              )}

              {/* SERVICE DOWN / QR NOT FOUND / UNCERTAIN → allow manual review fallback */}
              {verifyResult && (
                verifyResult.failureType === 'service_down' ||
                verifyResult.failureType === 'qr_not_found' ||
                verifyResult.status === 'uncertain'
              ) && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={paying}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-amber-500 text-black font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  {paying ? 'Creating order…' : 'Place Order — Seller Will Review'}
                </button>
              )}

              {/* MISMATCH → disabled */}
              {verifyResult?.status === 'failed' && verifyResult.failureType === 'mismatch' && (
                <button
                  disabled
                  className="flex-1 py-2.5 rounded-lg text-sm bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed"
                >
                  Fix slip to continue
                </button>
              )}

              {/* No result yet → disabled */}
              {!verifyResult && (
                <button
                  disabled
                  className="flex-1 py-2.5 rounded-lg text-sm bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed"
                >
                  Upload slip to verify
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
