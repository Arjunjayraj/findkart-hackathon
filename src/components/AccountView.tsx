import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG_PRODUCTS } from '../data/catalog.ts';
import type {
  AccountSettings,
  Order,
  PaymentPreferences,
  Product,
  SavedAddress,
  StoreView,
  UserProfile,
} from '../types/findkart.ts';
import { safeParseApiResponse } from '../utils/api.ts';
import { ProductImage } from './ProductImage.tsx';

interface AccountViewProps {
  user: UserProfile | null;
  authToken: string | null;
  orders: Order[];
  wishlistIds: string[];
  cartCount: number;
  recentlyViewedIds: string[];
  onNavigate: (view: StoreView) => void;
  onOpenAuth: () => void;
  onOpenCart: () => void;
  onSignOut: () => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
  onUpdateUserProfile: (updated: UserProfile, nextToken?: string) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onContactSupport: (orderId?: string) => void;
  onShowToast: (msg: string) => void;
}

type AccountNavKey = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'payments';

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Delhi',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'West Bengal',
  'Uttar Pradesh',
  'Kerala',
  'Rajasthan',
];

export function AccountView({
  user,
  authToken,
  orders,
  wishlistIds,
  cartCount,
  recentlyViewedIds,
  onNavigate,
  onOpenAuth,
  onOpenCart,
  onSignOut,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct,
  onUpdateUserProfile,
  onUpdateOrders,
  onContactSupport,
  onShowToast,
}: AccountViewProps) {
  const [activeNav, setActiveNav] = useState<AccountNavKey>('profile');
  const fullNameInputRef = useRef<HTMLInputElement | null>(null);

  // Personal info form state
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Prefer not to say'>(
    user?.gender || 'Male'
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change modal/panel state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Orders UI state
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [expandedTrackOrderId, setExpandedTrackOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Addresses state
  const [addresses, setAddresses] = useState<SavedAddress[]>(user?.addresses || []);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrFullName, setAddrFullName] = useState(user?.name || '');
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [addrLine, setAddrLine] = useState('');
  const [addrCity, setAddrCity] = useState(user?.location?.city || 'Bengaluru');
  const [addrState, setAddrState] = useState('Karnataka');
  const [addrPincode, setAddrPincode] = useState(user?.location?.pincode || '560001');
  const [addrPhone, setAddrPhone] = useState(user?.phone || '');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [savingAddresses, setSavingAddresses] = useState(false);

  // Payment preferences & account settings
  const [paymentPrefs, setPaymentPrefs] = useState<PaymentPreferences>(
    user?.paymentPreferences || {
      preferredMethod: 'cod',
      upiId: '',
      cardLabel: '',
      cardExpiry: '',
    }
  );
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(
    user?.accountSettings || {
      smsAlerts: true,
      priceDropEmails: true,
      twoStepAuth: false,
    }
  );
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDateOfBirth(user.dateOfBirth || '');
    setGender(user.gender || 'Male');
    setAddresses(Array.isArray(user.addresses) ? user.addresses : []);
    setPaymentPrefs(
      user.paymentPreferences || {
        preferredMethod: 'cod',
        upiId: '',
        cardLabel: '',
        cardExpiry: '',
      }
    );
    setAccountSettings(
      user.accountSettings || {
        smsAlerts: true,
        priceDropEmails: true,
        twoStepAuth: false,
      }
    );
  }, [user]);

  const productMap = useMemo(
    () => new Map(CATALOG_PRODUCTS.map((p) => [p.id, p])),
    []
  );

  const wishlistProducts = useMemo(
    () =>
      wishlistIds
        .map((id) => productMap.get(id))
        .filter((p): p is Product => Boolean(p)),
    [wishlistIds, productMap]
  );

  const recentlyViewedProducts = useMemo(() => {
    const resolved = recentlyViewedIds
      .map((id) => productMap.get(id))
      .filter((p): p is Product => Boolean(p));
    if (resolved.length > 0) return resolved.slice(0, 4);
    return CATALOG_PRODUCTS.slice(0, 4);
  }, [recentlyViewedIds, productMap]);

  const displayedOrders = showAllOrders ? orders : orders.slice(0, 3);

  const scrollToSection = (key: AccountNavKey) => {
    setActiveNav(key);
    const el = document.getElementById(`account-section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'FindKart',
    };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    return headers;
  };

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto w-full px-gutter-md py-section">
        <div className="bg-light-surface-container-lowest rounded-md border border-light-outline-variant p-gutter-lg sm:p-gutter-xl text-center flex flex-col items-center gap-gutter-md shadow-sm">
          <div className="w-14 h-14 rounded-full bg-light-surface-container flex items-center justify-center text-light-primary">
            <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
              account_circle
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-headline text-headline-sm text-light-on-surface">
              Sign in to manage your FindKart account
            </h1>
            <p className="font-body text-body-md text-light-on-surface-variant max-w-md">
              Access your personal profile, track orders, manage saved delivery addresses, and customize payment preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors cursor-pointer"
            >
              Sign in or Create Account
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low font-label text-label-md transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      onShowToast('Please enter your full name (at least 2 characters)');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
          gender,
        }),
      });
      const parsed = await safeParseApiResponse<{ user?: UserProfile; token?: string; message?: string }>(res);
      if (parsed.isHtmlFallback) {
        onUpdateUserProfile({
          ...user,
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
          gender,
        });
        onShowToast('Profile details saved');
        return;
      }
      if (!parsed.ok || !parsed.data?.user) {
        throw new Error(parsed.errorMessage || 'Could not update profile');
      }
      onUpdateUserProfile(parsed.data.user, parsed.data.token);
      onShowToast('Profile details updated');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Unable to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const parsed = await safeParseApiResponse<{ ok?: boolean; message?: string }>(res);
      if (!parsed.isHtmlFallback && !parsed.ok) {
        throw new Error(parsed.errorMessage || 'Could not update password.');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);
      onShowToast('Password updated successfully');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const persistAddresses = async (nextAddresses: SavedAddress[], toastLabel: string) => {
    setSavingAddresses(true);
    try {
      const res = await fetch('/api/user/addresses', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ addresses: nextAddresses }),
      });
      const parsed = await safeParseApiResponse<{
        addresses?: SavedAddress[];
        location?: { city: string; pincode: string };
        message?: string;
      }>(res);
      if (parsed.isHtmlFallback) {
        setAddresses(nextAddresses);
        const def = nextAddresses.find((a) => a.isDefault);
        onUpdateUserProfile({
          ...user,
          addresses: nextAddresses,
          location: def ? { city: def.city, pincode: def.pincode } : user.location,
        });
        onShowToast(toastLabel);
        return true;
      }
      if (!parsed.ok || !parsed.data?.addresses) {
        throw new Error(parsed.errorMessage || 'Could not save address');
      }
      setAddresses(parsed.data.addresses);
      onUpdateUserProfile({
        ...user,
        addresses: parsed.data.addresses,
        location: parsed.data.location || user.location,
      });
      onShowToast(toastLabel);
      return true;
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Unable to update addresses');
      return false;
    } finally {
      setSavingAddresses(false);
    }
  };

  const openAddAddressForm = () => {
    setEditingAddressId(null);
    setAddrFullName(user.name || '');
    setAddrLabel(addresses.length === 0 ? 'Home' : 'Office');
    setAddrLine('');
    setAddrCity(user.location.city || 'Bengaluru');
    setAddrState('Karnataka');
    setAddrPincode(user.location.pincode || '560001');
    setAddrPhone(user.phone || '');
    setAddrIsDefault(addresses.length === 0);
    setAddressFormOpen(true);
  };

  const openEditAddressForm = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddrFullName(addr.fullName);
    setAddrLabel(addr.label);
    setAddrLine(addr.addressLine);
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPincode(addr.pincode);
    setAddrPhone(addr.phone);
    setAddrIsDefault(addr.isDefault);
    setAddressFormOpen(true);
  };

  const handleSaveAddressForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addrFullName.trim().length < 2 || addrLine.trim().length < 5 || !/^\d{6}$/.test(addrPincode.trim())) {
      onShowToast('Enter recipient name, complete street address, and a valid 6-digit pin code');
      return;
    }
    const newEntry: SavedAddress = {
      id: editingAddressId || `addr_${Date.now().toString(36)}`,
      fullName: addrFullName.trim(),
      label: addrLabel,
      isDefault: addrIsDefault || addresses.length === 0,
      addressLine: addrLine.trim(),
      city: addrCity.trim(),
      state: addrState.trim() || 'Karnataka',
      pincode: addrPincode.trim(),
      phone: addrPhone.trim(),
    };
    let next = editingAddressId
      ? addresses.map((a) => (a.id === editingAddressId ? newEntry : a))
      : [...addresses, newEntry];
    if (newEntry.isDefault) {
      next = next.map((a) => ({ ...a, isDefault: a.id === newEntry.id }));
    }
    const ok = await persistAddresses(
      next,
      editingAddressId ? 'Address updated' : 'New delivery address added'
    );
    if (ok) {
      setAddressFormOpen(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const remaining = addresses.filter((a) => a.id !== addressId);
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    await persistAddresses(remaining, 'Address removed');
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === addressId }));
    await persistAddresses(updated, 'Default delivery address updated');
  };

  const persistPreferences = async (
    nextPay: PaymentPreferences,
    nextSettings: AccountSettings,
    toastLabel: string
  ) => {
    setSavingPreferences(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          paymentPreferences: nextPay,
          accountSettings: nextSettings,
        }),
      });
      const parsed = await safeParseApiResponse<{
        paymentPreferences?: PaymentPreferences;
        accountSettings?: AccountSettings;
      }>(res);
      if (!parsed.isHtmlFallback && !parsed.ok) {
        throw new Error(parsed.errorMessage || 'Could not save preferences');
      }
      onUpdateUserProfile({
        ...user,
        paymentPreferences: parsed.data?.paymentPreferences || nextPay,
        accountSettings: parsed.data?.accountSettings || nextSettings,
      });
      onShowToast(toastLabel);
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Unable to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'cancel' | 'return') => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
      });
      const parsed = await safeParseApiResponse<{ orders?: Order[]; status?: string }>(res);
      if (parsed.isHtmlFallback) {
        const nextStatus = action === 'cancel' ? 'Cancelled by Customer' : 'Return Requested';
        onUpdateOrders(
          orders.map((o) => (o.orderId === orderId ? { ...o, status: nextStatus } : o))
        );
        onShowToast(
          action === 'cancel'
            ? `Order #${orderId} cancelled`
            : `Return requested for #${orderId}`
        );
        return;
      }
      if (!parsed.ok || !parsed.data?.orders) {
        throw new Error(parsed.errorMessage || 'Could not update order');
      }
      onUpdateOrders(parsed.data.orders);
      onShowToast(
        action === 'cancel'
          ? `Order #${orderId} cancelled`
          : `Return requested for #${orderId}`
      );
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Unable to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  const navItems: { key: AccountNavKey; label: string; mobileLabel: string; icon: string }[] = [
    { key: 'profile', label: 'My Profile', mobileLabel: 'My Profile', icon: 'person' },
    { key: 'orders', label: 'My Orders', mobileLabel: 'My Orders', icon: 'inventory_2' },
    { key: 'addresses', label: 'Saved Addresses', mobileLabel: 'Addresses', icon: 'location_on' },
    { key: 'wishlist', label: 'Wishlist', mobileLabel: 'Wishlist', icon: 'favorite' },
    { key: 'payments', label: 'Payments', mobileLabel: 'Payments', icon: 'account_balance_wallet' },
  ];

  return (
    <div className="bg-light-background flex-1 py-gutter-md md:py-gutter-lg">
      <div className="max-w-7xl mx-auto px-gutter-md lg:px-gutter-lg flex flex-col gap-gutter-md md:gap-gutter-lg">
        {/* Profile Header Card */}
        <section
          aria-label="Account overview"
          className="bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md shadow-xs"
        >
          <div className="flex items-center gap-gutter-md min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-light-primary text-light-on-primary flex items-center justify-center font-headline text-headline-sm shrink-0">
              {initials}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-headline-sm sm:text-headline-md text-light-on-surface truncate">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent-yellow text-on-accent-yellow font-label text-label-sm">
                  <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                    verified
                  </span>
                  VERIFIED
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-body-sm sm:text-body-md text-light-on-surface-variant">
                <span className="inline-flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    mail
                  </span>
                  {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                      call
                    </span>
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              scrollToSection('profile');
              window.setTimeout(() => fullNameInputRef.current?.focus(), 200);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              edit
            </span>
            <span>Edit Profile</span>
          </button>
        </section>

        {/* Mobile Horizontal Tab Navigation */}
        <nav
          aria-label="Account sections"
          className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
        >
          {navItems.map((item) => {
            const active = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => scrollToSection(item.key)}
                className={`px-3.5 py-2 rounded font-label text-label-md shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-light-primary text-light-on-primary'
                    : 'bg-light-surface-container-lowest text-light-on-surface border border-light-outline-variant/70'
                }`}
              >
                {item.mobileLabel}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onOpenCart}
            className="px-3.5 py-2 rounded bg-light-surface-container-lowest text-light-on-surface border border-light-outline-variant/70 font-label text-label-md shrink-0 whitespace-nowrap cursor-pointer"
          >
            Cart ({cartCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('customer-care')}
            className="px-3.5 py-2 rounded bg-light-surface-container-lowest text-light-on-surface border border-light-outline-variant/70 font-label text-label-md shrink-0 whitespace-nowrap cursor-pointer"
          >
            Customer Care
          </button>
        </nav>

        {/* Desktop 2-Column Account Shell */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
          {/* Left Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-28 bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-2 shadow-xs">
            <nav aria-label="Account navigation" className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => scrollToSection(item.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-label text-label-md text-left transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-light-surface-container-low text-light-primary'
                        : 'text-light-on-surface-variant hover:bg-light-surface-container-low hover:text-light-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onOpenCart}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded font-label text-label-md text-light-on-surface-variant hover:bg-light-surface-container-low hover:text-light-on-surface transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                    shopping_cart
                  </span>
                  <span>My Cart</span>
                </span>
                {cartCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent-yellow text-on-accent-yellow font-label text-label-sm inline-flex items-center justify-center tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('customer-care')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-label text-label-md text-light-on-surface-variant hover:bg-light-surface-container-low hover:text-light-on-surface text-left transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                  support_agent
                </span>
                <span>Customer Care</span>
              </button>

              <div className="my-1 border-t border-light-outline-variant/60" />

              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded font-label text-label-md text-light-error hover:bg-light-error-container/30 text-left transition-colors cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                  logout
                </span>
                <span>Logout</span>
              </button>
            </nav>
          </aside>

          {/* Right Main Sections */}
          <div className="lg:col-span-9 flex flex-col gap-gutter-lg">
            {/* 1. Personal Information */}
            <section
              id="account-section-profile"
              className="scroll-mt-28 bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-gutter-sm pb-gutter-sm border-b border-light-outline-variant/50">
                <div>
                  <h2 className="font-headline text-title-lg text-light-on-surface">
                    Personal Information
                  </h2>
                  <p className="font-body text-body-sm text-light-on-surface-variant">
                    Manage your profile details, contact info, and password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordModalOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low font-label text-label-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    lock_reset
                  </span>
                  <span>Change Password</span>
                </button>
              </div>

              {passwordModalOpen && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="p-gutter-md rounded-md bg-light-surface-container-low border border-light-outline-variant/80 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label text-label-lg text-light-on-surface">
                      Update Account Password
                    </span>
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(false)}
                      className="text-light-on-surface-variant hover:text-light-on-surface font-label text-label-sm cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {passwordError && (
                    <div role="alert" className="text-body-sm text-light-error font-medium">
                      {passwordError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface-variant">
                        Current password
                      </span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface-variant">
                        New password
                      </span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface-variant">
                        Confirm new password
                      </span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-gutter-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-md">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-label-md text-light-on-surface">Full name</span>
                    <input
                      ref={fullNameInputRef}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-11 px-3.5 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-label-md text-light-on-surface">
                      Email address
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 px-3.5 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-label-md text-light-on-surface">
                      Mobile number
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 22189"
                      className="h-11 px-3.5 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md tabular-nums focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="font-label text-label-md text-light-on-surface">
                      Date of birth
                    </span>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-11 px-3.5 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md tabular-nums focus:border-light-primary focus:ring-2 focus:ring-light-primary/20 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-label text-label-md text-light-on-surface">Gender</span>
                  <div className="flex flex-wrap items-center gap-4">
                    {(['Male', 'Female', 'Prefer not to say'] as const).map((option) => (
                      <label
                        key={option}
                        className="inline-flex items-center gap-2 font-body text-body-md text-light-on-surface cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="account-gender"
                          value={option}
                          checked={gender === option}
                          onChange={() => setGender(option)}
                          className="accent-light-primary w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </section>

            {/* 2. My Orders */}
            <section
              id="account-section-orders"
              className="scroll-mt-28 bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
                <div>
                  <h2 className="font-headline text-title-lg text-light-on-surface">My Orders</h2>
                  <p className="font-body text-body-sm text-light-on-surface-variant">
                    Track active shipments, view past purchases, or manage returns.
                  </p>
                </div>
                {orders.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllOrders((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-light-outline-variant text-light-primary hover:bg-light-surface-container-low font-label text-label-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      receipt_long
                    </span>
                    <span>{showAllOrders ? 'Recent Orders' : `All Orders (${orders.length})`}</span>
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="p-gutter-lg rounded-md bg-light-surface-container-low border border-light-outline-variant/60 text-center flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[32px] text-light-outline" aria-hidden="true">
                    package_2
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="font-title text-title-md text-light-on-surface">
                      No orders placed yet
                    </span>
                    <span className="font-body text-body-sm text-light-on-surface-variant">
                      Orders you place with Cash on Delivery or UPI will appear here for live tracking.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md cursor-pointer"
                  >
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedOrders.map((order) => {
                    const primaryItem = order.items[0];
                    const isDelivered = order.status.toLowerCase().includes('delivered');
                    const isCancelled = order.status.toLowerCase().includes('cancelled');
                    const isReturnRequested = order.status.toLowerCase().includes('return');
                    const isTrackingExpanded = expandedTrackOrderId === order.orderId;
                    const resolvedPayInfo = order.paymentInfo || order.shipping.paymentDetails;
                    const paymentLabel = resolvedPayInfo
                      ? `${resolvedPayInfo.methodLabel}${resolvedPayInfo.maskedDetail ? ` (${resolvedPayInfo.maskedDetail})` : ''}`
                      : order.shipping.paymentMethod === 'cod'
                        ? 'Cash on Delivery'
                        : order.shipping.paymentMethod === 'upi_on_delivery'
                          ? 'UPI on Delivery'
                          : 'Paid Online';

                    return (
                      <article
                        key={order.orderId}
                        className="p-gutter-md rounded-md border border-light-outline-variant/70 bg-light-surface-container-lowest flex flex-col gap-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-light-outline-variant/40">
                          <div className="flex flex-wrap items-center gap-2 text-body-sm">
                            <span className="font-mono text-mono-md text-light-primary font-semibold">
                              {order.orderId}
                            </span>
                            <span aria-hidden="true" className="text-light-outline">
                              ·
                            </span>
                            <span className="text-light-on-surface-variant">
                              Ordered on{' '}
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-sm font-label text-label-sm ${
                              isCancelled
                                ? 'bg-light-error-container text-light-on-error-container'
                                : isDelivered
                                  ? 'bg-success-container text-on-success-container'
                                  : isReturnRequested
                                    ? 'bg-warning-container text-on-warning-container'
                                    : 'bg-accent-yellow text-on-accent-yellow'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-gutter-md">
                          <div className="flex items-center gap-3 min-w-0">
                            {primaryItem && (
                              <div className="w-14 h-14 rounded bg-light-surface-container-low border border-light-outline-variant/50 overflow-hidden shrink-0">
                                <ProductImage
                                  src={primaryItem.imageUrl}
                                  alt={primaryItem.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-title text-title-md text-light-on-surface truncate">
                                {primaryItem ? primaryItem.name : `Order #${order.orderId}`}
                                {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                              </span>
                              <span className="font-body text-body-sm text-light-on-surface-variant">
                                {primaryItem?.selectedColor ? `${primaryItem.selectedColor} · ` : ''}
                                {primaryItem?.selectedSize ? `Size ${primaryItem.selectedSize} · ` : ''}
                                Qty: {order.items.reduce((s, i) => s + i.quantity, 0)} · {paymentLabel}
                              </span>
                              <span className="font-headline text-title-md text-light-on-surface tabular-nums mt-0.5">
                                ₹{order.total.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTrackOrderId(isTrackingExpanded ? null : order.orderId)
                              }
                              className="px-3.5 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {isTrackingExpanded ? 'Hide Tracking' : 'Track Order'}
                            </button>
                            {!isDelivered && !isCancelled && !isReturnRequested && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.orderId}
                                onClick={() => handleOrderAction(order.orderId, 'cancel')}
                                className="px-3.5 py-2 rounded border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low font-label text-label-md transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                            )}
                            {isDelivered && !isReturnRequested && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.orderId}
                                onClick={() => handleOrderAction(order.orderId, 'return')}
                                className="px-3.5 py-2 rounded border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low font-label text-label-md transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              >
                                Return
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onContactSupport(order.orderId)}
                              className="px-3 py-2 rounded border border-light-outline-variant text-light-primary hover:bg-light-surface-container-low font-label text-label-md transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Help
                            </button>
                          </div>
                        </div>

                        {isTrackingExpanded && (
                          <div className="mt-1 p-3 rounded bg-light-surface-container-low border border-light-outline-variant/60 flex flex-col gap-2 text-body-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-label text-label-md text-light-on-surface">
                                Delivery to {order.shipping.fullName} · {order.shipping.city} ({order.shipping.pincode})
                              </span>
                              <span className="font-mono text-label-sm text-light-primary">
                                {order.shipping.phone}
                              </span>
                            </div>
                            <p className="text-light-on-surface-variant">{order.shipping.address}</p>
                            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-label text-label-sm">
                              <div className="p-2 rounded bg-light-surface-container-lowest border border-light-outline-variant/50 text-success">
                                Order Confirmed
                              </div>
                              <div
                                className={`p-2 rounded bg-light-surface-container-lowest border border-light-outline-variant/50 ${
                                  isCancelled ? 'text-light-error' : 'text-light-primary'
                                }`}
                              >
                                {isCancelled ? 'Cancelled' : 'Packed & Dispatching'}
                              </div>
                              <div
                                className={`p-2 rounded bg-light-surface-container-lowest border border-light-outline-variant/50 ${
                                  isDelivered ? 'text-success' : 'text-light-on-surface-variant'
                                }`}
                              >
                                {isDelivered ? 'Delivered' : 'Doorstep Delivery'}
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Saved Addresses */}
            <section
              id="account-section-addresses"
              className="scroll-mt-28 bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
                <div>
                  <h2 className="font-headline text-title-lg text-light-on-surface">
                    Saved Addresses
                  </h2>
                  <p className="font-body text-body-sm text-light-on-surface-variant">
                    Manage delivery addresses for faster checkout across India.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddAddressForm}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded bg-accent-yellow text-on-accent-yellow hover:bg-light-secondary-container font-label text-label-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    add
                  </span>
                  <span>Add Address</span>
                </button>
              </div>

              {addressFormOpen && (
                <form
                  onSubmit={handleSaveAddressForm}
                  className="p-gutter-md rounded-md bg-light-surface-container-low border border-light-outline-variant/80 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label text-label-lg text-light-on-surface">
                      {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      className="font-label text-label-sm text-light-on-surface-variant hover:text-light-on-surface cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface">
                        Recipient full name
                      </span>
                      <input
                        type="text"
                        value={addrFullName}
                        onChange={(e) => setAddrFullName(e.target.value)}
                        required
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface">
                        Phone number
                      </span>
                      <input
                        type="tel"
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        placeholder="+91 98450 22189"
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md tabular-nums focus:border-light-primary focus:outline-none"
                      />
                    </label>

                    <label className="sm:col-span-2 flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface">
                        Flat / House No., Building, Street, Locality
                      </span>
                      <input
                        type="text"
                        value={addrLine}
                        onChange={(e) => setAddrLine(e.target.value)}
                        placeholder="Flat 402, Palm Grove Residency, 100ft Road, Indiranagar"
                        required
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="font-label text-label-sm text-light-on-surface">City</span>
                      <input
                        type="text"
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        required
                        className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-label text-label-sm text-light-on-surface">State</span>
                        <select
                          value={addrState}
                          onChange={(e) => setAddrState(e.target.value)}
                          className="h-10 px-2.5 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md focus:border-light-primary focus:outline-none"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-label text-label-sm text-light-on-surface">
                          Pin code
                        </span>
                        <input
                          type="text"
                          value={addrPincode}
                          onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="560001"
                          required
                          className="h-10 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-md tabular-nums focus:border-light-primary focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {(['Home', 'Office', 'Other'] as const).map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setAddrLabel(lbl)}
                          className={`px-3 py-1 rounded-sm font-label text-label-sm border cursor-pointer ${
                            addrLabel === lbl
                              ? 'bg-light-primary text-light-on-primary border-light-primary'
                              : 'bg-light-surface-container-lowest text-light-on-surface border-light-outline-variant'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                      <label className="inline-flex items-center gap-1.5 font-body text-body-sm text-light-on-surface cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addrIsDefault}
                          onChange={(e) => setAddrIsDefault(e.target.checked)}
                          className="accent-light-primary w-4 h-4"
                        />
                        <span>Set as default</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingAddresses}
                      className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {savingAddresses ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </form>
              )}

              {addresses.length === 0 ? (
                <div className="p-gutter-md rounded-md bg-light-surface-container-low border border-light-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-title text-title-md text-light-on-surface">
                      No saved addresses yet
                    </span>
                    <span className="font-body text-body-sm text-light-on-surface-variant">
                      Current delivery pin code: {user.location.city} — {user.location.pincode}. Add a full street address for one-click Cash on Delivery checkout.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openAddAddressForm}
                    className="px-3.5 py-2 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-primary hover:bg-light-surface-container font-label text-label-md shrink-0 cursor-pointer"
                  >
                    + Add Delivery Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-md">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-gutter-md rounded-md border border-light-outline-variant/70 bg-light-surface-container-lowest flex flex-col justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-title text-title-md text-light-on-surface truncate">
                            {addr.fullName}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {addr.isDefault ? (
                              <span className="px-2 py-0.5 rounded-sm bg-light-primary text-light-on-primary font-label text-label-sm">
                                Default
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-sm bg-light-surface-container text-light-on-surface-variant font-label text-label-sm">
                                {addr.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="font-body text-body-sm text-light-on-surface-variant leading-relaxed">
                          {addr.addressLine}
                          <br />
                          {addr.city}, {addr.state} — {addr.pincode}
                        </p>
                        {addr.phone && (
                          <span className="font-body text-body-sm text-light-on-surface tabular-nums">
                            Phone: {addr.phone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-light-outline-variant/40 font-label text-label-sm">
                        <button
                          type="button"
                          onClick={() => openEditAddressForm(addr)}
                          className="text-light-primary hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-light-error hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="ml-auto text-light-on-surface-variant hover:text-light-primary cursor-pointer"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. Wishlist */}
            <section
              id="account-section-wishlist"
              className="scroll-mt-28 bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-title-lg text-light-on-surface">Wishlist</h2>
                <span className="font-body text-body-sm text-light-on-surface-variant tabular-nums">
                  {wishlistProducts.length} Saved {wishlistProducts.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="p-gutter-md rounded-md bg-light-surface-container-low border border-light-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="font-body text-body-md text-light-on-surface-variant">
                    Your wishlist is empty. Tap the heart icon on any product to save it for later.
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="px-4 py-2 rounded bg-accent-yellow text-on-accent-yellow hover:bg-light-secondary-container font-label text-label-md shrink-0 cursor-pointer"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-gutter-md">
                  {wishlistProducts.map((product) => (
                    <div
                      key={product.id}
                      className="rounded-md border border-light-outline-variant/70 bg-light-surface-container-lowest p-3 flex flex-col justify-between gap-3"
                    >
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="w-full aspect-[4/3] rounded bg-light-surface-container-low overflow-hidden cursor-pointer"
                        >
                          <ProductImage
                            src={product.imageUrl}
                            alt={product.imageAlt || product.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="font-title text-title-md text-light-on-surface text-left line-clamp-1 hover:text-light-primary cursor-pointer"
                        >
                          {product.name}
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-headline text-title-md text-light-on-surface tabular-nums">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleWishlist(product.id)}
                            aria-label={`Remove ${product.name} from wishlist`}
                            className="text-body-sm text-light-on-surface-variant hover:text-light-error cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onAddToCart(product);
                          onToggleWishlist(product.id);
                        }}
                        className="w-full py-2 rounded bg-accent-yellow text-on-accent-yellow hover:bg-light-secondary-container font-label text-label-md transition-colors cursor-pointer"
                      >
                        Move to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Payment Preferences & Account Settings */}
            <section
              id="account-section-payments"
              className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-2 gap-gutter-lg"
            >
              {/* Payment Preferences */}
              <div className="bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col justify-between gap-gutter-md shadow-xs">
                <div className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-lg text-light-on-surface">
                    Payment Preferences
                  </h2>

                  <label
                    className={`p-3 rounded-md border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                      paymentPrefs.preferredMethod === 'cod'
                        ? 'border-light-primary bg-light-surface-container-low'
                        : 'border-light-outline-variant/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="material-symbols-outlined text-[20px] text-light-primary mt-0.5"
                        aria-hidden="true"
                      >
                        payments
                      </span>
                      <div className="flex flex-col">
                        <span className="font-title text-title-md text-light-on-surface">
                          Cash on Delivery (COD)
                        </span>
                        <span className="font-body text-body-sm text-light-on-surface-variant">
                          Preferred default payment method
                        </span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="preferred-payment"
                      checked={paymentPrefs.preferredMethod === 'cod'}
                      onChange={() =>
                        setPaymentPrefs((prev) => ({ ...prev, preferredMethod: 'cod' }))
                      }
                      className="accent-light-primary w-4 h-4 mt-1"
                    />
                  </label>

                  <div
                    className={`p-3 rounded-md border flex flex-col gap-2 transition-colors ${
                      paymentPrefs.preferredMethod === 'upi'
                        ? 'border-light-primary bg-light-surface-container-low'
                        : 'border-light-outline-variant/70'
                    }`}
                  >
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="material-symbols-outlined text-[20px] text-light-primary mt-0.5"
                          aria-hidden="true"
                        >
                          qr_code_2
                        </span>
                        <div className="flex flex-col">
                          <span className="font-title text-title-md text-light-on-surface">
                            UPI {paymentPrefs.upiId ? `(${paymentPrefs.upiId})` : 'on Delivery'}
                          </span>
                          <span className="font-body text-body-sm text-light-on-surface-variant">
                            Instant one-tap verification
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="preferred-payment"
                        checked={paymentPrefs.preferredMethod === 'upi'}
                        onChange={() =>
                          setPaymentPrefs((prev) => ({ ...prev, preferredMethod: 'upi' }))
                        }
                        className="accent-light-primary w-4 h-4 mt-1"
                      />
                    </label>
                    {paymentPrefs.preferredMethod === 'upi' && (
                      <input
                        type="text"
                        value={paymentPrefs.upiId || ''}
                        onChange={(e) =>
                          setPaymentPrefs((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        placeholder="Enter UPI ID (e.g. arjun@okaxis)"
                        className="h-9 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-sm focus:border-light-primary focus:outline-none"
                      />
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-md border flex flex-col gap-2 transition-colors ${
                      paymentPrefs.preferredMethod === 'card'
                        ? 'border-light-primary bg-light-surface-container-low'
                        : 'border-light-outline-variant/70'
                    }`}
                  >
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <span
                          className="material-symbols-outlined text-[20px] text-light-primary mt-0.5"
                          aria-hidden="true"
                        >
                          credit_card
                        </span>
                        <div className="flex flex-col">
                          <span className="font-title text-title-md text-light-on-surface">
                            {paymentPrefs.cardLabel || 'Saved Debit / Credit Card'}
                          </span>
                          <span className="font-body text-body-sm text-light-on-surface-variant">
                            {paymentPrefs.cardExpiry
                              ? `Expires ${paymentPrefs.cardExpiry}`
                              : 'Add masked card label for checkout reference'}
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="preferred-payment"
                        checked={paymentPrefs.preferredMethod === 'card'}
                        onChange={() =>
                          setPaymentPrefs((prev) => ({ ...prev, preferredMethod: 'card' }))
                        }
                        className="accent-light-primary w-4 h-4 mt-1"
                      />
                    </label>
                    {paymentPrefs.preferredMethod === 'card' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={paymentPrefs.cardLabel || ''}
                          onChange={(e) =>
                            setPaymentPrefs((prev) => ({ ...prev, cardLabel: e.target.value }))
                          }
                          placeholder="HDFC Debit Card — 4821"
                          className="h-9 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-sm focus:border-light-primary focus:outline-none"
                        />
                        <input
                          type="text"
                          value={paymentPrefs.cardExpiry || ''}
                          onChange={(e) =>
                            setPaymentPrefs((prev) => ({ ...prev, cardExpiry: e.target.value }))
                          }
                          placeholder="08/28"
                          className="h-9 px-3 rounded border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-body text-body-sm tabular-nums focus:border-light-primary focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingPreferences}
                    onClick={() =>
                      persistPreferences(paymentPrefs, accountSettings, 'Payment preferences saved')
                    }
                    className="px-4 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {savingPreferences ? 'Saving...' : 'Save Payment Preference'}
                  </button>
                </div>
              </div>

              {/* Account Settings */}
              <div className="bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col justify-between gap-gutter-md shadow-xs">
                <div className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-lg text-light-on-surface">
                    Account Settings
                  </h2>

                  {(
                    [
                      {
                        key: 'smsAlerts',
                        label: 'Order & delivery SMS alerts',
                      },
                      {
                        key: 'priceDropEmails',
                        label: 'Email updates on price drops',
                      },
                      {
                        key: 'twoStepAuth',
                        label: 'Two-step login verification',
                      },
                    ] as const
                  ).map((row) => {
                    const enabled = accountSettings[row.key];
                    return (
                      <div
                        key={row.key}
                        className="flex items-center justify-between gap-3 py-2 border-b border-light-outline-variant/40 last:border-b-0"
                      >
                        <span className="font-body text-body-md text-light-on-surface">
                          {row.label}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          aria-label={row.label}
                          onClick={() => {
                            const next = { ...accountSettings, [row.key]: !enabled };
                            setAccountSettings(next);
                            void persistPreferences(paymentPrefs, next, 'Account settings updated');
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                            enabled ? 'bg-light-primary' : 'bg-light-outline-variant'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                              enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-md bg-light-surface-container-low border border-light-outline-variant/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="material-symbols-outlined text-[20px] text-light-primary shrink-0"
                      aria-hidden="true"
                    >
                      support_agent
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title text-title-md text-light-on-surface">
                        Help &amp; Support
                      </span>
                      <span className="font-body text-body-sm text-light-on-surface-variant truncate">
                        Human support replies within 6 hours
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('customer-care')}
                    className="px-3.5 py-2 rounded bg-light-primary text-light-on-primary hover:bg-light-primary-container font-label text-label-md shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    Get Help
                  </button>
                </div>
              </div>
            </section>

            {/* 6. Recently Viewed Products */}
            <section className="bg-light-surface-container-lowest rounded-md border border-light-outline-variant/70 p-gutter-md sm:p-gutter-lg flex flex-col gap-gutter-md shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-title-lg text-light-on-surface">
                  Recently Viewed Products
                </h2>
                <span className="font-body text-body-sm text-light-on-surface-variant">
                  {recentlyViewedIds.length > 0 ? 'Based on your browsing' : 'Popular picks'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter-md">
                {recentlyViewedProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="group rounded-md border border-light-outline-variant/70 bg-light-surface-container-lowest p-2.5 flex flex-col gap-2 text-left hover:border-light-primary transition-colors cursor-pointer"
                  >
                    <div className="w-full aspect-[4/3] rounded bg-light-surface-container-low overflow-hidden">
                      <ProductImage
                        src={product.imageUrl}
                        alt={product.imageAlt || product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <span className="font-title text-body-md text-light-on-surface line-clamp-1">
                      {product.name}
                    </span>
                    <span className="font-headline text-title-md text-light-on-surface tabular-nums">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
