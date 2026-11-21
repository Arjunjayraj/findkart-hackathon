import type { StoreView } from '../types/findkart.ts';

interface FooterProps {
  onNavigate: (view: StoreView) => void;
  onOpenOrders: () => void;
  onShowInfo: (title: string, content: string) => void;
}

export function Footer({ onNavigate, onOpenOrders, onShowInfo }: FooterProps) {
  return (
    <footer className="bg-light-inverse-surface text-light-inverse-on-surface pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-gutter-md lg:px-gutter-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Brand Column */}
        <div className="lg:col-span-4 flex flex-col gap-3.5">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 w-fit cursor-pointer text-left"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M12.5 11V9C12.5 5.96243 14.9624 3.5 18 3.5C21.0376 3.5 23.5 5.96243 23.5 9V11"
                stroke="#F4F1EA"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <rect
                x="5.5"
                y="10.5"
                width="25"
                height="21.5"
                rx="5"
                stroke="#F4F1EA"
                strokeWidth="2.2"
                fill="rgba(255,255,255,0.06)"
              />
              <path
                d="M18 26C18 26 23.2 23 23.2 18.2C23.2 16 21.4 14.5 19.5 14.5C18.6 14.5 18 15 18 15C18 15 17.4 14.5 16.5 14.5C14.6 14.5 12.8 16 12.8 18.2C12.8 23 18 26 18 26Z"
                stroke="#D3E0C2"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col">
              <span className="font-display text-xl font-semibold text-light-on-primary leading-none">
                FindKart
              </span>
              <span className="font-label text-[9px] tracking-[0.18em] uppercase text-light-secondary-container mt-0.5">
                SHOP BETTER INDIA
              </span>
            </div>
          </button>

          <p className="font-body text-body-sm text-light-inverse-primary/85 leading-relaxed max-w-xs">
            Your everyday Indian marketplace for curated electronics, crafted fashion, beauty, and home essentials across 19,000+ pin codes.
          </p>

          <div className="flex flex-col gap-1 pt-1 font-body text-xs text-light-inverse-primary/75">
            <span>support@findkart.in · 1800-120-4500</span>
            <span>Outer Ring Road, Bengaluru 560103</span>
          </div>
        </div>

        {/* Shop Column */}
        <div className="lg:col-span-2 flex flex-col gap-2.5">
          <span className="font-label text-label-lg text-light-on-primary">Shop</span>
          <button
            type="button"
            onClick={() => onNavigate('fashion')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Fashion
          </button>
          <button
            type="button"
            onClick={() => onNavigate('electronics')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Electronics
          </button>
          <button
            type="button"
            onClick={() => onNavigate('beauty')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Beauty &amp; Skincare
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home-kitchen')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Home &amp; Kitchen
          </button>
          <button
            type="button"
            onClick={() => onNavigate('accessories')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Watches &amp; Bags
          </button>
        </div>

        {/* Customer Service Column */}
        <div className="lg:col-span-3 flex flex-col gap-2.5">
          <span className="font-label text-label-lg text-light-on-primary">Customer Service</span>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            My Account &amp; Saved Addresses
          </button>
          <button
            type="button"
            onClick={onOpenOrders}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Track Your Order
          </button>
          <button
            type="button"
            onClick={() => onNavigate('customer-care')}
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Customer Care &amp; Tickets
          </button>
          <button
            type="button"
            onClick={() =>
              onShowInfo(
                '7-Day Returns & Refunds',
                'Unused products in original packaging with tags intact are eligible for doorstep pickup within 7 days of delivery. Cash on Delivery refunds are credited within 48 hours of pickup verification.'
              )
            }
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            7-Day Returns &amp; Refunds
          </button>
          <button
            type="button"
            onClick={() =>
              onShowInfo(
                'Shipping & Pin Code Coverage',
                'Complimentary shipping applies on orders above ₹499 across 19,000+ Indian pin codes. Same-day dispatch on orders confirmed before 3 PM.'
              )
            }
            className="font-body text-body-sm text-light-inverse-primary/80 hover:text-white text-left w-fit cursor-pointer"
          >
            Shipping Info
          </button>
        </div>

        {/* Policies & Support SLA Card */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <span className="font-label text-label-lg text-light-on-primary">Human Support Promise</span>
          <div className="rounded-xl bg-light-primary-container/80 border border-white/10 p-4 flex flex-col gap-2">
            <p className="font-body text-xs text-light-secondary-container font-medium">
              No automated bots · 6-hour specialist response SLA
            </p>
            <p className="font-body text-xs text-light-inverse-primary/85 leading-relaxed">
              Pay safely with Cash on Delivery or UPI scan at your doorstep after inspecting your sealed FindKart package.
            </p>
            <button
              type="button"
              onClick={() =>
                onShowInfo(
                  'Cash on Delivery Policy',
                  'Pay conveniently at your doorstep by cash or UPI scan upon inspecting your sealed FindKart parcel. Cash on Delivery is serviceable across 19,000+ Indian pin codes.'
                )
              }
              className="mt-1 font-label text-xs text-accent-yellow hover:underline text-left w-fit cursor-pointer"
            >
              Read COD Policy →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Region Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-gutter-md lg:px-gutter-lg mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-light-inverse-primary/75">
        <span>© 2026 FindKart Retail Pvt. Ltd. All rights reserved.</span>

        <div className="flex items-center gap-5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() =>
              onShowInfo(
                'Privacy Policy',
                'FindKart collects only the contact details and delivery addresses necessary to fulfill and deliver your orders. Your account passwords are encrypted and never shared with third-party advertisers.'
              )
            }
            className="hover:text-white cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() =>
              onShowInfo(
                'Terms of Use',
                'All prices on FindKart are listed in Indian Rupees (INR) inclusive of applicable GST. Orders above ₹499 qualify for complimentary doorstep delivery across India.'
              )
            }
            className="hover:text-white cursor-pointer"
          >
            Terms of Service
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 text-light-on-primary font-medium">
            <span>🇮🇳</span>
            <span>India · INR (₹)</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
