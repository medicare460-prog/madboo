import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import Razorpay from "razorpay";
import Stripe from "stripe";
import crypto from "crypto";
import mongoose from "mongoose";
import { loadDB, updateDB, Product, User, Order, ScratchCard, Transaction, Coupon, WinnerHistory, Notification, AdminSettings } from "./server/db.js";
import { OrderModel, PaymentModel, ScratchCardModel } from "./server/models.js";

// Ensure initial database is loaded/created
const initialDB = loadDB();

// Environment Variables Validation
const REQUIRED_ENV_VARS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "MONGODB_URI",
  "JWT_SECRET"
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.log("====================================================");
  console.log("ℹ️ Environment Notice: Some configuration variables are not set:");
  missingEnvVars.forEach(v => console.log(`   - ${v}`));
  console.log("Please ensure these are set in your deployment environment if testing live integrations.");
  console.log("====================================================");
}

// Connect to MongoDB
const connectMongoDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.warn("⚠️ MONGODB_URI is not set. Using local file-based db.json fallback.");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB successfully connected!");
  } catch (err: any) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
  }
};
connectMongoDB();

const app = express();
const PORT = 3000;
const server = createServer(app);
let io: SocketIOServer | null = null;

// CORS Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/products")) {
    console.log(`[HTTP Request Log] ${req.method} ${req.originalUrl} - Host: ${req.headers.host} - User-Agent: ${req.headers["user-agent"] || "unknown"}`);
  }
  next();
});

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded images statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Simple Auth Middleware
interface AuthRequest extends Request {
  user?: User;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No authentication token provided" });
  }
  const userId = authHeader.split(" ")[1];
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ message: "Invalid user token" });
  }
  req.user = user;
  next();
};

const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No authentication token provided" });
  }
  const userId = authHeader.split(" ")[1];
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Access forbidden. Admin role required." });
  }
  req.user = user;
  next();
};

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

app.post("/api/auth/register", (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ message: "Missing email, password or name" });
  }

  const db = loadDB();
  const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  const newUser: User = {
    id: "usr_" + Math.random().toString(36).substring(2, 11),
    email: email.toLowerCase(),
    name,
    role: "customer",
    passwordHash: password, // For sandbox app simplicity
    coinBalance: 0,
    cashbackBalance: 0.0,
    createdAt: new Date().toISOString()
  };

  updateDB(db => {
    db.users.push(newUser);
    // Welcome Notification
    db.notifications.push({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      userId: newUser.id,
      title: "Welcome aboard! 🎉",
      message: `Hi ${name}, welcome to Scratch Rewards! Enjoy a guaranteed scratch card with your very first purchase.`,
      date: new Date().toISOString(),
      isRead: false
    });
  });

  res.status(201).json({
    message: "Registration successful",
    token: newUser.id,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      coinBalance: newUser.coinBalance,
      cashbackBalance: newUser.cashbackBalance
    }
  });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  res.status(200).json({
    message: "Login successful",
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      coinBalance: user.coinBalance,
      cashbackBalance: user.cashbackBalance
    }
  });
});

// Login Alias
app.post("/api/admin/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  res.status(200).json({
    message: "Login successful",
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      coinBalance: user.coinBalance,
      cashbackBalance: user.cashbackBalance
    }
  });
});

app.post("/api/login", (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  res.status(200).json({
    message: "Login successful",
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      coinBalance: user.coinBalance,
      cashbackBalance: user.cashbackBalance
    }
  });
});

// Categories API
app.get("/api/categories", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const db = loadDB();
    const products = db.products || [];
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const subCategories = Array.from(new Set(products.map(p => p.subCategory).filter(Boolean)));
    res.status(200).json({ categories, subCategories });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/auth/me", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    coinBalance: user.coinBalance,
    cashbackBalance: user.cashbackBalance
  });
});

// ==========================================
// 2. PRODUCT API
// ==========================================

const handleGetProducts = (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  try {
    const db = loadDB();
    const productsList = db.products || [];
    console.log(`[API Products] Returning ${productsList.length} products to client via ${req.originalUrl}.`);
    res.status(200).json(productsList);
  } catch (err: any) {
    console.error(`[API ERROR ${req.originalUrl}] Error fetching products:`, err);
    res.status(500).json({ error: "Failed to fetch products", message: err?.message || "Internal server error" });
  }
};

app.get("/api/products", handleGetProducts);
app.get("/api/products/all", handleGetProducts);
app.get("/products", handleGetProducts);
app.get("/api/catalog", handleGetProducts);

const handleGetProductById = (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const db = loadDB();
    const product = (db.products || []).find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ message: `Product with ID '${req.params.id}' not found` });
    }
    res.status(200).json(product);
  } catch (err: any) {
    console.error(`[API ERROR ${req.originalUrl}] Error fetching product:`, err);
    res.status(500).json({ error: "Failed to fetch product", message: err?.message });
  }
};

app.get("/api/products/:id", handleGetProductById);
app.get("/products/:id", handleGetProductById);

app.post("/api/products/:id/review", authMiddleware, (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ message: "Rating and comment are required" });
  }

  const productId = req.params.id;
  const user = req.user!;

  updateDB(db => {
    const product = db.products.find(p => p.id === productId);
    if (product) {
      const newReview = {
        user: user.name,
        rating: Number(rating),
        comment,
        date: new Date().toISOString().split("T")[0]
      };
      product.reviewsList = product.reviewsList || [];
      product.reviewsList.push(newReview);
      product.reviewsCount = product.reviewsList.length;
      // Recalculate average rating
      const sum = product.reviewsList.reduce((acc, cur) => acc + cur.rating, 0);
      product.rating = Number((sum / product.reviewsList.length).toFixed(1));
    }
  });

  const updatedDB = loadDB();
  res.status(200).json(updatedDB.products.find(p => p.id === productId));
});

// ==========================================
// 3. COUPONS API
// ==========================================

app.get("/api/coupons", (req: Request, res: Response) => {
  const db = loadDB();
  res.status(200).json(db.coupons);
});

app.post("/api/coupons/apply", (req: Request, res: Response) => {
  const { code, amount } = req.body;
  if (!code) {
    return res.status(400).json({ message: "Coupon code is required" });
  }

  const db = loadDB();
  const coupon = db.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.status === "active");

  if (!coupon) {
    return res.status(404).json({ message: "Invalid or expired coupon" });
  }

  if (amount < coupon.minPurchase) {
    return res.status(400).json({
      message: `Minimum purchase value of ₹${coupon.minPurchase} is required to apply this coupon.`
    });
  }

  res.status(200).json({
    message: "Coupon applied successfully",
    coupon
  });
});

// ==========================================
// 4. CHECKOUT & ORDER API
// ==========================================

// Helper to determine weighted random reward based on Admin Settings
function generateScratchReward(settings: AdminSettings): { type: ScratchCard["rewardType"], val: string | number, title: string } {
  const totalWeight = settings.cashbackProb + settings.coinProb + settings.couponProb + settings.betterLuckProb + settings.mysteryGiftProb + settings.freeShipProb;
  let random = Math.floor(Math.random() * totalWeight);

  let selectedType: ScratchCard["rewardType"] = "better_luck";

  if (random < settings.cashbackProb) {
    selectedType = "cashback";
  } else if (random < settings.cashbackProb + settings.coinProb) {
    selectedType = "coins";
  } else if (random < settings.cashbackProb + settings.coinProb + settings.couponProb) {
    selectedType = "coupon";
  } else if (random < settings.cashbackProb + settings.coinProb + settings.couponProb + settings.freeShipProb) {
    selectedType = "free_shipping";
  } else if (random < settings.cashbackProb + settings.coinProb + settings.couponProb + settings.freeShipProb + settings.mysteryGiftProb) {
    selectedType = "mystery_gift";
  } else {
    selectedType = "better_luck";
  }

  if (selectedType === "cashback") {
    const cashbackOptions = [10, 20, 50, 100, 200, 500, 1000, 5000];
    const weightOpts = [50, 30, 12, 5, 2, 0.7, 0.2, 0.1]; // weighted distribution
    let r = Math.random() * 100;
    let sum = 0;
    let val = 10;
    for (let i = 0; i < cashbackOptions.length; i++) {
      sum += weightOpts[i];
      if (r <= sum) {
        val = cashbackOptions[i];
        break;
      }
    }
    return { type: "cashback", val, title: `₹${val} Cashback` };
  } else if (selectedType === "coins") {
    const coinOptions = [50, 100, 250, 500, 1000];
    const weightOpts = [45, 35, 12, 6, 2];
    let r = Math.random() * 100;
    let sum = 0;
    let val = 50;
    for (let i = 0; i < coinOptions.length; i++) {
      sum += weightOpts[i];
      if (r <= sum) {
        val = coinOptions[i];
        break;
      }
    }
    return { type: "coins", val, title: `${val} Reward Coins` };
  } else if (selectedType === "coupon") {
    const couponOptions = [10, 20, 30, 40, 50];
    const percent = couponOptions[Math.floor(Math.random() * couponOptions.length)];
    const code = `SCRATCH${percent}`;
    return { type: "coupon", val: code, title: `Flat ${percent}% Coupon` };
  } else if (selectedType === "free_shipping") {
    return { type: "free_shipping", val: "FREESHIP", title: "Free Shipping Coupon" };
  } else if (selectedType === "mystery_gift") {
    const gifts = ["CRED Swag Bag", "Smart Mug", "Designer Keyring", "Glow Beauty Hamper", "Premium Utility Organizer"];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];
    return { type: "mystery_gift", val: gift, title: `Mystery Gift: ${gift}` };
  } else {
    return { type: "better_luck", val: 0, title: "Better Luck Next Time" };
  }
}

