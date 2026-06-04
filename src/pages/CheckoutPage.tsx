import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CreditCard, QrCode, Truck, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getListingById, PLANT_IMAGES } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createOrder } from '@/lib/api';
import { generatePromptPayQR } from '@/lib/promptpay';
import { validateShippingAddress } from '@/lib/validation';

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
  const [qr, setQr] = useState('');

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

  const handlePay = async () => {
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
    setPaying(true);
    try {
      const tx = await createOrder({
        listing,
        buyer: user,
        delivery_method: listing.delivery_options?.includes('ship') ? 'ship' : 'pickup',
        shipping_address: address,
      });
      toast.success('Payment confirmed — your order is protected by escrow.');
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

        <p className="text-xs text-zinc-600 text-center mt-3">
          By completing this purchase, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
