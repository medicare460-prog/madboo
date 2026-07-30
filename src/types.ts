import React from "react";

export interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ProductImage {
  type: "upload" | "url";
  url: string;
  isPrimary: boolean;
  name?: string;
  size?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  images: ProductImage[];
  category: "General" | "Trending" | "Hot Deals";
  subCategory: "Electronics" | "Fashion" | "Accessories" | "Home" | "Beauty" | "Sports" | "Books" | "Groceries";
  rating: number;
  reviewsCount: number;
  reviewsList: Review[];
  stock: number;
  delivery: string;
  warranty: string;
  seller: string;
  specifications: Record<string, string>;
}

export const FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%230f172a'/><g transform='translate(0, 15)'><path d='M170 110 H230 V170 H170 Z' fill='none' stroke='%23334155' stroke-width='4' stroke-linejoin='round'/><path d='M170 150 L195 130 L210 145 L220 135 L230 145' fill='none' stroke='%23334155' stroke-width='4' stroke-linejoin='round'/><circle cx='185' cy='125' r='4' fill='%23334155'/><text x='200' y='210' fill='%2364748b' font-family='sans-serif' font-size='13' font-weight='600' text-anchor='middle'>No Image Available</text></g></svg>";

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, productName?: string) {
  const img = e.currentTarget;
  console.warn(`[IMAGE_DEBUG] Failed to load image for product "${productName || 'Unknown'}". URL: ${img.src}`);
  img.src = FALLBACK_IMAGE;
}

export function getProductImageUrl(img: string | ProductImage | undefined): string {
  if (!img) return FALLBACK_IMAGE;
  if (typeof img === "string") return img;
  return img.url;
}

export function getProductMainImage(product: Product | undefined | null): string {
  if (!product || !product.images || product.images.length === 0) {
    return FALLBACK_IMAGE;
  }
  const primary = product.images.find(img => typeof img !== "string" && img.isPrimary);
  if (primary && typeof primary !== "string") return primary.url;
  
  const first = product.images[0];
  return typeof first === "string" ? first : first.url;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  coinBalance: number;
  cashbackBalance: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartItemDetailed extends CartItem {
  product: Product;
}

export interface ScratchCard {
  id: string;
  orderId: string;
  userId: string;
  rewardType: "cashback" | "coins" | "coupon" | "free_shipping" | "mystery_gift" | "better_luck";
  rewardValue: string | number;
  rewardTitle: string;
  status: "pending" | "claimed" | "expired";
  purchaseDate: string;
  scratchedAt?: string;
  expiryDate: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: "Pending" | "Confirmed" | "Paid" | "COD Pending" | "Processing" | "Packed" | "Shipped" | "Out For Delivery" | "Delivered" | "Cancelled" | "Refunded" | "Returned";
  paymentMethod: "UPI" | "Cards" | "Net Banking" | "Wallet" | "Cash on Delivery" | "Razorpay" | "Stripe" | string;
  paymentStatus: "Pending" | "Authorized" | "Captured" | "Paid" | "Success" | "Failed" | "Cancelled" | "Refunded" | "Pending (Cash on Delivery)" | string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
  scratchCardId?: string;
  mrp?: number;
  promoDiscount?: number;
  couponDiscount?: number;
  coinDiscount?: number;
  walletDiscount?: number;
  gst?: number;
  coinsRedeemed?: number;
  paymentId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "cashback" | "coins";
  amount: number;
  action: "credit" | "debit" | "withdraw";
  description: string;
  date: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  minPurchase: number;
  description: string;
  expiryDate: string;
  status: "active" | "used" | "expired";
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
}

export interface WinnerHistory {
  id: string;
  name: string;
  rewardTitle: string;
  timestamp: string;
}

export interface AdminSettings {
  cashbackProb: number;
  coinProb: number;
  couponProb: number;
  betterLuckProb: number;
  mysteryGiftProb: number;
  freeShipProb: number;
  maxDailyRewards: number;
  rewardExpiryDays: number;
  minPurchaseAmount: number;
  oneCardPerOrder: boolean;
  enabledRewards: boolean;
  liveWinnerBarEnabled?: boolean;
  winnerScrollSpeed?: number;
  maxWinnersToKeep?: number;
  autoRemoveOldWinners?: boolean;
}

export interface WinnerNotification {
  id: string;
  userName: string;
  city: string;
  rewardType: string;
  rewardValue: string | number;
  createdAt: string;
  hidden?: boolean;
  pinned?: boolean;
}