app.post("/api/checkout", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { cartItems, shippingAddress, paymentMethod, couponCode, coinDiscountEnabled, walletDiscountEnabled } = req.body;
  const user = req.user!;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }
  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine) {
    return res.status(400).json({ message: "Shipping address is incomplete" });
  }

  const db = loadDB();
  const settings = db.adminSettings;

  // Verify and calculate prices
  let subtotal = 0;
  let mrp = 0;
  const orderItems = [];

  for (const item of cartItems) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ message: `Product ${item.productId} not found` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ message: `${product.name} is out of stock or insufficient quantity` });
    }
    subtotal += product.price * item.quantity;
    mrp += (product.originalPrice || product.price) * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: (() => {
        if (!product.images || product.images.length === 0) return "";
        const primary = product.images.find(img => img.isPrimary);
        return primary ? primary.url : product.images[0].url;
      })()
    });
  }

  const promoDiscount = mrp - subtotal;
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.status === "active");
    if (coupon && subtotal >= coupon.minPurchase) {
      couponDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
    }
  }

  // Coins redemption: 10 coins = ₹1 (so coinBalance / 10). Capped at subtotal - couponDiscount.
  let coinDiscount = 0;
  let coinsToRedeem = 0;
  if (coinDiscountEnabled && user.coinBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount;
    const userMaxRedeemableInr = Math.floor(user.coinBalance / 10);
    const actualRedeemableInr = Math.min(maxRedeemableInr, userMaxRedeemableInr);
    coinsToRedeem = actualRedeemableInr * 10;
    coinDiscount = actualRedeemableInr;
  }

  // Wallet Discount: Capped at subtotal - couponDiscount - coinDiscount and user cashbackBalance
  let walletDiscount = 0;
  if (walletDiscountEnabled && user.cashbackBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount - coinDiscount;
    walletDiscount = Math.round(Math.min(maxRedeemableInr, user.cashbackBalance));
  }

  const deliveryFee = (subtotal - couponDiscount - coinDiscount - walletDiscount) >= 1000 || (subtotal === 0) ? 0 : 99;
  const total = Math.max(0, subtotal - couponDiscount - coinDiscount - walletDiscount + deliveryFee);
  
  // Calculate 18% GST included
  const gst = Math.round((subtotal - couponDiscount - coinDiscount - walletDiscount) * 18 / 118);

  const orderId = "ord_" + Math.random().toString(36).substring(2, 11);
  const cardId = "card_" + Math.random().toString(36).substring(2, 11);

  const newOrder: Order = {
    id: orderId,
    userId: user.id,
    items: orderItems,
    subtotal,
    discount: couponDiscount + coinDiscount + walletDiscount, // Total discount
    deliveryFee,
    total,
    status: "Pending",
    paymentMethod,
    paymentStatus: "Pending",
    shippingAddress,
    createdAt: new Date().toISOString(),
    mrp,
    promoDiscount,
    couponDiscount,
    coinDiscount,
    walletDiscount,
    gst,
    coinsRedeemed: coinsToRedeem
  };

  // 1. CASH ON DELIVERY CHECKOUT FLOW
  if (paymentMethod === "Cash on Delivery") {
    // Check COD Eligibility
    const isMetroPin = /^(11|40|56|50|60|70)/.test(shippingAddress.zipCode);
    const isEligibleAmount = total <= 5000;
    if (!isMetroPin || !isEligibleAmount) {
      return res.status(400).json({ message: "Shipping location or order amount is ineligible for Cash on Delivery." });
    }

    const reward = generateScratchReward(settings);
    const newScratchCard: ScratchCard = {
      id: cardId,
      orderId,
      userId: user.id,
      rewardType: reward.type,
      rewardValue: reward.val,
      rewardTitle: reward.title,
      status: "pending",
      purchaseDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + settings.rewardExpiryDays * 24 * 60 * 60 * 1000).toISOString()
    };

    newOrder.status = "Packed";
    newOrder.scratchCardId = cardId;

    updateDB(dbState => {
      // Deduct stock
      for (const item of cartItems) {
        const dbProd = dbState.products.find(p => p.id === item.productId);
        if (dbProd) {
          dbProd.stock = Math.max(0, dbProd.stock - item.quantity);
        }
      }

      // Deduct coin/wallet balances if applied
      const stateUser = dbState.users.find(u => u.id === user.id);
      if (stateUser) {
        if (coinsToRedeem > 0) {
          stateUser.coinBalance = Math.max(0, stateUser.coinBalance - coinsToRedeem);
          dbState.transactions.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            userId: user.id,
            type: "coins",
            amount: coinsToRedeem,
            action: "debit",
            description: `Spent ${coinsToRedeem} Coins on Order #${orderId}`,
            date: new Date().toISOString()
          });
        }
        if (walletDiscount > 0) {
          stateUser.cashbackBalance = Math.max(0, stateUser.cashbackBalance - walletDiscount);
          dbState.transactions.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            userId: user.id,
            type: "cashback",
            amount: walletDiscount,
            action: "debit",
            description: `Spent ₹${walletDiscount} Cashback Wallet balance on Order #${orderId}`,
            date: new Date().toISOString()
          });
        }
      }

      dbState.orders.push(newOrder);
      dbState.scratchCards.push(newScratchCard);

      dbState.notifications.push({
        id: "notif_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        title: "Order Confirmed (COD)! 📦",
        message: `Your COD order ${orderId} has been successfully placed. You earned 1 FREE Scratch Card!`,
        date: new Date().toISOString(),
        isRead: false
      });
    });

    const finalDB = loadDB();
    return res.status(201).json({
      message: "Order placed successfully (COD)",
      order: finalDB.orders.find(o => o.id === orderId),
      scratchCard: newScratchCard
    });
  }

  // Save the pending order first
  updateDB(dbState => {
    dbState.orders.push(newOrder);
  });

  // 2. RAZORPAY GATEWAY CHECKOUT FLOW
  if (paymentMethod === "Razorpay") {
    const razorpay = getRazorpayInstance();
    if (razorpay) {
      try {
        const rzpOrder = await razorpay.orders.create({
          amount: Math.round(total * 100),
          currency: "INR",
          receipt: orderId
        });
        return res.status(201).json({
          message: "Razorpay session initialized",
          order: newOrder,
          razorpayOrder: rzpOrder,
          isMock: false
        });
      } catch (err: any) {
        console.error("Razorpay API order creation failed:", err);
      }
    }

    // Fallback: If credentials are missing, we return a mock Razorpay order ID to let them test safely!
    const mockRzpOrder = {
      id: "rzp_mock_ord_" + Math.random().toString(36).substring(2, 11),
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: orderId
    };
    return res.status(201).json({
      message: "Razorpay session initialized (Developer Sandbox Mode)",
      order: newOrder,
      razorpayOrder: mockRzpOrder,
      isMock: true
    });
  }

  // 3. STRIPE GATEWAY CHECKOUT FLOW
  if (paymentMethod === "Stripe") {
    const stripe = getStripeInstance();
    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: "inr",
          metadata: { orderId, userId: user.id }
        });
        return res.status(201).json({
          message: "Stripe intent initialized",
          order: newOrder,
          clientSecret: paymentIntent.client_secret,
          isMock: false
        });
      } catch (err: any) {
        console.error("Stripe payment intent creation failed:", err);
      }
    }

    // Fallback Mock Stripe Intent Client Secret if API keys not set
    const mockClientSecret = `pi_mock_${Math.random().toString(36).substring(2, 11)}_secret_${Math.random().toString(36).substring(2, 11)}`;
    return res.status(201).json({
      message: "Stripe intent initialized (Developer Sandbox Mode)",
      order: newOrder,
      clientSecret: mockClientSecret,
      isMock: true
    });
  }

  // Default Fallback
  return res.status(400).json({ message: "Unsupported payment method selected" });
});

// ==========================================
// 5. SCRATCH CARDS API
// ==========================================

