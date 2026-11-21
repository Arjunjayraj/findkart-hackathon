import React, { useRef, useState } from 'react';
import { CATALOG_PRODUCTS } from '../data/catalog.ts';
import type { Product, StoreView } from '../types/findkart.ts';
import { ProductCard } from './ProductCard.tsx';
import { ScrollReveal } from './ScrollReveal.tsx';

interface HomeViewProps {
  wishlistIds: string[];
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: StoreView) => void;
}

const HERO_SLIDES: {
  id: string;
  headlineTop: string;
  headlineBottom: string;
  subtitle: string;
  ctaLabel: string;
  targetView?: StoreView;
  offerHeading: string;
  offerValue: string;
  imageUrl: string;
  imageAlt: string;
}[] = [
  {
    id: 'everyday',
    headlineTop: 'Elevate Your',
    headlineBottom: 'Everyday',
    subtitle: 'Discover quality products across every category — thoughtfully curated for the way you live in India.',
    ctaLabel: 'Shop Now',
    offerHeading: 'SEASONAL SALE',
    offerValue: 'UP TO 40% OFF',
    imageUrl: '/src/assets/images/hero_everyday_lifestyle_1795289102333.jpg',
    imageAlt: 'Minimalist lifestyle flatlay featuring sage carry-on suitcase, cream leather sneakers, speaker, amber skincare bottle, and botanicals',
  },
  {
    id: 'fashion',
    headlineTop: 'Tailored Craft &',
    headlineBottom: 'Fresh Styles',
    subtitle: 'Handpicked ethnic wear, structured totes, and breathable linen silhouettes with doorstep Cash on Delivery.',
    ctaLabel: 'Explore Fashion',
    targetView: 'fashion',
    offerHeading: 'NEW ARRIVALS',
    offerValue: 'MIN. 35% OFF',
    imageUrl: '/src/assets/images/promo_fashion_tote_1795289102649.jpg',
    imageAlt: 'Structured deep pine leather handbag on warm botanical backdrop',
  },
  {
    id: 'living',
    headlineTop: 'Design Spaces',
    headlineBottom: 'You Love',
    subtitle: 'From warm Scandinavian accent seating to matte-finish kitchenware and ambient audio essentials.',
    ctaLabel: 'Shop Living',
    targetView: 'home-kitchen',
    offerHeading: 'HOME REFRESH',
    offerValue: 'STARTING ₹799',
    imageUrl: '/src/assets/images/promo_home_lounge_1795289103559.jpg',
    imageAlt: 'Modern Scandinavian cream bouclé armchair beside a light oak side table and potted olive tree',
  },
];

const CATEGORY_STRIP: {
  view: StoreView;
  label: string;
  icon: string;
  tintClass: string;
  iconColorClass: string;
}[] = [
  { view: 'electronics', label: 'Electronics', icon: 'devices', tintClass: 'bg-[#E6EEF2]', iconColorClass: 'text-[#1F4A5C]' },
  { view: 'fashion', label: 'Fashion', icon: 'checkroom', tintClass: 'bg-[#F5E7E1]', iconColorClass: 'text-[#8C3F30]' },
  { view: 'home-kitchen', label: 'Home & Living', icon: 'chair', tintClass: 'bg-[#F5EFE0]', iconColorClass: 'text-[#7B5B26]' },
  { view: 'beauty', label: 'Beauty', icon: 'spa', tintClass: 'bg-[#F4E6EC]', iconColorClass: 'text-[#7F3954]' },
  { view: 'sports', label: 'Sports', icon: 'fitness_center', tintClass: 'bg-[#E5EEE8]', iconColorClass: 'text-[#1D543B]' },
  { view: 'toys', label: 'Toys & Kids', icon: 'toys', tintClass: 'bg-[#F1ECE0]', iconColorClass: 'text-[#6A572A]' },
  { view: 'books', label: 'Books', icon: 'menu_book', tintClass: 'bg-[#EFE6EA]', iconColorClass: 'text-[#683C4C]' },
  { view: 'accessories', label: 'Accessories', icon: 'watch', tintClass: 'bg-[#EAE8F2]', iconColorClass: 'text-[#433E6B]' },
];

