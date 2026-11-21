import React, { useEffect, useState } from 'react';
import { CATALOG_PRODUCTS } from '../data/catalog.ts';
import type {
  CartItem,
  DeliveryLocation,
  OnlinePaymentMethod,
  Order,
  OrderShipping,
  PaymentMethodType,
  UserProfile,
} from '../types/findkart.ts';
import { fallbackPlaceOrder, safeParseApiResponse } from '../utils/api.ts';
import { PaymentGatewayModal } from './PaymentGatewayModal.tsx';
import { ProductImage } from './ProductImage.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  location: DeliveryLocation;
  user: UserProfile | null;
  authToken: string | null;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onOrderPlaced: (order: Order, stockOverrides?: Record<string, number>) => void;
  onOpenAuth: () => void;
}

const ONLINE_METHODS: OnlinePaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

function isOnlineMethod(method: PaymentMethodType): method is OnlinePaymentMethod {
  return ONLINE_METHODS.includes(method as OnlinePaymentMethod);
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  location,
  user,
  authToken,
  onUpdateQty,
  onRemoveItem,
  onOrderPlaced,
  onOpenAuth,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmed'>('cart');
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(location.city);
  const [pincode, setPincode] = useState(location.pincode);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('upi');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [pendingShipping, setPendingShipping] = useState<OrderShipping | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultAddr =
        user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
      setCity(defaultAddr?.city || location.city);
      setPincode(defaultAddr?.pincode || location.pincode);
      if (!fullName) {
        setFullName(defaultAddr?.fullName || user?.name || '');
      }
      if (!phone) {
        setPhone(defaultAddr?.phone || user?.phone || '');
      }
      if (!address && defaultAddr?.addressLine) {
        setAddress(defaultAddr.addressLine);
      }
      if (user?.paymentPreferences?.preferredMethod === 'card') {
        setPaymentMethod('card');
      } else if (user?.paymentPreferences?.preferredMethod === 'upi') {
        setPaymentMethod('upi');
      } else if (user?.paymentPreferences?.preferredMethod === 'cod') {
        setPaymentMethod('cod');
      }
      if (step === 'confirmed' && cart.length > 0) {
        setStep('cart');
        setConfirmedOrder(null);
      }
    }
  }, [isOpen, location.city, location.pincode, user]);

  if (!isOpen) return null;

  const productMap = new Map(CATALOG_PRODUCTS.map((p) => [p.id, p]));
  const detailedItems = cart
    .map((item, idx) => ({ item, idx, product: productMap.get(item.productId) }))
    .filter((entry) => Boolean(entry.product));

  const subtotal = detailedItems.reduce(
    (sum, entry) => sum + (entry.product?.price || 0) * entry.item.quantity,
    0
  );
  const totalMrp = detailedItems.reduce(
    (sum, entry) => sum + (entry.product?.originalPrice || 0) * entry.item.quantity,
    0
  );
  const totalSavings = Math.max(0, totalMrp - subtotal);
  const deliveryFee = subtotal === 0 || subtotal >= 499 ? 0 : 40;
  const grandTotal = subtotal + deliveryFee;
  const totalItemCount = detailedItems.reduce((s, d) => s + d.item.quantity, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (fullName.trim().length < 2) {
      setFormError('Please enter recipient full name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''))) {
      setFormError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (address.trim().length < 6) {
      setFormError('Enter a complete flat/house number and street address.');
      return;
    }
    if (city.trim().length < 2) {
      setFormError('Enter your delivery city.');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setFormError('Enter a valid 6-digit Indian pin code.');
      return;
    }

    const shipping: OrderShipping = {
      fullName: fullName.trim(),
      phone: phone.replace(/\s+/g, ''),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      paymentMethod,
    };

    // Launch secure Payment Gateway modal when paying online
    if (isOnlineMethod(paymentMethod)) {
      setPendingShipping(shipping);
      setGatewayOpen(true);
      return;
    }

    // Doorstep COD or UPI on Delivery
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'FindKart',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: cart, shipping }),
      });
      const parsed = await safeParseApiResponse<{ order: Order; stockOverrides?: Record<string, number> }>(res);
      let placedOrder: Order;
      let nextOverrides: Record<string, number> | undefined;
      if (parsed.isHtmlFallback) {
        placedOrder = fallbackPlaceOrder(cart, shipping);
      } else if (!parsed.ok || !parsed.data?.order) {
        throw new Error(parsed.errorMessage || 'Unable to place order.');
      } else {
        placedOrder = parsed.data.order;
        nextOverrides = parsed.data.stockOverrides;
      }
      setConfirmedOrder(placedOrder);
      setStep('confirmed');
      onOrderPlaced(placedOrder, nextOverrides);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to reach order service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setGatewayOpen(false);
    if (step === 'confirmed') {
      setStep('cart');
      setConfirmedOrder(null);
    } else if (step === 'checkout' && cart.length === 0) {
      setStep('cart');
    }
    onClose();
  };

  const confirmedPaymentInfo = confirmedOrder?.paymentInfo || confirmedOrder?.shipping.paymentDetails;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />
      <aside className="relative w-full max-w-[100vw] sm:max-w-md bg-light-surface-container-lowest h-full flex flex-col shadow-xl">
        {/* Drawer Header */}
        <div className="px-gutter-md py-gutter-md bg-light-primary text-light-on-primary flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Back to cart"
                className="w-9 h-9 rounded hover:bg-light-primary-container flex items-center justify-center shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  arrow_back
                </span>
              </button>
            )}
            <h2 className="font-headline text-title-lg truncate">
              {step === 'cart'
                ? `Shopping Cart (${totalItemCount})`
                : step === 'checkout'
                  ? 'Delivery & Payment'
                  : 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close cart"
            className="w-9 h-9 rounded hover:bg-light-primary-container flex items-center justify-center shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        {step === 'confirmed' && confirmedOrder ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md">
            <div className="p-gutter-md rounded-xl bg-success-container border border-success/30 text-on-success-container flex items-start gap-3">
              <span className="material-symbols-outlined text-[24px] text-success shrink-0" aria-hidden="true">
                check_circle
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-headline text-title-md">
                  Order #{confirmedOrder.orderId} Confirmed
                </span>
                <span className="font-body text-body-sm">
                  Estimated delivery to {confirmedOrder.shipping.city} ({confirmedOrder.shipping.pincode}) in 2–3 business days.
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-light-outline-variant/60 p-gutter-md flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-label text-label-md text-light-on-surface">Delivery &amp; Payment</span>
                {confirmedPaymentInfo?.paymentStatus === 'Paid' ? (
                  <span className="px-2 py-0.5 rounded bg-success-container text-on-success-container font-label text-[11px] font-semibold">
                    Paid Online
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-warning-container text-on-warning-container font-label text-[11px] font-semibold">
                    Pay at Doorstep
                  </span>
                )}
              </div>
              <p className="font-body text-body-sm text-light-on-surface-variant">
                {confirmedOrder.shipping.fullName} · +91 {confirmedOrder.shipping.phone}
              </p>
              <p className="font-body text-body-sm text-light-on-surface-variant">
                {confirmedOrder.shipping.address}, {confirmedOrder.shipping.city} - {confirmedOrder.shipping.pincode}
              </p>
              <div className="pt-1.5 border-t border-light-outline-variant/40 flex flex-col gap-0.5">
                <span className="font-label text-label-sm text-light-primary">
                  {confirmedPaymentInfo?.methodLabel ||
                    (confirmedOrder.shipping.paymentMethod === 'cod'
                      ? 'Cash on Delivery (Pay at Doorstep)'
                      : 'UPI on Delivery')}
                  {confirmedPaymentInfo?.maskedDetail ? ` · ${confirmedPaymentInfo.maskedDetail}` : ''}
                </span>
                {confirmedPaymentInfo?.transactionId && (
                  <span className="font-mono text-[11px] text-light-on-surface-variant">
                    Transaction Ref: {confirmedPaymentInfo.transactionId}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-light-outline-variant/60 p-gutter-md flex flex-col gap-3">
              <span className="font-label text-label-md text-light-on-surface">Items Ordered</span>
              {confirmedOrder.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex items-center justify-between gap-2 text-body-sm">
                  <span className="text-light-on-surface truncate">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-title text-light-on-surface tabular-nums shrink-0">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-light-outline-variant/60 flex items-center justify-between font-title text-title-md text-light-on-surface">
                <span>{confirmedPaymentInfo?.paymentStatus === 'Paid' ? 'Amount Paid' : 'Total Payable'}</span>
                <span className="tabular-nums">₹{confirmedOrder.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="mt-auto w-full py-3 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-lg cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        ) : detailedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-gutter-xl text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-light-surface-container flex items-center justify-center text-light-primary">
              <span className="material-symbols-outlined text-[32px]" aria-hidden="true">
                shopping_cart
              </span>
            </div>
            <h3 className="font-headline text-title-lg text-light-on-surface">Your FindKart cart is empty</h3>
            <p className="font-body text-body-md text-light-on-surface-variant max-w-xs">
              Add electronics, fashion, or skincare essentials to unlock free delivery on orders above ₹499.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="px-gutter-lg py-2.5 rounded-lg bg-light-primary text-light-on-primary font-label text-label-md cursor-pointer"
            >
              Browse Products
            </button>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain p-gutter-md flex flex-col gap-3">
              {/* Free Delivery Progress Notice */}
              <div className="p-3 rounded-lg bg-light-surface-container-low border border-light-outline-variant/60 flex items-center gap-2 text-body-sm text-light-on-surface">
                <span className="material-symbols-outlined text-[18px] text-success" aria-hidden="true">
                  local_shipping
                </span>
                {subtotal >= 499 ? (
                  <span>Your order qualifies for FREE Delivery across India.</span>
                ) : (
                  <span>
                    Add ₹{(499 - subtotal).toLocaleString('en-IN')} more for FREE Delivery.
                  </span>
                )}
              </div>

              {detailedItems.map(({ item, idx, product }) => {
                if (!product) return null;
                return (
                  <div
                    key={`${item.productId}-${item.selectedSize || ''}-${item.selectedColor || ''}-${idx}`}
                    className="p-3 rounded-xl border border-light-outline-variant/60 bg-light-surface-container-lowest flex gap-3"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.imageAlt}
                      className="w-20 h-20 object-contain shrink-0 rounded-lg bg-light-surface-container-low p-1"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                      <div>
                        <p className="font-label text-label-sm text-light-on-surface-variant uppercase">
                          {product.brand}
                        </p>
                        <h3 className="font-title text-body-md text-light-on-surface truncate">
                          {product.name}
                        </h3>
                        {(item.selectedSize || item.selectedColor) && (
                          <p className="font-body text-body-sm text-light-on-surface-variant">
                            {[item.selectedSize, item.selectedColor].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-title text-title-md text-light-on-surface tabular-nums">
                            ₹{(product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                          <span className="font-body text-body-sm text-light-on-surface-variant line-through tabular-nums">
                            ₹{(product.originalPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(idx, -1)}
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="w-8 h-8 rounded border border-light-outline-variant flex items-center justify-center text-light-on-surface hover:bg-light-surface-container cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-7 text-center font-label text-label-md tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(idx, 1)}
                            aria-label={`Increase quantity of ${product.name}`}
                            className="w-8 h-8 rounded border border-light-outline-variant flex items-center justify-center text-light-on-surface hover:bg-light-surface-container cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(idx)}
                            aria-label={`Remove ${product.name}`}
                            className="ml-1 w-8 h-8 rounded text-light-on-surface-variant hover:text-light-error flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Footer Summary */}
            <div className="p-gutter-md border-t border-light-outline-variant/60 bg-light-surface-container-low flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 text-body-sm">
                <div className="flex justify-between text-light-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-light-on-surface-variant">
                  <span>Delivery Charges</span>
                  <span className={`tabular-nums ${deliveryFee === 0 ? 'text-success font-label' : ''}`}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-success font-label">
                    <span>Total Savings</span>
                    <span className="tabular-nums">−₹{totalSavings.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-light-outline-variant/60 flex justify-between font-title text-title-lg text-light-on-surface">
                  <span>Total Amount</span>
                  <span className="tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-lg transition-colors shadow-sm cursor-pointer"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto overscroll-contain p-gutter-md flex flex-col gap-gutter-md">
            {!user && (
              <div className="p-3 rounded-lg bg-light-surface-container border border-light-outline-variant/60 flex items-center justify-between gap-2">
                <span className="font-body text-body-sm text-light-on-surface">
                  Sign in to save this order to your FindKart account.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="font-label text-label-sm text-light-primary hover:underline shrink-0 cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-light-error-container border border-light-error/30 text-light-on-error-container font-body text-body-sm"
              >
                {formError}
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="font-label text-label-md text-light-on-surface">Full Name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Arjun Mehta"
                className="w-full px-3 py-2.5 rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-base sm:text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label text-label-md text-light-on-surface">Mobile Number (10 digits)</span>
              <input
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2.5 rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-base sm:text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-label text-label-md text-light-on-surface">Delivery Address</span>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat 402, Indiranagar 100ft Road"
                className="w-full px-3 py-2.5 rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-base sm:text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-gutter-sm">
              <label className="flex flex-col gap-1 min-w-0">
                <span className="font-label text-label-md text-light-on-surface">City</span>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-base sm:text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="font-label text-label-md text-light-on-surface">Pin Code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-mono text-base sm:text-mono-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                />
              </label>
            </div>

            {/* Payment Methods: Online Gateway + Doorstep */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label text-label-md text-light-on-surface">Payment Method</span>
                <span className="font-label text-[11px] text-success inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                    lock
                  </span>
                  256-bit Secure
                </span>
              </div>

              {/* Online Payment Gateway Options */}
              <div className="text-[11px] font-label uppercase tracking-wider text-light-on-surface-variant pt-1">
                Pay Online Now
              </div>
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'upi'
                    ? 'border-light-primary bg-sage-surface/50'
                    : 'border-light-outline-variant hover:border-light-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'upi'}
                  onChange={() => setPaymentMethod('upi')}
                  className="accent-light-primary"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-label text-label-md text-light-on-surface">
                    UPI (GPay, PhonePe, Paytm, BHIM)
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant">
                    Instant confirmation · Zero convenience fee
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-light-primary bg-sage-surface/50'
                    : 'border-light-outline-variant hover:border-light-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="accent-light-primary"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-label text-label-md text-light-on-surface">
                    Credit / Debit Card
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant">
                    Visa, Mastercard, RuPay · Tokenized checkout
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'netbanking' || paymentMethod === 'wallet'
                    ? 'border-light-primary bg-sage-surface/50'
                    : 'border-light-outline-variant hover:border-light-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'netbanking' || paymentMethod === 'wallet'}
                  onChange={() => setPaymentMethod('netbanking')}
                  className="accent-light-primary"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-label text-label-md text-light-on-surface">
                    NetBanking &amp; Digital Wallets
                  </span>
                  <span className="font-body text-body-sm text-light-on-surface-variant">
                    HDFC, ICICI, SBI, Axis, Amazon Pay &amp; more
                  </span>
                </div>
              </label>

              {/* Doorstep Options */}
              <div className="text-[11px] font-label uppercase tracking-wider text-light-on-surface-variant pt-1">
                Pay at Doorstep
              </div>
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'cod'
                    ? 'border-light-primary bg-sage-surface/50'
                    : 'border-light-outline-variant hover:border-light-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="accent-light-primary"
                />
                <div className="flex flex-col">
                  <span className="font-label text-label-md text-light-on-surface">Cash on Delivery</span>
                  <span className="font-body text-body-sm text-light-on-surface-variant">
                    Pay cash at your doorstep when parcel arrives
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                  paymentMethod === 'upi_on_delivery'
                    ? 'border-light-primary bg-sage-surface/50'
                    : 'border-light-outline-variant hover:border-light-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'upi_on_delivery'}
                  onChange={() => setPaymentMethod('upi_on_delivery')}
                  className="accent-light-primary"
                />
                <div className="flex flex-col">
                  <span className="font-label text-label-md text-light-on-surface">UPI on Delivery</span>
                  <span className="font-body text-body-sm text-light-on-surface-variant">
                    Scan &amp; pay via any UPI app on delivery
                  </span>
                </div>
              </label>
            </div>

            <div className="mt-auto pt-3 border-t border-light-outline-variant/60 flex flex-col gap-3">
              <div className="flex justify-between font-title text-title-lg text-light-on-surface">
                <span>{isOnlineMethod(paymentMethod) ? 'Total Payable Now' : 'Payable on Delivery'}</span>
                <span className="tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container disabled:opacity-60 font-label text-label-lg cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isOnlineMethod(paymentMethod) ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      lock
                    </span>
                    <span>Pay ₹{grandTotal.toLocaleString('en-IN')} via Payment Gateway</span>
                  </>
                ) : (
                  <span>{submitting ? 'Confirming Order...' : 'Place Order'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </aside>

      {/* Interactive Payment Gateway Modal */}
      {pendingShipping && isOnlineMethod(pendingShipping.paymentMethod) && (
        <PaymentGatewayModal
          isOpen={gatewayOpen}
          onClose={() => setGatewayOpen(false)}
          cart={cart}
          shipping={pendingShipping}
          initialMethod={pendingShipping.paymentMethod}
          amount={grandTotal}
          itemCount={totalItemCount}
          user={user}
          authToken={authToken}
          onPaymentSuccess={(order, stockOverrides) => {
            setGatewayOpen(false);
            setConfirmedOrder(order);
            setStep('confirmed');
            onOrderPlaced(order, stockOverrides);
          }}
        />
      )}
    </div>
  );
}