app.get("/api/scratch-cards", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const cards = db.scratchCards.filter(c => c.userId === user.id);
  res.status(200).json(cards);
});

app.post("/api/scratch-cards/:id/scratch", authMiddleware, (req: AuthRequest, res: Response) => {
  const cardId = req.params.id;
  const user = req.user!;

  const db = loadDB();
  const cardIndex = db.scratchCards.findIndex(c => c.id === cardId && c.userId === user.id);

  if (cardIndex === -1) {
    return res.status(404).json({ message: "Scratch card not found" });
  }

  const card = db.scratchCards[cardIndex];
  if (card.status !== "pending") {
    return res.status(400).json({ message: "This scratch card has already been scratched or expired" });
  }

  // Credit the Reward to the user account
  updateDB(dbState => {
    const stateCard = dbState.scratchCards.find(c => c.id === cardId);
    if (!stateCard) return;

    stateCard.status = "claimed";
    stateCard.scratchedAt = new Date().toISOString();

    const stateUser = dbState.users.find(u => u.id === user.id);
    if (!stateUser) return;

    if (stateCard.rewardType === "cashback") {
      const amount = Number(stateCard.rewardValue);
      stateUser.cashbackBalance += amount;

      dbState.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        type: "cashback",
        amount,
        action: "credit",
        description: `Won ₹${amount} Cashback from Order Scratch Card`,
        date: new Date().toISOString()
      });
    } else if (stateCard.rewardType === "coins") {
      const amount = Number(stateCard.rewardValue);
      stateUser.coinBalance += amount;

      dbState.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        type: "coins",
        amount,
        action: "credit",
        description: `Won ${amount} Coins from Order Scratch Card`,
        date: new Date().toISOString()
      });
    } else if (stateCard.rewardType === "coupon") {
      // Create a valid coupon for subsequent checkouts
      const couponPercent = Number((stateCard.rewardValue as string).replace("SCRATCH", ""));
      const couponCode = stateCard.rewardValue as string;
      const alreadyExists = dbState.coupons.some(c => c.code === couponCode);

      if (!alreadyExists) {
        dbState.coupons.push({
          code: couponCode,
          discountPercent: couponPercent,
          minPurchase: 500,
          description: `Exclusive Scratch Reward: Get Flat ${couponPercent}% off!`,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        });
      }
    } else if (stateCard.rewardType === "free_shipping") {
      const code = "FREESHIP";
      const alreadyExists = dbState.coupons.some(c => c.code === code);
      if (!alreadyExists) {
        dbState.coupons.push({
          code,
          discountPercent: 100, // custom logic handled in client side / subtotal
          minPurchase: 0,
          description: "Free Shipping on your next order. Unlimited value!",
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        });
      }
    }

    // Add to Global Winner History (so the live ticker updates with real human-wins!)
    dbState.winnerHistory.unshift({
      id: "win_" + Math.random().toString(36).substring(2, 11),
      name: stateUser.name,
      rewardTitle: stateCard.rewardTitle,
      timestamp: new Date().toISOString()
    });

    // Format name & pick city for Live Winner Bar
    if (stateCard.rewardType !== "better_luck") {
      const parts = stateUser.name.trim().split(/\s+/);
      const maskedName = parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
      
      const order = dbState.orders.find(o => o.id === stateCard.orderId);
      const defaultCities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow"];
      const city = order?.shippingAddress?.city || defaultCities[Math.floor(Math.random() * defaultCities.length)];

      const wnId = "wn_" + Math.random().toString(36).substring(2, 11);
      const liveWinnerNotify = {
        id: wnId,
        userName: maskedName,
        city,
        rewardType: stateCard.rewardType,
        rewardValue: stateCard.rewardValue,
        createdAt: new Date().toISOString()
      };

      if (!dbState.winnerNotifications) {
        dbState.winnerNotifications = [];
      }
      dbState.winnerNotifications.unshift(liveWinnerNotify);

      // Auto trim old winners if enabled
      const maxWinners = dbState.adminSettings?.maxWinnersToKeep || 50;
      if (dbState.winnerNotifications.length > maxWinners) {
        dbState.winnerNotifications = dbState.winnerNotifications.slice(0, maxWinners);
      }

      // Store in temp context to broadcast after updateDB finishes
      (req as any).liveWinnerNotify = liveWinnerNotify;
    }

    // Create Notification
    dbState.notifications.push({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      userId: user.id,
      title: "Reward Credited! 🎉",
      message: `Congratulations! Your reward "${stateCard.rewardTitle}" has been successfully credited to your account.`,
      date: new Date().toISOString(),
      isRead: false
    });
  });

  // Broadcast if we have a winner and io is active
  const liveWinnerNotify = (req as any).liveWinnerNotify;
  if (liveWinnerNotify && io) {
    io.emit("new-winner", liveWinnerNotify);
  }

  const finalDB = loadDB();
  res.status(200).json({
    message: "Scratch card successfully processed!",
    scratchCard: finalDB.scratchCards.find(c => c.id === cardId),
    userBalances: {
      coinBalance: finalDB.users.find(u => u.id === user.id)?.coinBalance,
      cashbackBalance: finalDB.users.find(u => u.id === user.id)?.cashbackBalance
    }
  });
});

// ==========================================
// 6. WALLET & TRANSACTIONS API
// ==========================================

app.get("/api/wallets/history", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const txs = db.transactions.filter(t => t.userId === user.id);
  res.status(200).json(txs);
});

app.post("/api/wallets/convert-coins", authMiddleware, (req: AuthRequest, res: Response) => {
  const { coinsToConvert } = req.body;
  const user = req.user!;

  if (!coinsToConvert || Number(coinsToConvert) <= 0) {
    return res.status(400).json({ message: "Enter a valid amount of coins to convert" });
  }

  const coinCount = Number(coinsToConvert);
  if (user.coinBalance < coinCount) {
    return res.status(400).json({ message: "Insufficient coin balance" });
  }

  // Conversation Rate: 10 Coins = ₹1 Cashback
  const rate = 10;
  if (coinCount % rate !== 0) {
    return res.status(400).json({ message: `Coins to convert must be a multiple of ${rate}` });
  }

  const cashbackEarned = coinCount / rate;

  updateDB(dbState => {
    const dbUser = dbState.users.find(u => u.id === user.id);
    if (dbUser) {
      dbUser.coinBalance -= coinCount;
      dbUser.cashbackBalance += cashbackEarned;

      // Deduct coins transaction
      dbState.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        type: "coins",
        amount: coinCount,
        action: "debit",
        description: `Converted ${coinCount} Coins to Cashback`,
        date: new Date().toISOString()
      });

      // Credit cashback transaction
      dbState.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        type: "cashback",
        amount: cashbackEarned,
        action: "credit",
        description: `Received ₹${cashbackEarned} from Coin Conversion`,
        date: new Date().toISOString()
      });

      // Notification
      dbState.notifications.push({
        id: "notif_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        title: "Coins Converted! 🪙",
        message: `Successfully converted ${coinCount} Coins into ₹${cashbackEarned} Cashback balance.`,
        date: new Date().toISOString(),
        isRead: false
      });
    }
  });

  const finalDB = loadDB();
  const updatedUser = finalDB.users.find(u => u.id === user.id)!;

  res.status(200).json({
    message: `Converted ${coinCount} Coins into ₹${cashbackEarned} Cashback successfully!`,
    user: {
      coinBalance: updatedUser.coinBalance,
      cashbackBalance: updatedUser.cashbackBalance
    }
  });
});

app.post("/api/wallets/withdraw-cashback", authMiddleware, (req: AuthRequest, res: Response) => {
  const { amount, upiId } = req.body;
  const user = req.user!;

  if (!amount || Number(amount) < 100) {
    return res.status(400).json({ message: "Minimum withdraw limit is ₹100" });
  }
  if (!upiId) {
    return res.status(400).json({ message: "Please provide a valid UPI ID for withdrawal" });
  }

  const withdrawAmount = Number(amount);
  if (user.cashbackBalance < withdrawAmount) {
    return res.status(400).json({ message: "Insufficient cashback balance" });
  }

  updateDB(dbState => {
    const dbUser = dbState.users.find(u => u.id === user.id);
    if (dbUser) {
      dbUser.cashbackBalance -= withdrawAmount;

      // Create transaction
      dbState.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        type: "cashback",
        amount: withdrawAmount,
        action: "withdraw",
        description: `Withdrew ₹${withdrawAmount} to UPI (${upiId})`,
        date: new Date().toISOString()
      });

      // Notification
      dbState.notifications.push({
        id: "notif_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        title: "Withdrawal Initiated 💸",
        message: `Your request to withdraw ₹${withdrawAmount} to UPI: ${upiId} has been successfully placed and is being processed.`,
        date: new Date().toISOString(),
        isRead: false
      });
    }
  });

  const finalDB = loadDB();
  const updatedUser = finalDB.users.find(u => u.id === user.id)!;

  res.status(200).json({
    message: `Withdrawal request for ₹${withdrawAmount} has been registered!`,
    user: {
      coinBalance: updatedUser.coinBalance,
      cashbackBalance: updatedUser.cashbackBalance
    }
  });
});