const CUSTOMER_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Ananya S.',
    initials: 'AS',
    city: 'Bengaluru',
    rating: 5,
    quote: '"Amazing build quality and next-day delivery! FindKart has become my go-to store for everything from home accents to audio."',
  },
  {
    id: 'rev-2',
    name: 'Vikram T.',
    initials: 'VT',
    city: 'Mumbai',
    rating: 5,
    quote: '"Fair everyday prices, transparent Cash on Delivery inspection, and genuinely effortless 7-day returns. Highly recommend!"',
  },
  {
    id: 'rev-3',
    name: 'Priya K.',
    initials: 'PK',
    city: 'Chennai',
    rating: 5,
    quote: '"I love the curated variety they offer. From linen kurtis to smartwatches, everything feels thoughtfully vetted and reliable."',
  },
  {
    id: 'rev-4',
    name: 'Rohan M.',
    initials: 'RM',
    city: 'Pune',
    rating: 5,
    quote: '"Had a quick sizing exchange and human support sorted it out in under three hours. Refreshingly honest shopping experience."',
  },
  {
    id: 'rev-5',
    name: 'Meera N.',
    initials: 'MN',
    city: 'Hyderabad',
    rating: 5,
    quote: '"Packaging is super clean and zero plastic filler where avoidable. My SoundCore headphones arrived sealed and ahead of schedule."',
  },
  {
    id: 'rev-6',
    name: 'Kabir D.',
    initials: 'KD',
    city: 'New Delhi',
    rating: 5,
    quote: '"Great discounts during seasonal drops without any gimmicky checkout fees. Saved my office and home addresses for 1-click orders."',
  },
];

