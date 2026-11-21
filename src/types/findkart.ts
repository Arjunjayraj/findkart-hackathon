export type StoreView =
  | 'home'
  | 'fashion'
  | 'beauty'
  | 'electronics'
  | 'sports'
  | 'home-kitchen'
  | 'books'
  | 'toys'
  | 'accessories'
  | 'customer-care'
  | 'search'
  | 'auth'
  | 'account';

export interface Product {
  id: string;
  name: string;
  brand: string;
  storeSection: 'home' | 'fashion' | 'beauty' | 'electronics' | 'sports' | 'home-kitchen' | 'books' | 'toys' | 'accessories';
  homeSections?: ('trending' | 'deals' | 'recommended' | 'new')[];
  category: string;
  subCategory?: string;
  gender?: 'Men' | 'Women' | 'Kids' | 'Unisex';
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  imageAlt: string;
  sizes?: string[];
  colors?: string[];
  skinType?: ('All' | 'Oily' | 'Dry')[];
  hairType?: ('Dry' | 'All')[];
  concern?: ('Hydration' | 'Sun' | 'Hairfall')[];
  popularity: number;
  newest: number;
  stock?: number;
  description: string;
  highlights: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface DeliveryLocation {
  city: string;
  pincode: string;
}

export interface OrderShipping {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  paymentMethod: 'cod' | 'upi_on_delivery';
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  orderId: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalSavings: number;
  total: number;
  shipping: OrderShipping;
}

export interface SavedAddress {
  id: string;
  fullName: string;
  label: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface PaymentPreferences {
  preferredMethod: 'cod' | 'upi' | 'card';
  upiId?: string;
  cardLabel?: string;
  cardExpiry?: string;
}

export interface AccountSettings {
  smsAlerts: boolean;
  priceDropEmails: boolean;
  twoStepAuth: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Prefer not to say';
  location: DeliveryLocation;
  addresses?: SavedAddress[];
  paymentPreferences?: PaymentPreferences;
  accountSettings?: AccountSettings;
  recentlyViewed?: string[];
}

export type SupportTicketCategory =
  | 'Product'
  | 'Delivery & Shipping'
  | 'Returns & Refunds'
  | 'Payment & Billing'
  | 'Warranty & Damage'
  | 'Account & Order';

export type SupportTicketStatus = 'Under Review' | 'Responded' | 'Resolved';

export interface SupportTicketReply {
  id: string;
  senderRole: 'customer' | 'specialist';
  senderName: string;
  senderTitle?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  ticketId: string;
  userId?: string;
  customerName: string;
  email: string;
  orderId: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  attachmentName?: string;
  attachmentType?: string;
  status: SupportTicketStatus;
  createdAt: string;
  slaDueAt: string;
  assignedSpecialist: string;
  replies: SupportTicketReply[];
}

export interface CourierShipment {
  orderId: string;
  label: string;
  courierName: string;
  trackingNumber: string;
  status: 'In Transit' | 'Out for Delivery' | 'Preparing Dispatch' | 'Delivered';
  hubLocation: string;
  estimatedDelivery: string;
  supportUrl: string;
  supportPhone: string;
  supportEmail: string;
  checkpoints: { time: string; location: string; detail: string }[];
}

export interface StockNotification {
  id: string;
  productId: string;
  productName: string;
  email: string;
  createdAt: string;
  status: 'Subscribed' | 'Notified';
}

export interface ChatProductMatch {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  imageUrl: string;
  imageAlt: string;
  stock: number;
}