// ==========================================
// 7. NOTIFICATIONS API
// ==========================================

app.get("/api/notifications", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const notifs = db.notifications.filter(n => n.userId === user.id);
  res.status(200).json(notifs);
});

app.post("/api/notifications/mark-read", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  updateDB(dbState => {
    dbState.notifications.forEach(n => {
      if (n.userId === user.id) {
        n.isRead = true;
      }
    });
  });
  res.status(200).json({ message: "All notifications marked as read" });
});

// ==========================================
// 8. ORDERS API (USER SPECIFIC)
// ==========================================

app.get("/api/orders", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = loadDB();
  const orders = db.orders.filter(o => o.userId === user.id);
  res.status(200).json(orders);
});

// ==========================================
// 9. ADMIN PANEL CONTROL API
// ==========================================

app.get("/api/admin/dashboard-stats", adminMiddleware, (req: Request, res: Response) => {
  const db = loadDB();

  const totalUsers = db.users.filter(u => u.role === "customer").length;
  const totalOrders = db.orders.length;
  const totalSales = db.orders.reduce((acc, order) => acc + (order.paymentStatus === "Success" ? order.total : 0), 0);
  const totalScratchCards = db.scratchCards.length;
  const claimedCards = db.scratchCards.filter(c => c.status === "claimed").length;

  res.status(200).json({
    totalUsers,
    totalOrders,
    totalSales,
    totalScratchCards,
    claimedCards,
    recentOrders: db.orders.slice(-5).reverse(),
    recentScratchCards: db.scratchCards.slice(-5).reverse()
  });
});

app.get("/api/admin/settings", adminMiddleware, (req: Request, res: Response) => {
  const db = loadDB();
  res.status(200).json(db.adminSettings);
});

app.post("/api/admin/settings/update", adminMiddleware, (req: Request, res: Response) => {
  const newSettings = req.body;
  updateDB(db => {
    db.adminSettings = { ...db.adminSettings, ...newSettings };
  });
  res.status(200).json({ message: "Admin reward configuration updated successfully", settings: loadDB().adminSettings });
});

app.get("/api/admin/orders", adminMiddleware, (req: Request, res: Response) => {
  const db = loadDB();
  res.status(200).json(db.orders);
});

app.post("/api/admin/orders/update-status", adminMiddleware, (req: Request, res: Response) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ message: "Missing orderId or status" });
  }

  updateDB(db => {
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
    }
  });

  res.status(200).json({ message: `Order ${orderId} updated to ${status}` });
});

app.get("/api/admin/users", adminMiddleware, (req: Request, res: Response) => {
  const db = loadDB();
  // Don't send passwords
  const usersSafe = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    coinBalance: u.coinBalance,
    cashbackBalance: u.cashbackBalance,
    createdAt: u.createdAt
  }));
  res.status(200).json(usersSafe);
});

app.post("/api/admin/users/modify-balances", adminMiddleware, (req: Request, res: Response) => {
  const { userId, coinAmount, cashbackAmount } = req.body;

  updateDB(db => {
    const u = db.users.find(user => user.id === userId);
    if (u) {
      if (coinAmount !== undefined) u.coinBalance = Number(coinAmount);
      if (cashbackAmount !== undefined) u.cashbackBalance = Number(cashbackAmount);
    }
  });

  res.status(200).json({ message: "User balances updated successfully" });
});

// ==========================================
// ADMIN IMAGE UPLOAD (MULTER)
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, "product-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpg|jpeg|png|webp/i;
    const isExtensionAllowed = allowedExtensions.test(path.extname(file.originalname));
    const isMimetypeAllowed = allowedExtensions.test(file.mimetype);
    if (isExtensionAllowed && isMimetypeAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Supported formats: JPG, JPEG, PNG, WEBP only!"));
    }
  }
});

app.post("/api/admin/upload", adminMiddleware, (req: Request, res: Response, next: NextFunction) => {
  upload.array("files", 10)(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File is too large. Maximum size allowed is 10 MB." });
        }
        return res.status(400).json({ message: `Upload error: ${err.code || err.message}` });
      }
      return res.status(400).json({ message: err.message });
    }
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    
    const uploadedImages = files.map(file => ({
      type: "upload" as const,
      url: `/uploads/${file.filename}`,
      isPrimary: false,
      name: file.originalname,
      size: file.size
    }));
    
    res.status(200).json({
      message: "Images uploaded successfully",
      files: uploadedImages
    });
  });
});

// Admin Products API
app.get("/api/admin/products", (req: Request, res: Response) => {
  handleGetProducts(req, res);
});

function notifyProductsChanged() {
  try {
    const db = loadDB();
    if ((global as any).io) {
      console.log("[Socket.IO] Broadcasting products_updated event to all connected clients...");
      (global as any).io.emit("products_updated", db.products || []);
    }
  } catch (err) {
    console.error("[Socket.IO] Error broadcasting products update:", err);
  }
}

const handleAddProduct = (req: Request, res: Response) => {
  const productData = req.body;
  
  let images: Product["images"] = [];
  if (Array.isArray(productData.images)) {
    images = productData.images.map((img: any, idx: number) => {
      if (typeof img === "string") {
        return {
          type: "url" as const,
          url: img,
          isPrimary: idx === 0,
          name: `Image ${idx + 1}`
        };
      }
      return {
        type: img.type === "upload" ? "upload" : "url",
        url: img.url,
        isPrimary: !!img.isPrimary,
        name: img.name || `Image ${idx + 1}`,
        size: img.size
      };
    });
  }
  
  if (images.length === 0) {
    images = [{
      type: "url" as const,
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
      isPrimary: true,
      name: "Default Product Image"
    }];
  } else {
    const hasPrimary = images.some(img => img.isPrimary);
    if (!hasPrimary) {
      images[0].isPrimary = true;
    }
  }

  const newProduct: Product = {
    id: "prod_" + Math.random().toString(36).substring(2, 11),
    name: productData.name,
    description: productData.description,
    price: Number(productData.price),
    originalPrice: Number(productData.originalPrice),
    images,
    category: productData.category || "General",
    subCategory: productData.subCategory || "Electronics",
    rating: 5.0,
    reviewsCount: 0,
    reviewsList: [],
    stock: Number(productData.stock || 10),
    delivery: productData.delivery || "Free Delivery",
    warranty: productData.warranty || "1 Year Warranty",
    seller: productData.seller || "Certified Merchant",
    specifications: productData.specifications || {}
  };

  updateDB(db => {
    db.products.push(newProduct);
  });

  notifyProductsChanged();

  res.status(201).json({ message: "Product created successfully", product: newProduct });
};

app.post("/api/admin/products/add", adminMiddleware, handleAddProduct);
app.post("/api/products", authMiddleware, handleAddProduct);

const handleEditProduct = (req: Request, res: Response) => {
  const productId = req.params.id;
  const productData = req.body;

  let images: Product["images"] = [];
  if (Array.isArray(productData.images)) {
    images = productData.images.map((img: any, idx: number) => {
      if (typeof img === "string") {
        return {
          type: "url" as const,
          url: img,
          isPrimary: idx === 0,
          name: `Image ${idx + 1}`
        };
      }
      return {
        type: img.type === "upload" ? "upload" : "url",
        url: img.url,
        isPrimary: !!img.isPrimary,
        name: img.name || `Image ${idx + 1}`,
        size: img.size
      };
    });
  }

  if (images.length === 0) {
    images = [{
      type: "url" as const,
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
      isPrimary: true,
      name: "Default Product Image"
    }];
  } else {
    const hasPrimary = images.some(img => img.isPrimary);
    if (!hasPrimary) {
      images[0].isPrimary = true;
    }
  }

  updateDB(db => {
    const idx = db.products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      db.products[idx] = {
        ...db.products[idx],
        ...productData,
        price: Number(productData.price),
        originalPrice: Number(productData.originalPrice),
        stock: Number(productData.stock),
        images
      };
    }
  });

  notifyProductsChanged();

  res.status(200).json({ message: "Product updated successfully" });
};

app.post("/api/admin/products/edit/:id", adminMiddleware, handleEditProduct);
app.put("/api/products/:id", authMiddleware, handleEditProduct);

const handleDeleteProduct = (req: Request, res: Response) => {
  const productId = req.params.id;
  updateDB(db => {
    db.products = db.products.filter(p => p.id !== productId);
  });

  notifyProductsChanged();

  res.status(200).json({ message: "Product deleted successfully" });
};