export function HomeView({
  wishlistIds,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct,
  onNavigate,
}: HomeViewProps) {
  const [heroSlide, setHeroSlide] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'error' | 'subscribed'>('idle');
  const topPicksScrollRef = useRef<HTMLDivElement>(null);

  const activeSlide = HERO_SLIDES[heroSlide] ?? HERO_SLIDES[0];

  const trending = CATALOG_PRODUCTS.filter((p) => p.homeSections?.includes('trending'));
  const deals = CATALOG_PRODUCTS.filter((p) => p.homeSections?.includes('deals'));
  const fashionSpotlightIds = [
    'fashion-hoodie-roadster',
    'fashion-saree-fabindia',
    'fashion-loafers-roadster',
    'fashion-sling-lavie',
  ];
  const fashionSpotlight = fashionSpotlightIds
    .map((id) => CATALOG_PRODUCTS.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const topPicks = [...trending, ...fashionSpotlight.slice(0, 2)].slice(0, 8);
  const fashionCount = CATALOG_PRODUCTS.filter((p) => p.storeSection === 'fashion').length;

  const reviewTotalPages = Math.ceil(CUSTOMER_REVIEWS.length / 3);
  const visibleReviews = CUSTOMER_REVIEWS.slice(reviewPage * 3, reviewPage * 3 + 3);

  const handleScrollTopPicks = (direction: 'left' | 'right') => {
    const el = topPicksScrollRef.current;
    if (!el) return;
    const step = direction === 'right' ? 520 : -520;
    el.scrollBy({ left: step, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('subscribed');
    setNewsletterEmail('');
  };

  return (
    <div className="bg-light-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-gutter-md lg:px-gutter-lg py-gutter-md md:py-gutter-lg flex flex-col gap-10 md:gap-14">
        {/* Hero Lifestyle Banner */}
        <section
          aria-label="Featured promotion"
          className="relative bg-[#ECE8DD] rounded-2xl overflow-hidden border border-light-outline-variant/70 shadow-xs"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center min-h-[360px] lg:min-h-[420px]">
            {/* Left Copy Column */}
            <div className="lg:col-span-5 p-6 sm:p-8 lg:pl-12 lg:pr-6 lg:py-10 flex flex-col gap-4 z-10">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[52px] leading-[1.08] font-semibold text-light-on-surface tracking-tight text-balance">
                {activeSlide.headlineTop}
                <br />
                {activeSlide.headlineBottom}
              </h1>
              <p className="font-body text-body-md sm:text-[15px] leading-relaxed text-light-on-surface-variant text-pretty max-w-md">
                {activeSlide.subtitle}
              </p>

              <div className="pt-1">
                {activeSlide.targetView ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(activeSlide.targetView!)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <span>{activeSlide.ctaLabel}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                ) : (
                  <a
                    href="#top-picks"
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-lg transition-colors shadow-xs"
                  >
                    <span>{activeSlide.ctaLabel}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </a>
                )}
              </div>

              {/* Trust Strip */}
              <div className="pt-3 flex items-center flex-wrap gap-x-5 gap-y-2 text-[12px] font-medium text-light-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-light-primary" aria-hidden="true">
                    verified
                  </span>
                  Premium Quality
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-light-primary" aria-hidden="true">
                    sell
                  </span>
                  Fair Everyday Prices
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-light-primary" aria-hidden="true">
                    payments
                  </span>
                  Cash on Delivery
                </span>
              </div>
            </div>

            {/* Right Studio Photography Column */}
            <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-[420px]">
              <img
                src={activeSlide.imageUrl}
                alt={activeSlide.imageAlt}
                className="w-full h-full object-cover object-center"
              />
              {/* Soft edge blend on desktop */}
              <div
                className="hidden lg:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#ECE8DD] to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {/* Seasonal Offer Fold Tag */}
              <div className="absolute top-0 right-5 sm:right-8 bg-light-primary text-light-on-primary px-4 py-3.5 rounded-b-xl shadow-md text-center">
                <div className="font-label text-[10px] tracking-widest uppercase text-light-secondary-container">
                  {activeSlide.offerHeading}
                </div>
                <div className="font-display text-lg sm:text-xl font-semibold leading-tight mt-0.5 tabular-nums">
                  {activeSlide.offerValue}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Slide Dots */}
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full">
            {HERO_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setHeroSlide(idx)}
                aria-label={`Show hero slide ${idx + 1}: ${slide.headlineTop} ${slide.headlineBottom}`}
                aria-pressed={heroSlide === idx}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  heroSlide === idx ? 'w-6 bg-light-primary' : 'w-2 bg-light-outline/50 hover:bg-light-primary/60'
                }`}
              />
            ))}
          </div>
        </section>

        {/* Circular Category Strip */}
        <section aria-label="Browse categories" className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
          {CATEGORY_STRIP.map((cat) => (
            <button
              key={cat.view}
              type="button"
              onClick={() => onNavigate(cat.view)}
              className="group flex flex-col items-center gap-2.5 p-2 rounded-xl hover:bg-light-surface-container-low transition-colors cursor-pointer"
            >
              <span
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${cat.tintClass} flex items-center justify-center border border-light-outline-variant/40 group-hover:scale-105 group-hover:border-light-primary/40 transition-transform`}
              >
                <span className={`material-symbols-outlined text-[25px] ${cat.iconColorClass}`} aria-hidden="true">
                  {cat.icon}
                </span>
              </span>
              <span className="font-label text-[12px] font-semibold text-light-on-surface group-hover:text-light-primary text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => onNavigate('fashion')}
            className="group flex flex-col items-center gap-2.5 p-2 rounded-xl hover:bg-light-surface-container-low transition-colors cursor-pointer col-span-3 sm:col-span-1"
          >
            <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ECE8DE] flex items-center justify-center border border-light-outline-variant/50 group-hover:scale-105 group-hover:border-light-primary/40 transition-transform">
              <span className="material-symbols-outlined text-[24px] text-light-primary" aria-hidden="true">
                grid_view
              </span>
            </span>
            <span className="font-label text-[12px] font-semibold text-light-on-surface group-hover:text-light-primary text-center leading-tight">
              View All
            </span>
          </button>
        </section>

        {/* Top Picks For You (Horizontal Scroll Track + Nav Controls) */}
        <section id="top-picks" className="flex flex-col gap-5 scroll-mt-28">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-[28px] font-semibold text-light-on-surface tracking-tight">
              Top Picks For You
            </h2>
            <a
              href="#best-deals"
              className="font-label text-[13px] font-semibold text-light-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>See All Deals</span>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_forward
              </span>
            </a>
          </div>

          <div className="relative">
            <div
              ref={topPicksScrollRef}
              className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x pb-2"
            >
              {topPicks.map((product) => (
                <div key={product.id} className="w-[210px] sm:w-[232px] lg:w-[238px] shrink-0 snap-start">
                  <ProductCard
                    product={product}
                    isWishlisted={wishlistIds.includes(product.id)}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    onSelectProduct={onSelectProduct}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleScrollTopPicks('left')}
              aria-label="Scroll top picks left"
              className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-light-outline-variant shadow-md items-center justify-center text-light-primary hover:bg-sage-surface transition-colors cursor-pointer z-10"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleScrollTopPicks('right')}
              aria-label="Scroll top picks right"
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-light-outline-variant shadow-md items-center justify-center text-light-primary hover:bg-sage-surface transition-colors cursor-pointer z-10"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>
        </section>

        {/* 3-Column Editorial Promo Bento */}
        <ScrollReveal>
          <section aria-label="Curated collections" className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => onNavigate('fashion')}
              className="group relative rounded-2xl overflow-hidden bg-sage-surface border border-light-outline-variant/60 text-left min-h-[195px] flex items-center justify-between p-6 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="relative z-10 flex flex-col gap-1.5 max-w-[56%]">
                <span className="font-label text-[11px] font-semibold tracking-wider uppercase text-light-on-surface-variant">
                  New Arrivals
                </span>
                <h3 className="font-display text-xl sm:text-[22px] leading-snug font-semibold text-light-on-surface">
                  Fresh Styles Just In
                </h3>
                <span className="mt-3 inline-flex items-center gap-1 font-label text-[13px] font-semibold text-light-primary">
                  Shop Now
                  <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </div>
              <img
                src="/src/assets/images/promo_fashion_tote_1795289102649.jpg"
                alt="Deep forest green structured handbag"
                className="w-36 sm:w-40 h-32 object-cover rounded-xl shadow-xs group-hover:scale-[1.03] transition-transform"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('home-kitchen')}
              className="group relative rounded-2xl overflow-hidden bg-[#ECE6DA] border border-light-outline-variant/60 text-left min-h-[195px] flex items-center justify-between p-6 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="relative z-10 flex flex-col gap-1.5 max-w-[56%]">
                <span className="font-label text-[11px] font-semibold tracking-wider uppercase text-light-on-surface-variant">
                  Home Refresh
                </span>
                <h3 className="font-display text-xl sm:text-[22px] leading-snug font-semibold text-light-on-surface">
                  Make Your Space Better
                </h3>
                <span className="mt-3 inline-flex items-center gap-1 font-label text-[13px] font-semibold text-light-primary">
                  Shop Now
                  <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </div>
              <img
                src="/src/assets/images/promo_home_lounge_1795289103559.jpg"
                alt="Scandinavian armchair and oak side table"
                className="w-36 sm:w-40 h-32 object-cover rounded-xl shadow-xs group-hover:scale-[1.03] transition-transform"
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('electronics')}
              className="group relative rounded-2xl overflow-hidden bg-[#E2ECEE] border border-light-outline-variant/60 text-left min-h-[195px] flex items-center justify-between p-6 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="relative z-10 flex flex-col gap-1.5 max-w-[56%]">
                <span className="font-label text-[11px] font-semibold tracking-wider uppercase text-light-on-surface-variant">
                  Tech Essentials
                </span>
                <h3 className="font-display text-xl sm:text-[22px] leading-snug font-semibold text-light-on-surface">
                  Upgrade Your Lifestyle
                </h3>
                <span className="mt-3 inline-flex items-center gap-1 font-label text-[13px] font-semibold text-light-primary">
                  Shop Now
                  <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </div>
              <img
                src="/src/assets/images/promo_tech_watch_1795289102243.jpg"
                alt="Matte charcoal AMOLED smartwatch"
                className="w-36 sm:w-40 h-32 object-cover rounded-xl shadow-xs group-hover:scale-[1.03] transition-transform"
              />
            </button>
          </section>
        </ScrollReveal>

        {/* Best Deals Grid */}
        <section id="best-deals" className="flex flex-col gap-5 scroll-mt-28">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl sm:text-[28px] font-semibold text-light-on-surface tracking-tight">
                Best Everyday Deals
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant mt-0.5">
                Limited-time savings across audio, home appliances &amp; accessories
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('fashion')}
              className="font-label text-[13px] font-semibold text-light-primary hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Explore {fashionCount} Fashion Styles</span>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
            {deals.slice(0, 4).map((product, index) => (
              <ScrollReveal key={product.id} delay={(index % 4) * 0.04} className="h-full min-w-0">
                <ProductCard
                  product={product}
                  isWishlisted={wishlistIds.includes(product.id)}
                  showBrand
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  onSelectProduct={onSelectProduct}
                />
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Loved By Thousands (Verified Customer Reviews) */}
        <section aria-label="Customer reviews" className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-display text-2xl sm:text-[28px] font-semibold text-light-on-surface tracking-tight">
              Loved By Thousands
            </h2>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-light-on-surface">
              <span className="font-semibold tabular-nums">4.8/5</span>
              <span className="text-light-on-surface-variant">Average Rating</span>
              <div className="flex items-center text-accent-yellow" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setReviewPage((prev) => (prev - 1 + reviewTotalPages) % reviewTotalPages)}
              aria-label="Previous customer reviews"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white border border-light-outline-variant hover:border-light-primary text-light-primary items-center justify-center shrink-0 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                chevron_left
              </span>
            </button>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleReviews.map((review) => (
                <article
                  key={review.id}
                  className="bg-white rounded-xl border border-light-outline-variant/75 p-5 flex items-start gap-3.5 shadow-xs"
                >
                  <div className="w-11 h-11 rounded-full bg-sage-surface text-light-primary font-title font-bold text-sm flex items-center justify-center shrink-0">
                    {review.initials}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-title font-semibold text-sm text-light-on-surface">{review.name}</span>
                      <span
                        className="material-symbols-outlined text-[14px] text-success"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Verified Buyer"
                      >
                        verified
                      </span>
                      <span className="font-body text-[11px] text-light-on-surface-variant">· {review.city}</span>
                    </div>
                    <div className="flex items-center text-accent-yellow" aria-label={`${review.rating} out of 5 stars`}>
                      {[0, 1, 2, 3, 4].map((star) => (
                        <span
                          key={star}
                          className="material-symbols-outlined text-[13px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-body text-[12.5px] leading-relaxed text-light-on-surface-variant mt-0.5">
                      {review.quote}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setReviewPage((prev) => (prev + 1) % reviewTotalPages)}
              aria-label="Next customer reviews"
              className="hidden sm:flex w-9 h-9 rounded-full bg-white border border-light-outline-variant hover:border-light-primary text-light-primary items-center justify-center shrink-0 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>
        </section>

        {/* Stay in the Loop Newsletter Banner */}
        <section
          aria-label="Newsletter signup"
          className="bg-light-primary text-light-on-primary rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 shadow-sm"
        >
          <div className="lg:col-span-6 flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-light-primary flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[32px]" aria-hidden="true">
                mail
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl sm:text-[26px] font-semibold leading-tight">
                Stay in the Loop
              </h2>
              <p className="font-body text-body-sm sm:text-body-md text-light-inverse-primary/90 max-w-md">
                Get exclusive deals, new seasonal arrivals, and curated picks straight to your inbox.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5 bg-white/95 p-1.5 rounded-xl">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  if (newsletterStatus !== 'idle') setNewsletterStatus('idle');
                }}
                placeholder="Enter your email address"
                className="flex-1 px-4 py-2.5 rounded-lg bg-transparent text-light-on-surface placeholder:text-light-outline font-body text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-light-secondary-container text-on-accent-yellow hover:bg-accent-yellow font-label text-label-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
            {newsletterStatus === 'error' && (
              <p className="mt-2 font-body text-xs text-light-error-container">
                Please enter a valid email address.
              </p>
            )}
            {newsletterStatus === 'subscribed' ? (
              <p className="mt-2 font-body text-xs text-light-secondary-container inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  check_circle
                </span>
                Subscribed! Watch your inbox for our next seasonal drop.
              </p>
            ) : (
              <p className="mt-2 font-body text-[11.5px] text-light-inverse-primary/80 inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  lock
                </span>
                We respect your privacy. Unsubscribe anytime.
              </p>
            )}
          </div>
        </section>

        {/* 4-Column Service Guarantee Bar */}
        <section
          aria-label="FindKart service guarantees"
          className="bg-white rounded-2xl border border-light-outline-variant/75 px-5 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6 shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined text-[28px] text-light-primary shrink-0" aria-hidden="true">
              local_shipping
            </span>
            <div>
              <h3 className="font-title text-sm font-semibold text-light-on-surface">Free Shipping</h3>
              <p className="font-body text-xs text-light-on-surface-variant">On orders over ₹499 across India</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined text-[28px] text-light-primary shrink-0" aria-hidden="true">
              published_with_changes
            </span>
            <div>
              <h3 className="font-title text-sm font-semibold text-light-on-surface">Easy Returns</h3>
              <p className="font-body text-xs text-light-on-surface-variant">7-day doorstep pickup policy</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined text-[28px] text-light-primary shrink-0" aria-hidden="true">
              verified_user
            </span>
            <div>
              <h3 className="font-title text-sm font-semibold text-light-on-surface">Secure Payments</h3>
              <p className="font-body text-xs text-light-on-surface-variant">Cash on Delivery &amp; UPI verified</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined text-[28px] text-light-primary shrink-0" aria-hidden="true">
              support_agent
            </span>
            <div>
              <h3 className="font-title text-sm font-semibold text-light-on-surface">Human Support</h3>
              <p className="font-body text-xs text-light-on-surface-variant">6-hour specialist response SLA</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
