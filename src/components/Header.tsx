import React, { useEffect, useRef, useState } from 'react';
import type { DeliveryLocation, StoreView, UserProfile } from '../types/findkart.ts';
import { ScrollProgressBar } from './ScrollReveal.tsx';

interface HeaderProps {
  currentView: StoreView;
  onNavigate: (view: StoreView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  location: DeliveryLocation;
  onOpenLocation: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenOrders: () => void;
  wishlistCount: number;
  onOpenWishlist: () => void;
  cartCount: number;
  onOpenCart: () => void;
  fashionSubNav: string;
  onSelectFashionSubNav: (filter: string) => void;
  beautySubNav: string;
  onSelectBeautySubNav: (filter: string) => void;
}

const PRIMARY_NAV_ITEMS: { view: StoreView; label: string; icon: string }[] = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'fashion', label: 'Fashion', icon: 'checkroom' },
  { view: 'electronics', label: 'Electronics', icon: 'devices' },
  { view: 'beauty', label: 'Beauty', icon: 'spa' },
  { view: 'home-kitchen', label: 'Home & Kitchen', icon: 'chair' },
  { view: 'sports', label: 'Sports', icon: 'fitness_center' },
  { view: 'books', label: 'Books', icon: 'menu_book' },
  { view: 'toys', label: 'Toys', icon: 'toys' },
  { view: 'accessories', label: 'Accessories', icon: 'watch' },
];

const FASHION_SUBNAV = [
  'All',
  'Men',
  'Women',
  'Kids',
  'Footwear',
  'Watches',
  'Bags',
  'Accessories',
  'Ethnic Wear',
  'Western Wear',
  'Sportswear',
];

const BEAUTY_SUBNAV: { key: string; label: string; icon?: string }[] = [
  { key: 'All', label: 'All Beauty' },
  { key: 'Skincare', label: 'Skincare', icon: 'spa' },
  { key: 'Makeup', label: 'Makeup', icon: 'brush' },
  { key: 'Haircare', label: 'Haircare', icon: 'water_drop' },
  { key: 'Fragrances', label: 'Fragrances', icon: 'liquor' },
  { key: 'Bath & Body', label: 'Bath & Body' },
  { key: "Men's Grooming", label: "Men's Grooming" },
  { key: 'Beauty Tools', label: 'Beauty Tools' },
  { key: 'Personal Care', label: 'Personal Care' },
  { key: 'Lip Care', label: 'Lip Care' },
  { key: 'Sun Protection', label: 'Sun Protection' },
];

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M12.5 11V9C12.5 5.96243 14.9624 3.5 18 3.5C21.0376 3.5 23.5 5.96243 23.5 9V11"
          stroke={light ? '#F4F1EA' : '#0E3426'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <rect
          x="5.5"
          y="10.5"
          width="25"
          height="21.5"
          rx="5"
          stroke={light ? '#F4F1EA' : '#0E3426'}
          strokeWidth="2.2"
          fill={light ? 'rgba(255,255,255,0.06)' : '#FAF8F4'}
        />
        <path
          d="M18 26C18 26 23.2 23 23.2 18.2C23.2 16 21.4 14.5 19.5 14.5C18.6 14.5 18 15 18 15C18 15 17.4 14.5 16.5 14.5C14.6 14.5 12.8 16 12.8 18.2C12.8 23 18 26 18 26Z"
          stroke={light ? '#D3E0C2' : '#0E3426'}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M18 15.2V25.5"
          stroke={light ? '#D3E0C2' : '#0E3426'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col text-left">
        <span
          className={`font-display text-[22px] font-semibold tracking-tight leading-none whitespace-nowrap ${
            light ? 'text-light-on-primary' : 'text-light-primary'
          }`}
        >
          FindKart
        </span>
        <span
          className={`font-label text-[9.5px] tracking-[0.18em] uppercase mt-0.5 whitespace-nowrap ${
            light ? 'text-light-secondary-container' : 'text-light-on-surface-variant'
          }`}
        >
          SHOP BETTER INDIA
        </span>
      </div>
    </div>
  );
}