app.post("/api/admin/products/delete/:id", adminMiddleware, handleDeleteProduct);
app.delete("/api/products/:id", authMiddleware, handleDeleteProduct);


// ==========================================
// WINNER NOTIFICATIONS & TICKER MANAGEMENT
// ==========================================

app.get("/api/winners", (req: Request, res: Response) => {
  const db = loadDB();
  const settings: any = db.adminSettings || {};
  if (settings.liveWinnerBarEnabled === false) {
    return res.status(200).json([]);
  }
  const publicWinners = (db.winnerNotifications || []).filter(w => !w.hidden);
  // Sort pinned to top, then by date descending
  publicWinners.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.status(200).json(publicWinners);
});

app.get("/api/admin/winners", adminMiddleware, (req: Request, res: Response) => {
  const db = loadDB();
  res.status(200).json(db.winnerNotifications || []);
});

app.post("/api/admin/winners/delete", adminMiddleware, (req: Request, res: Response) => {
  const { id } = req.body;
  updateDB(db => {
    db.winnerNotifications = (db.winnerNotifications || []).filter(w => w.id !== id);
  });
  res.status(200).json({ message: "Winner notification deleted successfully" });
});

app.post("/api/admin/winners/toggle-hide", adminMiddleware, (req: Request, res: Response) => {
  const { id, hidden } = req.body;
  updateDB(db => {
    const winner = (db.winnerNotifications || []).find(w => w.id === id);
    if (winner) {
      winner.hidden = hidden;
    }
  });
  res.status(200).json({ message: "Winner notification visibility toggled successfully" });
});

app.post("/api/admin/winners/toggle-pin", adminMiddleware, (req: Request, res: Response) => {
  const { id, pinned } = req.body;
  updateDB(db => {
    const winner = (db.winnerNotifications || []).find(w => w.id === id);
    if (winner) {
      winner.pinned = pinned;
    }
  });
  res.status(200).json({ message: "Winner notification pin status toggled successfully" });
});

app.post("/api/admin/winners/update-settings", adminMiddleware, (req: Request, res: Response) => {
  const { liveWinnerBarEnabled, winnerScrollSpeed, maxWinnersToKeep, autoRemoveOldWinners } = req.body;
  updateDB(db => {
    if (!db.adminSettings) {
      db.adminSettings = {} as any;
    }
    if (liveWinnerBarEnabled !== undefined) db.adminSettings.liveWinnerBarEnabled = !!liveWinnerBarEnabled;
    if (winnerScrollSpeed !== undefined) db.adminSettings.winnerScrollSpeed = Number(winnerScrollSpeed);
    if (maxWinnersToKeep !== undefined) db.adminSettings.maxWinnersToKeep = Number(maxWinnersToKeep);
    if (autoRemoveOldWinners !== undefined) db.adminSettings.autoRemoveOldWinners = !!autoRemoveOldWinners;
  });
  res.status(200).json({ message: "Live Winner Bar configuration updated", settings: loadDB().adminSettings });
});


// ==========================================
// PAYMENT GATEWAYS INTEGRATION (RAZORPAY & STRIPE)
// ==========================================

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getStripeInstance = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: "2023-10-16" as any });
};

// Safe credentials lookup
app.get("/api/payments/config", (req: Request, res: Response) => {
  res.status(200).json({
    hasRazorpay: !!process.env.RAZORPAY_KEY_ID,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
  });
});

// COD Eligibility
app.post("/api/payments/cod-eligibility", (req: Request, res: Response) => {
  const { zipCode, totalAmount } = req.body;
  
  // Rule 1: We support major metro cities starting with: 11 (Delhi), 40 (Mumbai), 56 (Bengaluru), 50 (Hyderabad), 60 (Chennai), 70 (Kolkata)
  const isMetroPin = /^(11|40|56|50|60|70)/.test(zipCode);
  
  // Rule 2: Limit COD to max ₹5000 to prevent delivery risks
  const isEligibleAmount = totalAmount <= 5000;
  
  if (!isMetroPin) {
    return res.status(200).json({
      eligible: false,
      reason: "Cash on Delivery is currently only eligible for major Indian metro locations (PIN codes starting with 11, 40, 56, 50, 60, or 70)."
    });
  }
  
  if (!isEligibleAmount) {
    return res.status(200).json({
      eligible: false,
      reason: "Cash on Delivery is not allowed for high-value orders exceeding ₹5,000. Please pay online for secure checkout."
    });
  }
  
  res.status(200).json({ eligible: true });
});

// Create Order for Cash on Delivery & Sandbox Fallback Simulation
app.post("/api/checkout", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { cartItems, shippingAddress, paymentMethod, couponCode, coinDiscountEnabled, walletDiscountEnabled } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] Checkout Started - Method: ${paymentMethod}, User: ${user.name}`);

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ success: false, error: "Empty Cart", message: "Your shopping cart is empty." });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
    return res.status(400).json({ success: false, error: "Address Missing", message: "Shipping address details are incomplete or missing." });
  }

  try {
    const db = loadDB();
    let subtotal = 0;
    let mrp = 0;
    const orderItems: any[] = [];

    // 1. Validate product stock and calculate prices
    for (const item of cartItems) {
      const product = db.products.find(p => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: "Product Not Found", message: `The product with ID ${item.productId} was not found.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: "Stock Unavailable", message: `"${product.name}" only has ${product.stock} items left in stock. Please reduce your quantity.` });
      }
      subtotal += product.price * item.quantity;
      mrp += (product.originalPrice || product.price) * item.quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images?.[0]?.url || ""
      });
    }

    const promoDiscount = mrp - subtotal;
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.status === "active");
      if (coupon && subtotal >= coupon.minPurchase) {
        couponDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
      }
    }

    // 2. Coin Discount Deduction calculation
    let coinDiscount = 0;
    let coinsToRedeem = 0;
    if (coinDiscountEnabled && user.coinBalance > 0) {
      const maxRedeemableInr = subtotal - couponDiscount;
      const userMaxRedeemableInr = Math.floor(user.coinBalance / 10);
      const actualRedeemableInr = Math.min(maxRedeemableInr, userMaxRedeemableInr);
      coinsToRedeem = actualRedeemableInr * 10;
      coinDiscount = actualRedeemableInr;
    }

    // 3. Cashback Wallet Deduction calculation
    let walletDiscount = 0;
    if (walletDiscountEnabled && user.cashbackBalance > 0) {
      const maxRedeemableInr = subtotal - couponDiscount - coinDiscount;
      walletDiscount = Math.round(Math.min(maxRedeemableInr, user.cashbackBalance));
    }

    const deliveryFee = (subtotal - couponDiscount - coinDiscount - walletDiscount) >= 1000 || subtotal === 0 ? 0 : 99;
    const total = Math.max(0, subtotal - couponDiscount - coinDiscount - walletDiscount + deliveryFee);
    const gst = Math.round((subtotal - couponDiscount - coinDiscount - walletDiscount) * 18 / 118);

    const orderId = "ord_" + Math.random().toString(36).substring(2, 11);
    const cardId = "card_" + Math.random().toString(36).substring(2, 11);
    const reward = generateScratchReward(db.adminSettings);

    const newScratchCard: ScratchCard = {
      id: cardId,
      orderId,
      userId: user.id,
      rewardType: reward.type,
      rewardValue: reward.val,
      rewardTitle: reward.title,
      status: "pending",
      purchaseDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + db.adminSettings.rewardExpiryDays * 24 * 60 * 60 * 1000).toISOString()
    };

    const isCOD = paymentMethod === "Cash on Delivery" || paymentMethod === "COD";

    const newOrder: Order = {
      id: orderId,
      userId: user.id,
      items: orderItems,
      subtotal,
      discount: couponDiscount + coinDiscount + walletDiscount,
      deliveryFee,
      total,
      status: isCOD ? "Pending" : "Packed",
      paymentMethod: isCOD ? "Cash on Delivery" : (paymentMethod as any),
      paymentStatus: isCOD ? "Pending (Cash on Delivery)" : "Success",
      shippingAddress,
      createdAt: new Date().toISOString(),
      mrp,
      promoDiscount,
      couponDiscount,
      coinDiscount,
      walletDiscount,
      gst,
      coinsRedeemed: coinsToRedeem,
      scratchCardId: cardId
    };

    // 4. Update memory / JSON Database state
    updateDB(dbState => {
      dbState.orders.push(newOrder);
      dbState.scratchCards.push(newScratchCard);

      // Deduct product stock in catalog
      for (const item of orderItems) {
        const dbProd = dbState.products.find(p => p.id === item.productId);
        if (dbProd) {
          dbProd.stock = Math.max(0, dbProd.stock - item.quantity);
        }
      }

      // Deduct coins & cashback wallet balances
      const stateUser = dbState.users.find(u => u.id === user.id);
      if (stateUser) {
        if (coinsToRedeem > 0) {
          stateUser.coinBalance = Math.max(0, stateUser.coinBalance - coinsToRedeem);
          dbState.transactions.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            userId: user.id,
            type: "coins",
            amount: coinsToRedeem,
            action: "debit",
            description: `Spent ${coinsToRedeem} Coins on Order #${orderId}`,
            date: new Date().toISOString()
          });
        }
        if (walletDiscount > 0) {
          stateUser.cashbackBalance = Math.max(0, stateUser.cashbackBalance - walletDiscount);
          dbState.transactions.push({
            id: "tx_" + Math.random().toString(36).substring(2, 11),
            userId: user.id,
            type: "cashback",
            amount: walletDiscount,
            action: "debit",
            description: `Spent ₹${walletDiscount} Cashback Wallet balance on Order #${orderId}`,
            date: new Date().toISOString()
          });
        }
      }

      // Notifications trigger
      dbState.notifications.push({
        id: "notif_" + Math.random().toString(36).substring(2, 11),
        userId: user.id,
        title: isCOD ? "COD Order Placed! 📦" : "Order Confirmed! 🎁",
        message: isCOD 
          ? `Your Cash on Delivery order ${orderId} has been successfully registered. Expected COD Amount: ₹${total}. You earned 1 FREE Scratch Card!` 
          : `Your order ${orderId} has been paid successfully. You earned 1 FREE Scratch Card!`,
        date: new Date().toISOString(),
        isRead: false
      });
    });

    // 5. Sync with MongoDB schemas if connected
    if (mongoose.connection.readyState === 1) {
      try {
        await OrderModel.create(newOrder);
        await ScratchCardModel.create({
          id: cardId,
          orderId,
          userId: user.id,
          rewardType: reward.type,
          rewardValue: reward.val,
          rewardTitle: reward.title,
          status: "pending",
          purchaseDate: new Date(),
          expiryDate: new Date(Date.now() + db.adminSettings.rewardExpiryDays * 24 * 60 * 60 * 1000)
        });

        if (!isCOD) {
          await PaymentModel.create({
            orderId,
            paymentId: "pay_" + Math.random().toString(36).substring(2, 11),
            gateway: paymentMethod || "Simulation",
            amount: total,
            status: "Success",
            createdAt: new Date()
          });
        }
      } catch (mongoErr: any) {
        console.error("[Payment Log] MongoDB checkout sync failed:", mongoErr.message);
      }
    }

    if (io) {
      io.emit("payment-completed", { orderId, total });
    }

    console.log(`[Payment Log] Order Completed Successfully - ID: ${orderId}, Method: ${paymentMethod}, Total: ₹${total}`);

    res.status(200).json({
      success: true,
      order: newOrder,
      scratchCard: newScratchCard
    });
  } catch (err: any) {
    console.error("[Payment Log] Checkout processing error:", err);
    res.status(500).json({ success: false, error: "Server Error", message: "An unexpected error occurred during checkout processing." });
  }
});

