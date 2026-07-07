import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, QrCode, Truck, Lock, Upload, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getListingById, PLANT_IMAGES } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createOrder, uploadPaymentSlip, requestSlipVerification } from '@/lib/api';
import { generatePromptPayQR } from '@/lib/promptpay';
import { validateShippingAddress } from '@/lib/validation';

export default function CheckoutPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const listing = getListingById(listingId || '');
  const { user } = useAuth();
  const { t } = useTranslation(['checkout', 'common']);
  const navigate = useNavigate();
  const method = 'promptpay' as const;
  const [address, setAddress] = useState({ name: '', address: '', district: '', province: '', postal: '', phone: '' });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [qr, setQr] = useState('');
  const slipInputRef = useRef<HTMLInputElement>(null);

  const shipping = listing?.shipping_cost_thb || 0;
  const total = (listing?.price_thb || 0) + shipping;
  const sellerPromptPay = listing?.seller?.promptpay_id;
  const canCheckout = Boolean(sellerPromptPay);

  useEffect(() => {
    if (listing && method === 'promptpay' && sellerPromptPay) {
      generatePromptPayQR(sellerPromptPay, total).then(setQr).catch(() => setQr(''));
    }
  }, [listing, method, sellerPromptPay, total]);

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">{t('checkout:listingNotFound')}</h1>
        <Link to="/browse" className="text-emerald-400 hover:underline">{t('checkout:backToBrowse')}</Link>
      </div>
    );
  }

  const handlePay = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!canCheckout) {
      toast.error(t('checkout:errors.sellerNoPromptPay', { defaultValue: 'This seller has not set a PromptPay ID and cannot accept payments right now.' }));
      return;
    }
    const validation = validateShippingAddress(address);
    setAddressErrors(validation.errors);
    if (!validation.ok) {
      toast.error(t('checkout:errors.fixAddress'));
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!user) return;
    if (!slipFile) {
      toast.error(t('checkout:errors.slipRequired'));
      return;
    }
    setShowConfirmModal(false);
    setPaying(true);
    try {
      const slipPath = await uploadPaymentSlip(slipFile, user.id);
      const tx = await createOrder({
        listing,
        buyer: user,
        delivery_method: listing.delivery_options?.includes('ship') ? 'ship' : 'pickup',
        shipping_address: address,
        payment_slip_path: slipPath,
        payment_ref: refNumber.trim() || undefined,
      });
      // Try automated SlipOK verification; falls back to manual seller confirm.
      const verdict = await requestSlipVerification(tx.id);
      if (verdict === 'verified') {
        toast.success(t('checkout:toast.paymentAutoVerified'));
      } else if (verdict === 'failed') {
        toast.info(t('checkout:toast.paymentManual'));
      } else {
        toast.success(t('checkout:toast.slipSubmitted'));
      }
      navigate(`/order/${tx.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('checkout:checkout.orderError'));
      setPaying(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to={`/listing/${listingId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('checkout:backToListing')}
        </Link>

        <h1 className="text-2xl font-light tracking-tight mb-6">{t('checkout:checkout.title')}</h1>

        {/* Order Summary */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={listing.photos?.[0]?.storage_path || PLANT_IMAGES[listing.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg'} alt={listing.species?.scientific_name || t('common:unknown')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{listing.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{listing.species?.scientific_name}</p>
              <p className="text-xs text-zinc-500">{t('checkout:labels.size')}: {listing.size_category} {listing.pot_size_cm && `| ${t('checkout:labels.pot')}: ${listing.pot_size_cm}cm`}</p>
              <p className="text-xs text-zinc-500">{t('checkout:labels.seller')}: {listing.seller?.display_name}</p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('checkout:checkout.plant')}</span>
              <span>{listing.price_thb.toLocaleString()} {t('common:currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('checkout:checkout.shipping')}</span>
              <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                {shipping === 0 ? t('checkout:order.freeShipping') : `${shipping.toLocaleString()} ${t('common:currency')}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5 font-semibold text-base">
              <span>{t('checkout:checkout.total')}</span>
              <span>{total.toLocaleString()} {t('common:currency')}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-zinc-400" />
            {t('checkout:checkout.shippingAddress')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input placeholder={t('checkout:checkout.fullName')} className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.name ? 'border-red-500/50' : 'border-white/10'}`} value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
              {addressErrors.name && <p className="text-xs text-red-400 mt-1">{addressErrors.name}</p>}
            </div>
            <div>
              <input placeholder={t('checkout:checkout.phone')} className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.phone ? 'border-red-500/50' : 'border-white/10'}`} value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
              {addressErrors.phone && <p className="text-xs text-red-400 mt-1">{addressErrors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <input placeholder={t('checkout:checkout.addressLine')} className={`w-full bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 ${addressErrors.address ? 'border-red-500/50' : 'border-white/10'}`} value={address.address} onChange={e => setAddress({ ...address, address: e.target.value })} />
              {addressErrors.address && <p className="text-xs text-red-400 mt-1">{addressErrors.address}</p>}
            </div>
            <input placeholder={t('checkout:checkout.district')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.district} onChange={e => setAddress({ ...address, district: e.target.value })} />
            <input placeholder={t('checkout:checkout.province')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.province} onChange={e => setAddress({ ...address, province: e.target.value })} />
            <input placeholder={t('checkout:checkout.postalCode')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.postal} onChange={e => setAddress({ ...address, postal: e.target.value })} />
          </div>
        </div>

        {/* Payment Block */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            {t('checkout:securePayment')}
          </h2>

          {/* Payment method */}
          <div className="flex items-center justify-center gap-2 py-3 mb-5 rounded-lg border border-emerald-500 bg-emerald-500/5 text-emerald-400 text-sm">
            <QrCode className="w-4 h-4" />
            {t('checkout:checkout.promptPay')}
          </div>

          {/* PromptPay Panel */}
          {method === 'promptpay' && (
            <div className="text-center py-6 bg-zinc-800/30 rounded-lg border border-white/5">
              <div className="w-44 h-44 bg-white rounded-xl mx-auto mb-4 p-2 shadow-lg flex items-center justify-center">
                {qr
                  ? <img src={qr} alt={t('checkout:promptPayQrAlt')} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                  : <QrCode className="w-12 h-12 text-zinc-400" />}
              </div>
              <p className="text-sm text-zinc-300 mb-1">{t('checkout:scanToPay', { total: total.toLocaleString(), currency: t('common:currency') })}</p>
              <p className="text-xs text-zinc-500">{t('checkout:paysSellerDirectly', { seller: listing.seller?.display_name || t('common:unknown') })}</p>
              <p className="text-[11px] text-zinc-600 mt-1">{t('checkout:afterPayConfirm')}</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {['Krungthai', 'SCB', 'KBank', 'BBL'].map(bank => (
                  <span key={bank} className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500">{bank}</span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Escrow Notice */}
        <div className="flex items-start gap-3 text-sm text-zinc-500 mb-6 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 font-medium mb-0.5">{t('checkout:buyerProtection.title')}</p>
            <p>{t('checkout:buyerProtection.description')}</p>
          </div>
        </div>

        {!canCheckout && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-sm text-red-400">
            {t('checkout:errors.sellerNoPromptPay', { defaultValue: 'This seller has not set a PromptPay ID and cannot accept payments right now.' })}
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={paying || !canCheckout}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
        >
          {paying ? t('checkout:confirming') : t('checkout:confirmPaid', { total: total.toLocaleString(), currency: t('common:currency') })}
        </Button>

        <p className="text-xs text-zinc-500 text-center mt-3">
          {t('checkout:footer')}
        </p>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                {t('checkout:confirmPayment.title')}
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-zinc-500 hover:text-white" aria-label={t('common:actions.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
              {t('checkout:confirmPayment.description')}
            </p>

            <div className="space-y-4">
              {/* Slip upload */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:confirmPayment.slipLabel')} <span className="text-emerald-400">*</span></label>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSlipFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {slipPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    <img src={slipPreview} alt={t('checkout:confirmPayment.slipLabel')} className="w-full h-32 object-contain bg-zinc-800" />
                    <button
                      onClick={() => { setSlipPreview(''); setSlipFile(null); }}
                      className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                      aria-label={t('common:actions.close')}
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
                    <span className="text-xs">{t('checkout:confirmPayment.uploadSlipScreenshot')}</span>
                  </button>
                )}
              </div>

              {/* Reference number */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">{t('checkout:confirmPayment.transactionReference')}</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder={t('checkout:confirmPayment.referencePlaceholder')}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={paying || !slipFile}
                className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {paying ? t('checkout:confirmPayment.submitting') : t('checkout:confirmPayment.submitPaymentSlip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