export function Header({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  location,
  onOpenLocation,
  user,
  onOpenAuth,
  onOpenOrders,
  wishlistCount,
  onOpenWishlist,
  cartCount,
  onOpenCart,
  fashionSubNav,
  onSelectFashionSubNav,
  beautySubNav,
  onSelectBeautySubNav,
}: HeaderProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!categoriesOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCategoriesOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [categoriesOpen]);

  const searchPlaceholder =
    currentView === 'fashion'
      ? 'Search fashion products, brands, ethnic styles...'
      : currentView === 'beauty'
        ? 'Search skincare, haircare, fragrances...'
        : currentView === 'customer-care'
          ? 'Search help topics, orders, or products...'
          : currentView === 'account'
            ? 'Search orders, products, or brands...'
            : 'Search products, brands and more...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchQuery);
  };

  const firstName = user ? user.name.split(' ')[0] : 'Account';

  return (
    <header className="sticky top-0 z-30 bg-light-surface-container-lowest text-light-on-surface border-b border-light-outline-variant/70 shadow-xs">
      {/* Slim Top Announcement Bar */}
      <div className="bg-light-primary text-light-on-primary text-[11px] sm:text-xs font-medium">
        <div className="max-w-7xl mx-auto px-3 sm:px-gutter-md lg:px-gutter-lg h-8 flex items-center justify-center gap-4 sm:gap-7 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px] text-accent-yellow" aria-hidden="true">
              local_shipping
            </span>
            Free Shipping on Orders Over ₹499
          </span>
          <span className="hidden sm:inline text-light-on-primary/30" aria-hidden="true">
            |
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px] text-accent-yellow" aria-hidden="true">
              published_with_changes
            </span>
            7-Day Easy Returns
          </span>
          <span className="hidden md:inline text-light-on-primary/30" aria-hidden="true">
            |
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="material-symbols-outlined text-[14px] text-accent-yellow" aria-hidden="true">
              verified_user
            </span>
            Cash on Delivery &amp; Secure Payments
          </span>
        </div>
      </div>

      {/* Desktop & Tablet Main Header Bar (md+) */}
      <div className="hidden md:flex max-w-7xl mx-auto px-gutter-md lg:px-gutter-lg h-[72px] items-center justify-between gap-4 lg:gap-7">
        {/* Brand Logo + Location */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary rounded-md cursor-pointer"
            aria-label="FindKart Home"
          >
            <BrandLogo />
          </button>

          <button
            type="button"
            onClick={onOpenLocation}
            aria-label={`Change delivery location from ${location.city} ${location.pincode}`}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-light-outline-variant/60 bg-light-surface-container-low/70 hover:border-light-primary/50 transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-light-primary shrink-0" aria-hidden="true">
              location_on
            </span>
            <div className="flex flex-col">
              <span className="font-label text-[10px] text-light-on-surface-variant leading-none">
                Deliver to
              </span>
              <span className="font-label text-label-md text-light-on-surface leading-tight whitespace-nowrap">
                {location.city} {location.pincode}
              </span>
            </div>
          </button>
        </div>

        {/* Rounded Studio Search Bar */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-xl" role="search">
          <div className="relative flex items-center bg-light-surface-container-low rounded-full border border-light-outline-variant/80 focus-within:border-light-primary focus-within:bg-white transition-colors">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full h-11 pl-5 pr-14 rounded-full bg-transparent text-light-on-surface placeholder:text-light-outline font-body text-body-md border-0 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Search FindKart catalog"
              className="absolute right-1.5 w-11 h-8 rounded-full bg-light-primary text-light-on-primary hover:bg-light-primary-container flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                search
              </span>
            </button>
          </div>
        </form>

        {/* Right Customer Actions */}
        <nav aria-label="Customer actions" className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          <button
            type="button"
            onClick={user ? () => onNavigate('account') : onOpenAuth}
            aria-current={currentView === 'account' ? 'page' : undefined}
            className={`inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              currentView === 'account'
                ? 'bg-sage-surface text-light-primary'
                : 'text-light-on-surface hover:bg-light-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
              person
            </span>
            <span className="font-label text-[11px] leading-tight max-w-20 truncate">{firstName}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label={`Wishlist (${wishlistCount})`}
            className="relative inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg text-light-on-surface hover:bg-light-surface-container-low transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
                favorite
              </span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-light-primary text-light-on-primary font-label text-[10px] flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="font-label text-[11px] leading-tight">Wishlist</span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Shopping cart (${cartCount})`}
            className="relative inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg text-light-on-surface hover:bg-light-surface-container-low transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="relative">
              <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
                shopping_cart
              </span>
              <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-light-primary text-light-on-primary font-label text-[10px] flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            </div>
            <span className="font-label text-[11px] leading-tight">Cart</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('customer-care')}
            aria-current={currentView === 'customer-care' ? 'page' : undefined}
            className={`inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              currentView === 'customer-care'
                ? 'bg-sage-surface text-light-primary'
                : 'text-light-on-surface-variant hover:bg-light-surface-container-low hover:text-light-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
              support_agent
            </span>
            <span className="font-label text-[11px] leading-tight">Care</span>
          </button>
        </nav>
      </div>

      {/* Mobile Header Bar */}
      <div className="md:hidden px-3 sm:px-gutter-md py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-left min-w-0 cursor-pointer"
            aria-label="FindKart Home"
          >
            <BrandLogo />
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={user ? () => onNavigate('account') : onOpenAuth}
              aria-label={user ? 'My Account' : 'Login'}
              aria-current={currentView === 'account' ? 'page' : undefined}
              className={`inline-flex items-center gap-1 px-2.5 h-9 rounded-full cursor-pointer border ${
                currentView === 'account'
                  ? 'bg-light-primary text-light-on-primary border-light-primary'
                  : 'bg-light-surface-container-low text-light-on-surface border-light-outline-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                person
              </span>
              <span className="font-label text-label-sm max-w-14 truncate">{firstName}</span>
            </button>
            <button
              type="button"
              onClick={onOpenWishlist}
              aria-label="Wishlist"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface hover:bg-light-surface-container-low cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                favorite
              </span>
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-light-primary text-light-on-primary font-label text-[10px] flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Cart"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface hover:bg-light-surface-container-low cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                shopping_cart
              </span>
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-light-primary text-light-on-primary font-label text-[10px] flex items-center justify-center tabular-nums">
                {cartCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('customer-care')}
              aria-label="Customer Care"
              className={`inline-flex items-center justify-center w-9 h-9 rounded-full cursor-pointer ${
                currentView === 'customer-care'
                  ? 'bg-sage-surface text-light-primary'
                  : 'text-light-on-surface-variant hover:bg-light-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                support_agent
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} role="search" className="relative flex items-center bg-light-surface-container-low rounded-full border border-light-outline-variant">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full h-10 pl-4 pr-14 rounded-full bg-transparent text-light-on-surface placeholder:text-light-outline font-body text-sm border-0 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1 w-10 h-8 rounded-full bg-light-primary text-light-on-primary flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
              search
            </span>
          </button>
        </form>

        <button
          type="button"
          onClick={onOpenLocation}
          className="flex items-center gap-1.5 text-light-on-surface-variant text-left w-fit py-0.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px] text-light-primary shrink-0" aria-hidden="true">
            location_on
          </span>
          <span className="font-body text-body-sm truncate">
            Deliver to <strong className="font-semibold text-light-on-surface">{location.city} {location.pincode}</strong>
          </span>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            expand_more
          </span>
        </button>
      </div>

      {/* Secondary Navigation Row */}
      {currentView === 'fashion' ? (
        <div className="bg-light-surface-container-lowest text-light-on-surface border-t border-light-outline-variant/50">
          <nav
            aria-label="Fashion categories"
            className="max-w-7xl mx-auto px-3 sm:px-gutter-md lg:px-gutter-lg py-2 flex items-center justify-start lg:justify-between gap-1.5 sm:gap-gutter-sm overflow-x-auto no-scrollbar snap-x"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-light-on-surface-variant hover:text-light-primary font-label text-label-md shrink-0 cursor-pointer snap-start whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_back
              </span>
              <span>Store</span>
            </button>
            {FASHION_SUBNAV.map((item) => {
              const isActive = fashionSubNav === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelectFashionSubNav(item)}
                  className={`px-3 py-1.5 rounded-md font-label text-label-md shrink-0 transition-colors cursor-pointer whitespace-nowrap snap-start ${
                    isActive
                      ? 'bg-light-primary text-light-on-primary'
                      : 'text-light-on-surface hover:bg-light-surface-container-low hover:text-light-primary'
                  }`}
                >
                  {item === 'All' ? 'All Fashion' : item}
                </button>
              );
            })}
          </nav>
        </div>
      ) : currentView === 'beauty' ? (
        <div className="bg-light-surface-container-lowest text-light-on-surface border-t border-light-outline-variant/50">
          <nav
            aria-label="Beauty categories"
            className="max-w-7xl mx-auto px-3 sm:px-gutter-md lg:px-gutter-lg py-2 flex items-center justify-start lg:justify-between gap-1.5 sm:gap-gutter-sm overflow-x-auto no-scrollbar snap-x"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-light-on-surface-variant hover:text-light-primary font-label text-label-md shrink-0 cursor-pointer snap-start whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_back
              </span>
              <span>Store</span>
            </button>
            {BEAUTY_SUBNAV.map((item) => {
              const isActive = beautySubNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectBeautySubNav(item.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md font-label text-label-md shrink-0 transition-colors cursor-pointer whitespace-nowrap snap-start ${
                    isActive
                      ? 'bg-light-primary text-light-on-primary'
                      : 'text-light-on-surface hover:bg-light-surface-container-low hover:text-light-primary'
                  }`}
                >
                  {item.icon && (
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        isActive ? 'text-light-on-primary' : 'text-light-primary'
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : (
        <div className="bg-light-surface-container-lowest text-light-on-surface border-t border-light-outline-variant/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-gutter-md lg:px-gutter-lg py-2 flex items-center gap-4 lg:gap-6">
            {/* All Categories Dropdown Button */}
            <div ref={dropdownRef} className="relative shrink-0 hidden sm:block">
              <button
                type="button"
                onClick={() => setCategoriesOpen((prev) => !prev)}
                aria-expanded={categoriesOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  menu
                </span>
                <span>All Categories</span>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {categoriesOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {categoriesOpen && (
                <div
                  role="menu"
                  aria-label="Store categories"
                  className="absolute left-0 top-full mt-2 w-60 rounded-xl bg-white border border-light-outline-variant shadow-lg py-2 z-50"
                >
                  {PRIMARY_NAV_ITEMS.filter((item) => item.view !== 'home').map((item) => (
                    <button
                      key={item.view}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onNavigate(item.view);
                        setCategoriesOpen(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-3 text-left font-body text-body-md text-light-on-surface hover:bg-sage-surface/60 hover:text-light-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-light-primary" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-light-outline-variant/60" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onOpenOrders();
                      setCategoriesOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-left font-body text-body-md text-light-on-surface hover:bg-sage-surface/60 hover:text-light-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-light-primary" aria-hidden="true">
                      local_shipping
                    </span>
                    <span>Track Order</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onNavigate('customer-care');
                      setCategoriesOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 text-left font-body text-body-md text-light-on-surface hover:bg-sage-surface/60 hover:text-light-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-light-primary" aria-hidden="true">
                      support_agent
                    </span>
                    <span>Customer Care</span>
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Single-Line Links */}
            <nav
              aria-label="Product categories"
              className="flex-1 flex items-center justify-start lg:justify-between gap-2 sm:gap-5 overflow-x-auto no-scrollbar snap-x"
            >
              {PRIMARY_NAV_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => onNavigate(item.view)}
                    className={`py-1.5 px-1 border-b-2 font-label text-label-md md:text-[13px] transition-colors shrink-0 cursor-pointer whitespace-nowrap snap-start ${
                      isActive
                        ? 'border-light-primary text-light-primary font-semibold'
                        : 'border-transparent text-light-on-surface-variant hover:text-light-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onOpenOrders}
                className="py-1.5 px-1 border-b-2 border-transparent font-label text-label-md md:text-[13px] text-light-on-surface-variant hover:text-light-primary transition-colors shrink-0 cursor-pointer whitespace-nowrap snap-start"
              >
                Track Order
              </button>
            </nav>
          </div>
        </div>
      )}
      <ScrollProgressBar />
    </header>
  );
}