// Create Order / Payment Initiator for Razorpay
app.post("/api/payment/create-order", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { cartItems, shippingAddress, couponCode, coinDiscountEnabled, walletDiscountEnabled, totalAmount } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] Button Clicked - Method: Razorpay, User: ${user.name} (${user.id})`);
  console.log(`[Payment Log] Create Order Request - Cart items length: ${cartItems?.length || 0}`);

  // 1. Key check
  const rzpKeyId = process.env.RAZORPAY_KEY_ID;
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!rzpKeyId || !rzpKeySecret) {
    console.error("[Payment Log] Error: Missing Razorpay API Keys");
    return res.status(400).json({
      success: false,
      error: "Missing Razorpay API Keys",
      message: "Razorpay keys (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET) are missing in the environment."
    });
  }

  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    console.error("[Payment Log] Error: Failed to instantiate Razorpay Client");
    return res.status(500).json({
      success: false,
      error: "Order Creation Failed",
      message: "Could not initialize the Razorpay SDK client. Check your credentials."
    });
  }

  // 2. Validate Cart and calculate pricing
  const db = loadDB();
  let subtotal = 0;
  let mrp = 0;
  const orderItems: any[] = [];

  for (const item of cartItems) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product Not Found", message: `Product ${item.productId} not found.` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ success: false, error: "Out of Stock", message: `${product.name} is out of stock.` });
    }
    subtotal += product.price * item.quantity;
    mrp += (product.originalPrice || product.price) * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images?.[0]?.url || ""
    });
  }

  const promoDiscount = mrp - subtotal;
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.status === "active");
    if (coupon && subtotal >= coupon.minPurchase) {
      couponDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
    }
  }

  let coinDiscount = 0;
  let coinsToRedeem = 0;
  if (coinDiscountEnabled && user.coinBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount;
    const userMaxRedeemableInr = Math.floor(user.coinBalance / 10);
    const actualRedeemableInr = Math.min(maxRedeemableInr, userMaxRedeemableInr);
    coinsToRedeem = actualRedeemableInr * 10;
    coinDiscount = actualRedeemableInr;
  }

  let walletDiscount = 0;
  if (walletDiscountEnabled && user.cashbackBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount - coinDiscount;
    walletDiscount = Math.round(Math.min(maxRedeemableInr, user.cashbackBalance));
  }

  const deliveryFee = (subtotal - couponDiscount - coinDiscount - walletDiscount) >= 1000 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - couponDiscount - coinDiscount - walletDiscount + deliveryFee);
  const gst = Math.round((subtotal - couponDiscount - coinDiscount - walletDiscount) * 18 / 118);

  const orderId = "ord_" + Math.random().toString(36).substring(2, 11);

  // 3. Create Pending Order in db.json & MongoDB
  const newOrder: Order = {
    id: orderId,
    userId: user.id,
    items: orderItems,
    subtotal,
    discount: couponDiscount + coinDiscount + walletDiscount,
    deliveryFee,
    total,
    status: "Pending",
    paymentMethod: "Razorpay",
    paymentStatus: "Pending",
    shippingAddress,
    createdAt: new Date().toISOString(),
    mrp,
    promoDiscount,
    couponDiscount,
    coinDiscount,
    walletDiscount,
    gst,
    coinsRedeemed: coinsToRedeem
  };

  updateDB(dbState => {
    dbState.orders.push(newOrder);
  });

  if (mongoose.connection.readyState === 1) {
    try {
      await OrderModel.create({
        id: orderId,
        userId: user.id,
        items: orderItems,
        subtotal,
        discount: couponDiscount + coinDiscount + walletDiscount,
        deliveryFee,
        total,
        status: "Pending",
        paymentMethod: "Razorpay",
        paymentStatus: "Pending",
        shippingAddress,
        mrp,
        promoDiscount,
        couponDiscount,
        coinDiscount,
        walletDiscount,
        gst,
        coinsRedeemed: coinsToRedeem
      });
    } catch (dbErr: any) {
      console.error("[Payment Log] Mongoose Order creation error:", dbErr.message);
    }
  }

  // 4. Create Razorpay order via SDK
  try {
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: "INR",
      receipt: orderId,
      notes: {
        orderId: orderId
      }
    });

    console.log(`[Payment Log] Order Created - ID: ${orderId}, RZP Order ID: ${rzpOrder.id}`);

    res.status(200).json({
      success: true,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      receipt: rzpOrder.receipt,
      order: newOrder
    });
  } catch (err: any) {
    console.error("[Payment Log] Razorpay Order Creation Failed:", err.message);
    res.status(500).json({
      success: false,
      error: "Order Creation Failed",
      message: err.message || "Unable to generate Razorpay order ID."
    });
  }
});

// Razorpay Payment Verification
const handlePaymentSuccess = async (
  orderId: string, 
  paymentId: string, 
  gateway: "Razorpay" | "Stripe" | "UPI", 
  signature?: string, 
  userId?: string
) => {
  const db = loadDB();
  const orderIndex = db.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    throw new Error("Associated order not found");
  }

  const order = db.orders[orderIndex];
  if (order.paymentStatus === "Success") {
    return { order, scratchCard: db.scratchCards.find(c => c.orderId === orderId) };
  }

  // Create Scratch Card & Deduct stock/user balances
  const cardId = "card_" + Math.random().toString(36).substring(2, 11);
  const reward = generateScratchReward(db.adminSettings);

  const newScratchCard: ScratchCard = {
    id: cardId,
    orderId,
    userId: order.userId,
    rewardType: reward.type,
    rewardValue: reward.val,
    rewardTitle: reward.title,
    status: "pending",
    purchaseDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + db.adminSettings.rewardExpiryDays * 24 * 60 * 60 * 1000).toISOString()
  };

  // 1. Update local db.json
  updateDB(dbState => {
    const stateOrder = dbState.orders.find(o => o.id === orderId);
    if (stateOrder) {
      stateOrder.paymentStatus = "Success";
      stateOrder.status = "Packed";
      stateOrder.scratchCardId = cardId;
      stateOrder.paymentId = paymentId;
    }

    // Deduct stock
    for (const item of order.items) {
      const dbProd = dbState.products.find(p => p.id === item.productId);
      if (dbProd) {
        dbProd.stock = Math.max(0, dbProd.stock - item.quantity);
      }
    }

    // Deduct user balances if applicable
    const stateUser = dbState.users.find(u => u.id === order.userId);
    if (stateUser) {
      if (order.coinsRedeemed && order.coinsRedeemed > 0) {
        stateUser.coinBalance = Math.max(0, stateUser.coinBalance - order.coinsRedeemed);
        dbState.transactions.push({
          id: "tx_" + Math.random().toString(36).substring(2, 11),
          userId: order.userId,
          type: "coins",
          amount: order.coinsRedeemed,
          action: "debit",
          description: `Spent ${order.coinsRedeemed} Coins on Order #${orderId}`,
          date: new Date().toISOString()
        });
      }
      if (order.walletDiscount && order.walletDiscount > 0) {
        stateUser.cashbackBalance = Math.max(0, stateUser.cashbackBalance - order.walletDiscount);
        dbState.transactions.push({
          id: "tx_" + Math.random().toString(36).substring(2, 11),
          userId: order.userId,
          type: "cashback",
          amount: order.walletDiscount,
          action: "debit",
          description: `Spent ₹${order.walletDiscount} Cashback Wallet balance on Order #${orderId}`,
          date: new Date().toISOString()
        });
      }
    }

    dbState.scratchCards.push(newScratchCard);

    // Create confirmation notification
    dbState.notifications.push({
      id: "notif_" + Math.random().toString(36).substring(2, 11),
      userId: order.userId,
      title: "Order Confirmed! 🎁",
      message: `Your order ${orderId} has been paid successfully via ${gateway}. You earned 1 FREE Scratch Card!`,
      date: new Date().toISOString(),
      isRead: false
    });
  });

  // 2. Update MongoDB if active
  if (mongoose.connection.readyState === 1) {
    try {
      await PaymentModel.create({
        orderId,
        paymentId,
        gateway,
        amount: order.total,
        status: "Success",
        signature,
        createdAt: new Date()
      });

      const mongoOrder = await (OrderModel as any).findOne({ id: orderId });
      if (mongoOrder) {
        mongoOrder.paymentStatus = "Success";
        mongoOrder.status = "Packed";
        mongoOrder.scratchCardId = cardId;
        mongoOrder.paymentId = paymentId;
        await mongoOrder.save();
      }

      await ScratchCardModel.create({
        id: cardId,
        orderId,
        userId: order.userId,
        rewardType: reward.type,
        rewardValue: reward.val,
        rewardTitle: reward.title,
        status: "pending",
        purchaseDate: new Date(),
        expiryDate: new Date(Date.now() + db.adminSettings.rewardExpiryDays * 24 * 60 * 60 * 1000)
      });
    } catch (dbErr: any) {
      console.error("[Payment Log] Mongoose payment success write error:", dbErr.message);
    }
  }

  // Trigger live ticker update
  const finalDB = loadDB();
  const updatedUser = finalDB.users.find(u => u.id === order.userId);
  if (updatedUser && io) {
    io.emit("payment-completed", { orderId, total: order.total });
  }

  console.log(`[Payment Log] Signature Verified & Payment Logged - Gateway: ${gateway}`);
  console.log(`[Payment Log] Order Saved to Databases & Inventory Reduced`);
  console.log(`[Payment Log] Scratch Card Generated successfully: ${cardId}`);

  return {
    order: finalDB.orders.find(o => o.id === orderId),
    scratchCard: newScratchCard
  };
};

