import React, { useEffect, useState } from 'react';
import type {
  CartItem,
  OnlinePaymentMethod,
  Order,
  OrderPaymentInfo,
  OrderShipping,
  PaymentGatewayConfig,
  PaymentSessionResponse,
  UserProfile,
} from '../types/findkart.ts';
import { fallbackPlaceOrder, safeParseApiResponse } from '../utils/api.ts';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  shipping: OrderShipping;
  initialMethod: OnlinePaymentMethod;
  amount: number;
  itemCount: number;
  user: UserProfile | null;
  authToken: string | null;
  onPaymentSuccess: (order: Order, stockOverrides?: Record<string, number>) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (resp: { error?: { description?: string } }) => void) => void;
    };
  }
}

const POPULAR_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
];

const MORE_BANKS = [
  'Bank of Baroda',
  'Punjab National Bank',
  'Yes Bank',
  'Federal Bank',
  'IDFC FIRST Bank',
  'Canara Bank',
];

const WALLETS = [
  { name: 'Amazon Pay', subtitle: 'Instant 1-tap balance pay' },
  { name: 'PhonePe Wallet', subtitle: 'Linked wallet & rewards' },
  { name: 'Paytm Wallet', subtitle: 'Paytm balance or Postpaid' },
  { name: 'MobiKwik', subtitle: 'ZIP Pay Later & Wallet' },
];

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'];

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits.charAt(i));
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^(60|65|81|82|508)/.test(digits)) return 'RuPay';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentGatewayModal({
  isOpen,
  onClose,
  cart,
  shipping,
  initialMethod,
  amount,
  itemCount,
  user,
  authToken,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const [method, setMethod] = useState<OnlinePaymentMethod>(initialMethod);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig | null>(null);

  // UPI state
  const [upiApp, setUpiApp] = useState('Google Pay');
  const [upiId, setUpiId] = useState(user?.paymentPreferences?.upiId || '');

  // Card state (kept only in memory; raw PAN/CVV never persisted or transmitted to sandbox endpoints)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(shipping.fullName || user?.name || '');

  // NetBanking & Wallet state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [selectedWallet, setSelectedWallet] = useState('Amazon Pay');

  const [processing, setProcessing] = useState(false);
  const [stageLabel, setStageLabel] = useState('Connecting to Payment Gateway...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMethod(initialMethod);
    setErrorMsg(null);
    setProcessing(false);
    if (!upiId && user?.paymentPreferences?.upiId) {
      setUpiId(user.paymentPreferences.upiId);
    }
    if (!cardHolder) {
      setCardHolder(shipping.fullName || user?.name || '');
    }

    let cancelled = false;
    fetch('/api/payments/config')
      .then((res) => safeParseApiResponse<PaymentGatewayConfig>(res))
      .then((parsed) => {
        if (!cancelled && parsed.ok && parsed.data) {
          setGatewayConfig(parsed.data);
        }
      })
      .catch(() => {
        // Default cleanly to sandbox
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialMethod, shipping.fullName, user?.name, user?.paymentPreferences?.upiId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, processing, onClose]);

  if (!isOpen) return null;

  const rawCardDigits = cardNumber.replace(/\D/g, '');
  const cardBrand = detectCardBrand(rawCardDigits);

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const validateCurrentMethod = (): string | null => {
    if (method === 'upi') {
      if (!/^[\w.\-]{2,64}@[a-zA-Z0-9]{2,32}$/.test(upiId.trim())) {
        return 'Enter a valid UPI ID (e.g., arjun@okaxis or 9845022189@ybl).';
      }
    } else if (method === 'card') {
      if (!passesLuhn(rawCardDigits)) {
        return 'Enter a valid 16-digit credit or debit card number.';
      }
      const match = /^(\d{2})\/(\d{2})$/.exec(cardExpiry.trim());
      if (!match) {
        return 'Enter a valid card expiry date (MM/YY).';
      }
      const mm = Number(match[1]);
      const yy = Number(match[2]) + 2000;
      const now = new Date();
      const expEnd = new Date(yy, mm, 0, 23, 59, 59);
      if (mm < 1 || mm > 12 || expEnd < now) {
        return 'Card expiry month/year is invalid or expired.';
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        return 'Enter your 3- or 4-digit CVV security code.';
      }
      if (cardHolder.trim().length < 2) {
        return 'Enter the cardholder name printed on the card.';
      }
    } else if (method === 'netbanking') {
      if (!selectedBank.trim()) {
        return 'Select your bank to proceed with NetBanking.';
      }
    } else if (method === 'wallet') {
      if (!selectedWallet.trim()) {
        return 'Select a wallet provider to continue.';
      }
    }
    return null;
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If merchant configured live Razorpay, no local card/UPI form validation is needed when launching Razorpay Modal
    const isLiveRazorpay = gatewayConfig?.mode === 'live-razorpay' && Boolean(gatewayConfig.razorpayKeyId);
    if (!isLiveRazorpay) {
      const validationErr = validateCurrentMethod();
      if (validationErr) {
        setErrorMsg(validationErr);
        return;
      }
    }

    setProcessing(true);
    setStageLabel('Creating verified payment session...');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'FindKart',
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const shippingPayload: OrderShipping = {
        ...shipping,
        paymentMethod: method,
      };

      const createRes = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: cart,
          shipping: shippingPayload,
          paymentMethod: method,
        }),
      });

      const parsedCreate = await safeParseApiResponse<PaymentSessionResponse>(createRes);

      if (parsedCreate.isHtmlFallback) {
        const last4 = rawCardDigits.slice(-4);
        const fallbackInfo: OrderPaymentInfo = {
          gateway: 'FindKart Sandbox',
          transactionId: `FKPAY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          paymentStatus: 'Paid',
          methodLabel:
            method === 'upi'
              ? `UPI (${upiApp})`
              : method === 'card'
                ? `${cardBrand} Card`
                : method === 'netbanking'
                  ? 'NetBanking'
                  : 'Digital Wallet',
          maskedDetail:
            method === 'upi'
              ? upiId.trim()
              : method === 'card'
                ? `•••• ${last4}`
                : method === 'netbanking'
                  ? selectedBank
                  : selectedWallet,
          paidAt: new Date().toISOString(),
        };
        const placed = fallbackPlaceOrder(cart, shippingPayload, fallbackInfo);
        onPaymentSuccess(placed);
        return;
      }

      if (!parsedCreate.ok || !parsedCreate.data) {
        throw new Error(parsedCreate.errorMessage || 'Could not start payment session.');
      }

      const session = parsedCreate.data;

      if (session.provider === 'razorpay' && session.razorpayOrderId && session.razorpayKeyId) {
        setStageLabel('Launching Razorpay Checkout...');
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          throw new Error('Could not load Razorpay Checkout script. Please check your connection.');
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: session.razorpayKeyId,
            amount: session.amountPaise,
            currency: session.currency,
            name: 'FindKart',
            description: `Order Payment (${itemCount} item${itemCount === 1 ? '' : 's'})`,
            order_id: session.razorpayOrderId,
            prefill: {
              name: shipping.fullName,
              contact: shipping.phone,
              email: user?.email || undefined,
            },
            theme: { color: '#0E3426' },
            handler: async (resp: {
              razorpay_order_id?: string;
              razorpay_payment_id?: string;
              razorpay_signature?: string;
            }) => {
              try {
                setStageLabel('Verifying payment signature...');
                const verifyRes = await fetch('/api/payments/verify-and-place-order', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    sessionId: session.sessionId,
                    signature: session.signature,
                    paymentMethod: method,
                    paymentProof: {
                      razorpayOrderId: resp.razorpay_order_id,
                      razorpayPaymentId: resp.razorpay_payment_id,
                      razorpaySignature: resp.razorpay_signature,
                    },
                  }),
                });
                const parsedVerify = await safeParseApiResponse<{
                  order: Order;
                  stockOverrides?: Record<string, number>;
                }>(verifyRes);
                if (!parsedVerify.ok || !parsedVerify.data?.order) {
                  throw new Error(parsedVerify.errorMessage || 'Payment verification failed.');
                }
                onPaymentSuccess(parsedVerify.data.order, parsedVerify.data.stockOverrides);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled before completion.')),
            },
          });
          rzp.on('payment.failed', (resp) => {
            reject(new Error(resp?.error?.description || 'Payment authorization failed.'));
          });
          rzp.open();
        });
        return;
      }

      // Built-in FindKart Server-Verified Gateway Flow
      setStageLabel('Authorizing with issuing bank...');
      await new Promise((r) => window.setTimeout(r, 650));

      const paymentProof: Record<string, string> =
        method === 'upi'
          ? { upiId: upiId.trim(), upiApp }
          : method === 'card'
            ? { cardLast4: rawCardDigits.slice(-4), cardBrand }
            : method === 'netbanking'
              ? { bankName: selectedBank }
              : { walletName: selectedWallet };

      setStageLabel('Confirming order & updating inventory...');
      const verifyRes = await fetch('/api/payments/verify-and-place-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.sessionId,
          signature: session.signature,
          paymentMethod: method,
          paymentProof,
        }),
      });

      const parsedVerify = await safeParseApiResponse<{
        order: Order;
        stockOverrides?: Record<string, number>;
      }>(verifyRes);

      if (!parsedVerify.ok || !parsedVerify.data?.order) {
        throw new Error(parsedVerify.errorMessage || 'Payment verification failed. Please retry.');
      }

      // Clear raw card digits from component memory after completion
      setCardNumber('');
      setCardCvv('');
      onPaymentSuccess(parsedVerify.data.order, parsedVerify.data.stockOverrides);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to complete payment.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="FindKart Secure Payment Gateway"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => {
          if (!processing) onClose();
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl max-h-[92dvh] overflow-y-auto overscroll-contain bg-light-surface-container-lowest rounded-2xl border border-light-outline-variant shadow-2xl flex flex-col">
        {/* Gateway Header */}
        <div className="bg-light-primary text-light-on-primary px-5 py-4 flex items-center justify-between gap-3 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-accent-yellow" aria-hidden="true">
                lock
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-semibold leading-tight truncate">
                  FindKart Payment Gateway
                </h2>
                <span className="px-2 py-0.5 rounded bg-white/15 font-label text-[10px] uppercase tracking-wider text-light-secondary-container shrink-0">
                  {gatewayConfig?.mode === 'live-razorpay'
                    ? 'Razorpay Live'
                    : 'Verified Sandbox'}
                </span>
              </div>
              <p className="font-body text-xs text-light-inverse-primary/85 truncate mt-0.5">
                Delivering to {shipping.fullName} · {shipping.city} ({shipping.pincode})
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onClose}
            aria-label="Close payment gateway"
            className="w-9 h-9 rounded-lg hover:bg-light-primary-container flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Amount Summary Banner */}
        <div className="px-5 py-3 bg-light-surface-container-low border-b border-light-outline-variant/60 flex items-center justify-between gap-3">
          <span className="font-body text-sm text-light-on-surface-variant">
            Payable for {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
          <span className="font-title text-xl font-bold text-light-primary tabular-nums">
            ₹{amount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Method Tabs */}
        <div className="px-5 pt-4 grid grid-cols-4 gap-2" role="tablist" aria-label="Payment methods">
          {(
            [
              { id: 'upi', label: 'UPI', icon: 'qr_code_2' },
              { id: 'card', label: 'Card', icon: 'credit_card' },
              { id: 'netbanking', label: 'NetBanking', icon: 'account_balance' },
              { id: 'wallet', label: 'Wallets', icon: 'account_balance_wallet' },
            ] as const
          ).map((tab) => {
            const active = method === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={processing}
                onClick={() => {
                  setMethod(tab.id);
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  active
                    ? 'bg-sage-surface border-light-primary text-light-primary font-semibold shadow-xs'
                    : 'bg-white border-light-outline-variant/80 text-light-on-surface-variant hover:border-light-primary/40'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="font-label text-[11.5px] leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handlePayNow} className="p-5 flex flex-col gap-4">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-light-error-container border border-light-error/30 text-light-on-error-container font-body text-sm flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5" aria-hidden="true">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          {method === 'upi' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-label text-label-md text-light-on-surface">Preferred UPI App</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {UPI_APPS.map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setUpiApp(app)}
                      className={`px-3 py-2 rounded-lg border text-xs font-label transition-colors cursor-pointer ${
                        upiApp === app
                          ? 'bg-light-primary text-light-on-primary border-light-primary'
                          : 'bg-light-surface-container-low border-light-outline-variant text-light-on-surface hover:border-light-primary/50'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-label text-label-md text-light-on-surface">
                  Enter your UPI ID / VPA
                </span>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="arjun@okaxis"
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-mono text-sm focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                />
                <span className="font-body text-xs text-light-on-surface-variant">
                  Zero convenience fee · Instant payment confirmation via NPCI UPI
                </span>
              </label>

              {/* Quick QR Summary Box */}
              <div className="p-3.5 rounded-xl bg-[#F4F1EA] border border-light-outline-variant/60 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white p-1.5 border border-light-outline-variant/60 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full" aria-hidden="true">
                    <rect x="2" y="2" width="10" height="10" rx="1.5" fill="none" stroke="#0E3426" strokeWidth="2.4" />
                    <rect x="5" y="5" width="4" height="4" fill="#0E3426" />
                    <rect x="24" y="2" width="10" height="10" rx="1.5" fill="none" stroke="#0E3426" strokeWidth="2.4" />
                    <rect x="27" y="5" width="4" height="4" fill="#0E3426" />
                    <rect x="2" y="24" width="10" height="10" rx="1.5" fill="none" stroke="#0E3426" strokeWidth="2.4" />
                    <rect x="5" y="27" width="4" height="4" fill="#0E3426" />
                    <rect x="16" y="4" width="4" height="4" fill="#0E3426" />
                    <rect x="15" y="14" width="6" height="6" rx="1" fill="#0E3426" />
                    <rect x="24" y="16" width="4" height="4" fill="#0E3426" />
                    <rect x="29" y="23" width="5" height="5" fill="#0E3426" />
                    <rect x="17" y="25" width="7" height="4" fill="#0E3426" />
                    <rect x="15" y="31" width="11" height="3" fill="#0E3426" />
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-title text-sm font-semibold text-light-on-surface">
                    Instant UPI Intent Ready
                  </span>
                  <span className="font-body text-xs text-light-on-surface-variant">
                    Approve ₹{amount.toLocaleString('en-IN')} inside {upiApp} or click Pay Now to authorize immediately.
                  </span>
                </div>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label text-label-md text-light-on-surface">Card Number</span>
                  <span className="font-label text-xs text-light-primary">{cardBrand}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  placeholder="4532 1900 8421 4242"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-mono text-sm tracking-wider focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-light-on-surface">Expiry (MM/YY)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    placeholder="08/28"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-mono text-sm focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-light-on-surface">CVV</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-mono text-sm focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-label text-label-md text-light-on-surface">Name on Card</span>
                <input
                  type="text"
                  autoComplete="cc-name"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Arjun Mehta"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-body text-sm focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                />
              </label>

              <p className="font-body text-[11.5px] text-light-on-surface-variant inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-success" aria-hidden="true">
                  shield
                </span>
                Tokenized processing: raw card numbers and CVV are never saved on our servers.
              </p>
            </div>
          )}

          {method === 'netbanking' && (
            <div className="flex flex-col gap-3.5">
              <span className="font-label text-label-md text-light-on-surface">Popular Indian Banks</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POPULAR_BANKS.map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`px-3 py-2.5 rounded-lg border text-left text-xs font-label transition-colors cursor-pointer ${
                      selectedBank === bank
                        ? 'bg-sage-surface border-light-primary text-light-primary font-semibold'
                        : 'bg-white border-light-outline-variant text-light-on-surface hover:border-light-primary/50'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-label text-label-md text-light-on-surface">Other Supported Banks</span>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-light-outline-variant bg-white text-light-on-surface font-body text-sm focus:border-light-primary focus:outline-none"
                >
                  {[...POPULAR_BANKS, ...MORE_BANKS].map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {method === 'wallet' && (
            <div className="flex flex-col gap-2.5">
              <span className="font-label text-label-md text-light-on-surface">Select Digital Wallet</span>
              {WALLETS.map((wallet) => {
                const active = selectedWallet === wallet.name;
                return (
                  <button
                    key={wallet.name}
                    type="button"
                    onClick={() => setSelectedWallet(wallet.name)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? 'bg-sage-surface border-light-primary'
                        : 'bg-white border-light-outline-variant hover:border-light-primary/40'
                    }`}
                  >
                    <div>
                      <div className="font-title text-sm font-semibold text-light-on-surface">{wallet.name}</div>
                      <div className="font-body text-xs text-light-on-surface-variant">{wallet.subtitle}</div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        active ? 'text-light-primary' : 'text-light-outline'
                      }`}
                      aria-hidden="true"
                    >
                      {active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-light-outline-variant/60 flex flex-col gap-3">
            <button
              type="submit"
              disabled={processing}
              className="w-full py-3.5 rounded-xl bg-light-primary text-light-on-primary hover:bg-light-primary-container disabled:opacity-70 font-label text-label-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                {processing ? 'hourglass_top' : 'verified_user'}
              </span>
              <span>
                {processing ? stageLabel : `Pay ₹${amount.toLocaleString('en-IN')} Securely`}
              </span>
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-light-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-light-primary" aria-hidden="true">
                  lock
                </span>
                256-Bit SSL Encrypted
              </span>
              <span>·</span>
              <span>PCI-DSS Compliant</span>
              <span>·</span>
              <span>Instant Refund Support</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
