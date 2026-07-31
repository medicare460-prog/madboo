import fs from "fs";
import path from "path";

// Types definition
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  passwordHash: string; // Plain password check for simplicity and robustness in this app
  coinBalance: number;
  cashbackBalance: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface ScratchCard {
  id: string;
  orderId: string;
  userId: string;
  rewardType: "cashback" | "coins" | "coupon" | "free_shipping" | "mystery_gift" | "better_luck";
  rewardValue: string | number; // e.g. 100 for cashback/coins, "FREESHIP" or "SCRATCH30" for coupons
  rewardTitle: string; // e.g. "₹100 Cashback", "500 Coins", "Flat 30% Coupon"
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
  status: "Pending" | "Packed" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
  paymentMethod: "UPI" | "Cards" | "Net Banking" | "Wallet" | "Cash on Delivery" | "Razorpay" | "Stripe" | string;
  paymentStatus: "Pending" | "Success" | "Failed" | string;
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
  cashbackProb: number; // 0-100
  coinProb: number;     // 0-100
  couponProb: number;   // 0-100
  betterLuckProb: number; // 0-100
  mysteryGiftProb: number; // 0-100
  freeShipProb: number;  // 0-100
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

export interface DatabaseSchema {
  users: User[];
  products: Product[];
  orders: Order[];
  scratchCards: ScratchCard[];
  transactions: Transaction[];
  coupons: Coupon[];
  notifications: Notification[];
  winnerHistory: WinnerHistory[];
  winnerNotifications: WinnerNotification[];
  adminSettings: AdminSettings;
}

const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to save DB
function saveDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Helper to load DB and seed if empty
export function loadDB(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(data) as DatabaseSchema;
      let migratedSchema = false;
      
      // Ensure products is an array
      if (!parsed.products || !Array.isArray(parsed.products)) {
        parsed.products = [];
        migratedSchema = true;
      } else {
        // Normalize products images if they exist as strings or use old fields
        parsed.products = parsed.products.map(p => {
          let imgs: any[] = [];
          
          // 1. Collect all images from various possible fields
          if (p.images && Array.isArray(p.images)) {
            imgs = [...p.images];
          } else if ((p as any).images && typeof (p as any).images === "string") {
            imgs = [(p as any).images];
          }
          
          if ((p as any).image) {
            imgs.push((p as any).image);
          }
          if ((p as any).imageUrl) {
            imgs.push((p as any).imageUrl);
          }
          if ((p as any).thumbnail) {
            imgs.push((p as any).thumbnail);
          }
          if ((p as any).gallery && Array.isArray((p as any).gallery)) {
            imgs.push(...(p as any).gallery);
          }
          
          // Deduplicate and map to standard ProductImage format
          const uniqueUrls = new Set<string>();
          const normalized: ProductImage[] = [];
          
          imgs.forEach((img: any) => {
            if (!img) return;
            if (typeof img === "string") {
              if (!uniqueUrls.has(img)) {
                uniqueUrls.add(img);
                normalized.push({
                  type: "url" as const,
                  url: img,
                  isPrimary: normalized.length === 0,
                  name: `Image ${normalized.length + 1}`
                });
                migratedSchema = true;
              }
            } else if (img && typeof img === "object" && img.url) {
              if (!uniqueUrls.has(img.url)) {
                uniqueUrls.add(img.url);
                normalized.push({
                  type: img.type || "url",
                  url: img.url,
                  isPrimary: img.isPrimary !== undefined ? img.isPrimary : (normalized.length === 0),
                  name: img.name || `Image ${normalized.length + 1}`,
                  size: img.size
                });
              }
            }
          });

          if (normalized.length === 0) {
            normalized.push({
              type: "url",
              url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
              isPrimary: true,
              name: p.name || "Product Image"
            });
            migratedSchema = true;
          }

          if (!p.category) p.category = "General";
          if (!p.subCategory) p.subCategory = "Electronics";
          if (p.stock === undefined || p.stock === null) p.stock = 15;
          if (p.rating === undefined || p.rating === null) p.rating = 4.5;
          if (p.reviewsCount === undefined || p.reviewsCount === null) p.reviewsCount = 0;
          if (!p.reviewsList) p.reviewsList = [];
          
          p.images = normalized;
          return p;
        });
      }

      if (!parsed.winnerNotifications) {
        parsed.winnerNotifications = [
          { id: "wn_1", userName: "Rahul K.", city: "Hyderabad", rewardType: "cashback", rewardValue: 100, createdAt: new Date(Date.now() - 3 * 60000).toISOString() },
          { id: "wn_2", userName: "Priya M.", city: "Chennai", rewardType: "coins", rewardValue: 500, createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
          { id: "wn_3", userName: "Vikram R.", city: "Bengaluru", rewardType: "coupon", rewardValue: "20%", createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
          { id: "wn_4", userName: "Akash P.", city: "Delhi", rewardType: "cashback", rewardValue: 500, createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
          { id: "wn_5", userName: "Sneha A.", city: "Pune", rewardType: "coins", rewardValue: 1000, createdAt: new Date(Date.now() - 55 * 60000).toISOString() }
        ];
        migratedSchema = true;
      }
      if (parsed.adminSettings && parsed.adminSettings.liveWinnerBarEnabled === undefined) {
        parsed.adminSettings.liveWinnerBarEnabled = true;
        parsed.adminSettings.winnerScrollSpeed = 25;
        parsed.adminSettings.maxWinnersToKeep = 50;
        parsed.adminSettings.autoRemoveOldWinners = true;
        migratedSchema = true;
      }
      if (migratedSchema) {
        saveDB(parsed);
      }
      return parsed;

    } catch (e) {
      console.error("Error reading database file, rebuilding...", e);
    }
  }

  // Create initial DB
  const defaultDB = createDefaultDB();
  saveDB(defaultDB);
  return defaultDB;
}

function createDefaultDB(): DatabaseSchema {
  return {
    users: [
      {
        id: "usr_admin",
        email: "admin@scratchrewards.com",
        name: "Admin User",
        role: "admin",
        passwordHash: "admin123",
        coinBalance: 500,
        cashbackBalance: 100.0,
        createdAt: new Date().toISOString()
      },
      {
        id: "usr_customer",
        email: "customer@scratchrewards.com",
        name: "John Doe",
        role: "customer",
        passwordHash: "customer123",
        coinBalance: 250,
        cashbackBalance: 25.5,
        createdAt: new Date().toISOString()
      }
    ],
    products: [
      {
        id: "prod_1",
        name: "Chronos Neon Edition Smartwatch",
        description: "The ultimate lifestyle wrist accessory featuring a stunning 1.95-inch AMOLED curved display, real-time blood-oxygen monitoring, advanced stress analysis, and built-in premium speaker for Bluetooth calls.",
        price: 2999,
        originalPrice: 5999,
        images: [
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=600&auto=format&fit=crop",
            isPrimary: true,
            name: "Chronos Neon Smartwatch"
          },
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
            isPrimary: false,
            name: "Smartwatch Side View"
          }
        ],
        category: "Hot Deals",
        subCategory: "Electronics",
        rating: 4.8,
        reviewsCount: 124,
        stock: 45,
        delivery: "Free Delivery by Sunday",
        warranty: "1 Year Domestic Warranty",
        seller: "Chronos India Tech",
        specifications: {
          Display: "1.95\" AMOLED Curved Screen",
          "Battery Life": "Up to 10 Days",
          Waterproof: "IP68 Certified",
          Sensors: "Heart Rate, SpO2, Sleep, Pedometer"
        },
        reviewsList: [
          { user: "Rahul S.", rating: 5, comment: "Absolutely marvelous battery life! Highly recommended.", date: "2026-06-15" },
          { user: "Sneha P.", rating: 4.5, comment: "Screen looks super high-end, touch response is amazing.", date: "2026-07-02" }
        ]
      },
      {
        id: "prod_2",
        name: "Vortex Spatial Audio Headphones",
        description: "Immerse yourself completely with state-of-the-art hybrid Active Noise Cancellation (up to 42dB) and full 360-degree spatial audio tracking. Crafted with memory-foam ear cushions for professional, long-duration listening sessions.",
        price: 4599,
        originalPrice: 8999,
        images: [
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
            isPrimary: true,
            name: "Vortex Headphones"
          }
        ],
        category: "Trending",
        subCategory: "Electronics",
        rating: 4.9,
        reviewsCount: 88,
        stock: 30,
        delivery: "Free Delivery tomorrow",
        warranty: "2 Years Replacement Warranty",
        seller: "Vortex Sound Labs",
        specifications: {
          "Noise Cancelling": "Hybrid ANC (42dB)",
          Playtime: "Up to 50 Hours",
          Driver: "40mm Dynamic Driver",
          Bluetooth: "Version 5.3"
        },
        reviewsList: [
          { user: "Aman V.", rating: 5, comment: "Best ANC headphones in this price category! Pure studio-grade sound.", date: "2026-07-10" }
        ]
      },
      {
        id: "prod_3",
        name: "Noir Minimalist Leather Wallet",
        description: "Handcrafted from full-grain vegetable-tanned genuine leather. Features 6 card slots, a quick-access cash sleeve, and built-in advanced RFID block security keeping your sensitive digital cards safe.",
        price: 999,
        originalPrice: 1999,
        images: [
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop",
            isPrimary: true,
            name: "Noir Wallet"
          }
        ],
        category: "General",
        subCategory: "Accessories",
        rating: 4.5,
        reviewsCount: 230,
        stock: 120,
        delivery: "Delivery in 3 days",
        warranty: "6 Months Stitching Warranty",
        seller: "Noir Craftwear",
        specifications: {
          Material: "100% Full-Grain Vegetable-Tanned Leather",
          "Card Slots": "6 Slots + 1 ID Window",
          Security: "RFID Blocking Technology",
          Dimensions: "11cm x 8cm x 1.5cm"
        },
        reviewsList: []
      },
      {
        id: "prod_4",
        name: "Aero-Knit Prime Running Shoes",
        description: "Ultra-breathable weave pattern combined with an engineered responsive air-cushion sole. Designed to absorb vertical shock and deliver maximum energy return for high-performance marathons or casual jogs.",
        price: 2499,
        originalPrice: 4999,
        images: [
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
            isPrimary: true,
            name: "Aero Running Shoes"
          }
        ],
        category: "Trending",
        subCategory: "Sports",
        rating: 4.6,
        reviewsCount: 154,
        stock: 18,
        delivery: "Free Delivery tomorrow",
        warranty: "3 Months Warranty against Manufacturing Defects",
        seller: "Aero Sports Ltd",
        specifications: {
          "Upper Material": "Fly-Knit Polyester Mesh",
          Sole: "Reactive Polymer Cushion Sole",
          Weight: "240g (Single Shoe)",
          "Ankle Fit": "Sock-Like Elastic Knit"
        },
        reviewsList: []
      },
      {
        id: "prod_5",
        name: "Glow Radiance Vitamin C Serum",
        description: "Infused with 15% pure ethyl ascorbic acid, vitamin E, and natural hyaluronic acid. Revitalizes dull skin tone, stimulates collagen synthesis, and diminishes blemishes for a luminous, hydrated complexion.",
        price: 699,
        originalPrice: 1299,
        images: [
          {
            type: "url",
            url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop",
            isPrimary: true,
            name: "Vitamin C Serum"
          }
        ],
        category: "Hot Deals",
        subCategory: "Beauty",
        rating: 4.4,
        reviewsCount: 310,
        stock: 75,
        delivery: "Delivery in 2 days",
        warranty: "100% Cruelty Free & Dermatologically Tested",
        seller: "Glow Aesthetics",
        specifications: {
          Volume: "30ml e",
          "Skin Type": "Suitable for All Skin Types",
          Fragrance: "Fragrance-Free Formulation",
          "Key Ingredients": "15% Vitamin C, Hyaluronic Acid, Vitamin E"
        },
        reviewsList: []
      }
    ],
    orders: [],
    scratchCards: [
      {
        id: "card_welcome",
        orderId: "ord_welcome",
        userId: "usr_customer",
        rewardType: "coins",
        rewardValue: 250,
        rewardTitle: "250 Welcome Coins",
        status: "pending",
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    transactions: [
      {
        id: "tx_1",
        userId: "usr_customer",
        type: "coins",
        amount: 250,
        action: "credit",
        description: "Welcome Reward bonus",
        date: new Date().toISOString()
      }
    ],
    coupons: [
      {
        code: "WELCOME10",
        discountPercent: 10,
        minPurchase: 500,
        description: "10% off for new registrations. Min purchase ₹500.",
        expiryDate: "2027-12-31T23:59:59.000Z",
        status: "active"
      },
      {
        code: "FESTIVE25",
        discountPercent: 25,
        minPurchase: 2000,
        description: "Get flat 25% off during our reward festival! Min purchase ₹2000.",
        expiryDate: "2027-12-31T23:59:59.000Z",
        status: "active"
      },
      {
        code: "SUPER50",
        discountPercent: 50,
        minPurchase: 4000,
        description: "Max savings! Get flat 50% off. Min purchase ₹4000.",
        expiryDate: "2027-12-31T23:59:59.000Z",
        status: "active"
      }
    ],
    notifications: [
      {
        id: "notif_1",
        userId: "usr_customer",
        title: "Welcome to Scratch Rewards! 🎉",
        message: "You have received a FREE Welcome Scratch Card in your cabinet. Go Scratch it to unlock your first reward!",
        date: new Date().toISOString(),
        isRead: false
      }
    ],
    winnerHistory: [
      { id: "win_1", name: "Rahul S.", rewardTitle: "₹100 Cashback", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
      { id: "win_2", name: "Sneha P.", rewardTitle: "200 Coins", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
      { id: "win_3", name: "Anita K.", rewardTitle: "Flat 20% Coupon", timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString() },
      { id: "win_4", name: "Vikram R.", rewardTitle: "500 Coins", timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString() },
      { id: "win_5", name: "Pooja M.", rewardTitle: "₹500 Cashback", timestamp: new Date(Date.now() - 72 * 60 * 1000).toISOString() }
    ],
    winnerNotifications: [
      { id: "wn_1", userName: "Rahul K.", city: "Hyderabad", rewardType: "cashback", rewardValue: 100, createdAt: new Date(Date.now() - 3 * 60000).toISOString() },
      { id: "wn_2", userName: "Priya M.", city: "Chennai", rewardType: "coins", rewardValue: 500, createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
      { id: "wn_3", userName: "Vikram R.", city: "Bengaluru", rewardType: "coupon", rewardValue: "20%", createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
      { id: "wn_4", userName: "Akash P.", city: "Delhi", rewardType: "cashback", rewardValue: 500, createdAt: new Date(Date.now() - 40 * 60000).toISOString() },
      { id: "wn_5", userName: "Sneha A.", city: "Pune", rewardType: "coins", rewardValue: 1000, createdAt: new Date(Date.now() - 55 * 60000).toISOString() }
    ],
    adminSettings: {
      cashbackProb: 35,
      coinProb: 35,
      couponProb: 15,
      betterLuckProb: 5,
      mysteryGiftProb: 5,
      freeShipProb: 5,
      maxDailyRewards: 10,
      rewardExpiryDays: 30,
      minPurchaseAmount: 100,
      oneCardPerOrder: true,
      enabledRewards: true,
      liveWinnerBarEnabled: true,
      winnerScrollSpeed: 25,
      maxWinnersToKeep: 50,
      autoRemoveOldWinners: true
    }
  };
}

// Global active operations
export function updateDB(updater: (db: DatabaseSchema) => void) {
  const db = loadDB();
  updater(db);
  saveDB(db);
}