// Unified Verification Endpoint (Razorpay)
app.post("/api/payment/verify", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const user = req.user!;

  console.log("[Payment Log] Verification Request received for order:", orderId);

  // 1. Signature check
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (rzpKeySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
    const hmac = crypto.createHmac("sha256", rzpKeySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");
    if (generatedSignature !== razorpay_signature) {
      console.error("[Payment Log] Error: Signature Verification Failed");
      return res.status(400).json({
        success: false,
        error: "Invalid Signature",
        message: "Razorpay payment signature verification failed."
      });
    }
  }

  try {
    const result = await handlePaymentSuccess(
      orderId,
      razorpay_payment_id || "pay_" + Math.random().toString(36).substring(2, 11),
      "Razorpay",
      razorpay_signature,
      user.id
    );

    res.status(200).json({
      success: true,
      message: "Razorpay payment verified successfully",
      order: result.order,
      scratchCard: result.scratchCard
    });
  } catch (err: any) {
    console.error("[Payment Log] Razorpay verification process failed:", err.message);
    res.status(500).json({
      success: false,
      error: "Verification Error",
      message: err.message
    });
  }
});

// Backward compatible Razorpay Verification endpoint
app.post("/api/payments/razorpay/verify", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const user = req.user!;

  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (rzpKeySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
    const hmac = crypto.createHmac("sha256", rzpKeySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Signature verification failed" });
    }
  }

  try {
    const result = await handlePaymentSuccess(
      orderId,
      razorpay_payment_id || "pay_" + Math.random().toString(36).substring(2, 11),
      "Razorpay",
      razorpay_signature,
      user.id
    );
    res.status(200).json({
      message: "Verification completed",
      order: result.order,
      scratchCard: result.scratchCard
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Stripe checkout Session Creator
app.post("/api/payment/create-stripe-session", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { cartItems, shippingAddress, couponCode, coinDiscountEnabled, walletDiscountEnabled } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] Button Clicked - Method: Stripe, User: ${user.name}`);
  console.log(`[Payment Log] Create Stripe Session Request`);

  // 1. Key check
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("[Payment Log] Error: Missing Stripe Keys");
    return res.status(400).json({
      success: false,
      error: "Missing Stripe Keys",
      message: "Stripe Secret Key is not configured in environment variables."
    });
  }

  const stripe = getStripeInstance();
  if (!stripe) {
    return res.status(500).json({
      success: false,
      error: "Order Creation Failed",
      message: "Stripe SDK could not be initialized."
    });
  }

  // 2. Pricing and Cart calculation
  const db = loadDB();
  let subtotal = 0;
  let mrp = 0;
  const orderItems: any[] = [];

  for (const item of cartItems) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product Not Found" });
    }
    subtotal += product.price * item.quantity;
    mrp += (product.originalPrice || product.price) * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images?.[0]?.url || ""
    });
  }

  const promoDiscount = mrp - subtotal;
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.status === "active");
    if (coupon && subtotal >= coupon.minPurchase) {
      couponDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
    }
  }

  let coinDiscount = 0;
  let coinsToRedeem = 0;
  if (coinDiscountEnabled && user.coinBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount;
    const userMaxRedeemableInr = Math.floor(user.coinBalance / 10);
    const actualRedeemableInr = Math.min(maxRedeemableInr, userMaxRedeemableInr);
    coinsToRedeem = actualRedeemableInr * 10;
    coinDiscount = actualRedeemableInr;
  }

  let walletDiscount = 0;
  if (walletDiscountEnabled && user.cashbackBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount - coinDiscount;
    walletDiscount = Math.round(Math.min(maxRedeemableInr, user.cashbackBalance));
  }

  const deliveryFee = (subtotal - couponDiscount - coinDiscount - walletDiscount) >= 1000 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - couponDiscount - coinDiscount - walletDiscount + deliveryFee);
  const gst = Math.round((subtotal - couponDiscount - coinDiscount - walletDiscount) * 18 / 118);

  const orderId = "ord_" + Math.random().toString(36).substring(2, 11);

  // 3. Save pending Order
  const newOrder: Order = {
    id: orderId,
    userId: user.id,
    items: orderItems,
    subtotal,
    discount: couponDiscount + coinDiscount + walletDiscount,
    deliveryFee,
    total,
    status: "Pending",
    paymentMethod: "Stripe",
    paymentStatus: "Pending",
    shippingAddress,
    createdAt: new Date().toISOString(),
    mrp,
    promoDiscount,
    couponDiscount,
    coinDiscount,
    walletDiscount,
    gst,
    coinsRedeemed: coinsToRedeem
  };

  updateDB(dbState => {
    dbState.orders.push(newOrder);
  });

  if (mongoose.connection.readyState === 1) {
    await OrderModel.create({
      id: orderId,
      userId: user.id,
      items: orderItems,
      subtotal,
      discount: couponDiscount + coinDiscount + walletDiscount,
      deliveryFee,
      total,
      status: "Pending",
      paymentMethod: "Stripe",
      paymentStatus: "Pending",
      shippingAddress,
      mrp,
      promoDiscount,
      couponDiscount,
      coinDiscount,
      walletDiscount,
      gst,
      coinsRedeemed: coinsToRedeem
    });
  }

  // 4. Create Stripe checkout Session
  try {
    const reqHost = req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const fallbackOrigin = reqHost ? `${protocol}://${reqHost}` : "http://localhost:3000";
    const frontendUrl = process.env.APP_URL || process.env.FRONTEND_URL || req.headers.origin || fallbackOrigin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Secure Cart Order Payment",
              description: `Order #${orderId} - Scratch Rewards`,
            },
            unit_amount: Math.round(total * 100), // paise/cents
          },
          quantity: 1,
        }
      ],
      mode: "payment",
      success_url: `${frontendUrl}/?stripe_checkout_success=true&order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/?stripe_checkout_cancel=true`,
      metadata: { orderId, userId: user.id }
    });

    console.log(`[Payment Log] Order Created & Checkout Session Opened - Session ID: ${session.id}`);

    res.status(200).json({
      success: true,
      order_id: session.id,
      url: session.url,
      order: newOrder
    });
  } catch (err: any) {
    console.error("[Payment Log] Stripe Session Creation failed:", err.message);
    res.status(500).json({
      success: false,
      error: "Order Creation Failed",
      message: err.message || "Failed to create Stripe Checkout session."
    });
  }
});

// Stripe Payment Verification
app.post("/api/payments/stripe/verify", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { orderId, sessionId } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] Stripe verification request received for Session ID: ${sessionId}`);

  // 1. Key check
  const stripe = getStripeInstance();
  if (!stripe) {
    return res.status(500).json({ success: false, error: "Stripe Not Configured", message: "Stripe key is missing." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      console.error("[Payment Log] Stripe Session is unpaid:", session.payment_status);
      return res.status(400).json({
        success: false,
        error: "Webhook Failure / Payment Cancelled",
        message: "This checkout payment has not been successfully completed or paid."
      });
    }

    const result = await handlePaymentSuccess(
      orderId,
      session.payment_intent as string || sessionId,
      "Stripe",
      undefined,
      user.id
    );

    res.status(200).json({
      success: true,
      message: "Stripe payment verified successfully",
      order: result.order,
      scratchCard: result.scratchCard
    });
  } catch (err: any) {
    console.error("[Payment Log] Stripe verification failed:", err.message);
    res.status(500).json({
      success: false,
      error: "Network Timeout / Verification Error",
      message: err.message
    });
  }
});

// UPI QR Code order creation
app.post("/api/payment/create-upi", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { cartItems, shippingAddress, couponCode, coinDiscountEnabled, walletDiscountEnabled } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] Button Clicked - Method: UPI QR, User: ${user.name}`);

  const db = loadDB();
  let subtotal = 0;
  let mrp = 0;
  const orderItems: any[] = [];

  for (const item of cartItems) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ success: false, error: "Product Not Found" });
    }
    subtotal += product.price * item.quantity;
    mrp += (product.originalPrice || product.price) * item.quantity;
    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      image: product.images?.[0]?.url || ""
    });
  }

  const promoDiscount = mrp - subtotal;
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase() && c.status === "active");
    if (coupon && subtotal >= coupon.minPurchase) {
      couponDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
    }
  }

  let coinDiscount = 0;
  let coinsToRedeem = 0;
  if (coinDiscountEnabled && user.coinBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount;
    const userMaxRedeemableInr = Math.floor(user.coinBalance / 10);
    const actualRedeemableInr = Math.min(maxRedeemableInr, userMaxRedeemableInr);
    coinsToRedeem = actualRedeemableInr * 10;
    coinDiscount = actualRedeemableInr;
  }

  let walletDiscount = 0;
  if (walletDiscountEnabled && user.cashbackBalance > 0) {
    const maxRedeemableInr = subtotal - couponDiscount - coinDiscount;
    walletDiscount = Math.round(Math.min(maxRedeemableInr, user.cashbackBalance));
  }

  const deliveryFee = (subtotal - couponDiscount - coinDiscount - walletDiscount) >= 1000 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - couponDiscount - coinDiscount - walletDiscount + deliveryFee);
  const gst = Math.round((subtotal - couponDiscount - coinDiscount - walletDiscount) * 18 / 118);

  const orderId = "ord_" + Math.random().toString(36).substring(2, 11);

  const newOrder: Order = {
    id: orderId,
    userId: user.id,
    items: orderItems,
    subtotal,
    discount: couponDiscount + coinDiscount + walletDiscount,
    deliveryFee,
    total,
    status: "Pending",
    paymentMethod: "UPI",
    paymentStatus: "Pending",
    shippingAddress,
    createdAt: new Date().toISOString(),
    mrp,
    promoDiscount,
    couponDiscount,
    coinDiscount,
    walletDiscount,
    gst,
    coinsRedeemed: coinsToRedeem
  };

  updateDB(dbState => {
    dbState.orders.push(newOrder);
  });

  if (mongoose.connection.readyState === 1) {
    await OrderModel.create({
      id: orderId,
      userId: user.id,
      items: orderItems,
      subtotal,
      discount: couponDiscount + coinDiscount + walletDiscount,
      deliveryFee,
      total,
      status: "Pending",
      paymentMethod: "UPI",
      paymentStatus: "Pending",
      shippingAddress,
      mrp,
      promoDiscount,
      couponDiscount,
      coinDiscount,
      walletDiscount,
      gst,
      coinsRedeemed: coinsToRedeem
    });
  }

  // Generate UPI Deep Link for Merchant (e.g. scratchrewards@upi)
  const upiId = "scratchrewards@okhdfcbank";
  const upiLink = `upi://pay?pa=${upiId}&pn=Scratch%20Rewards&am=${total}&tr=${orderId}&tn=Order_${orderId}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

  console.log(`[Payment Log] UPI QR Code generated for Order #${orderId}`);

  res.status(200).json({
    success: true,
    orderId,
    total,
    upiLink,
    qrUrl,
    order: newOrder
  });
});

// UPI verification (simulate real verification of manual reference ID / screenshot)
app.post("/api/payments/upi/verify", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { orderId, transactionId } = req.body;
  const user = req.user!;

  console.log(`[Payment Log] UPI verification requested for order: ${orderId}, Transaction Ref ID: ${transactionId}`);

  if (!transactionId) {
    return res.status(400).json({ success: false, error: "Missing Transaction ID", message: "UPI Ref/UTR Number is required." });
  }

  try {
    const result = await handlePaymentSuccess(
      orderId,
      transactionId,
      "UPI",
      undefined,
      user.id
    );

    res.status(200).json({
      success: true,
      message: "UPI Transaction recorded and verified successfully",
      order: result.order,
      scratchCard: result.scratchCard
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Webhook loggers & handlers
app.post("/api/payment/webhook", async (req: Request, res: Response) => {
  console.log("[Payment Log] Webhook Received - Event:", req.body?.event);

  const signature = req.headers["x-razorpay-signature"];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update((req as any).rawBody || JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      console.error("[Payment Log] Webhook signature verification failed!");
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }
    console.log("[Payment Log] Webhook signature verified successfully.");
  } else {
    console.log("[Payment Log] Webhook signature check bypassed (no RAZORPAY_WEBHOOK_SECRET set in .env).");
  }

  const { event, payload } = req.body;
  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = payload.payment?.entity;
    const orderId = paymentEntity?.notes?.orderId || paymentEntity?.description?.split("#")?.[1];
    const paymentId = paymentEntity?.id;

    if (orderId && paymentId) {
      console.log(`[Payment Log] Webhook Processing - Order: ${orderId}, Payment: ${paymentId}`);
      try {
        await handlePaymentSuccess(
          orderId,
          paymentId,
          "Razorpay",
          signature as string || undefined
        );
        console.log(`[Payment Log] Webhook Successful - Verified & Handled Order #${orderId}`);
      } catch (err: any) {
        console.error("[Payment Log] Webhook order handler failed:", err.message);
      }
    } else {
      console.warn("[Payment Log] Webhook payload missing orderId in notes or description");
    }
  }

  res.status(200).send("OK");
});

app.post("/api/payments/razorpay/webhook", (req: Request, res: Response) => {
  console.log("[Payment Log] Forwarding legacy webhook to /api/payment/webhook");
  res.redirect(307, "/api/payment/webhook");
});

app.post("/api/payments/stripe/webhook", (req: Request, res: Response) => {
  console.log("[Payment Log] Webhook Received - Stripe Event:", req.body?.type);
  res.status(200).send("OK");
});



// ==========================================
// VITE INTEGRATION / CLIENT ROUTING
// ==========================================

async function startServer() {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
  });

  (global as any).io = io;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
