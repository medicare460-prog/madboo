import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  Heart,
  ChevronRight,
  Star,
  Check,
  Plus,
  Minus,
  Trash2,
  Lock,
  ArrowRight,
  MapPin,
  Tag,
  CreditCard,
  Percent,
  Search,
  SlidersHorizontal,
  LogOut,
  ChevronLeft,
  X,
  Shield,
  Clock,
  UserCheck
} from "lucide-react";
import Navbar from "./components/Navbar.js";
import LiveWinnerTicker from "./components/LiveWinnerTicker.js";
import LiveWinnerPopup from "./components/LiveWinnerPopup.js";
import UserDashboard from "./components/UserDashboard.js";
import AdminPanel from "./components/AdminPanel.js";
import ScratchPopup from "./components/ScratchPopup.js";
import CheckoutPayment from "./components/CheckoutPayment.js";
import { OrderSuccess } from "./components/OrderSuccess.js";
import { Product, User, Order, ScratchCard, Transaction, Coupon, Notification, WinnerHistory, getProductMainImage, handleImageError } from "./types.js";

export default function App() {
  // Navigation & View States
  const [currentView, setCurrentView] = useState<"catalog" | "cart" | "dashboard" | "admin" | "wishlist">("catalog");
  const [dashboardTab, setDashboardTab] = useState<"profile" | "cards" | "orders" | "coin_wallet" | "cashback_wallet" | "coupons" | "notifications">("profile");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Authentication States
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""); // subCategory filter e.g. Electronics
  const [badgeFilter, setBadgeFilter] = useState(""); // e.g. "General" | "Trending" | "Hot Deals"
  const [priceFilter, setPriceFilter] = useState(6000);

  // Shopping States
  const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: "John Doe",
    phone: "+91 9876543210",
    addressLine: "Sector 5, CRED Tower, Flat 302",
    city: "Bangalore",
    state: "Karnataka",
    zipCode: "560001"
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");

  // Checkout states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "address" | "payment" | "simulating_payment" | "success">("cart");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [successScratchCard, setSuccessScratchCard] = useState<ScratchCard | null>(null);

  // User Dashboard State Data
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [scratchCards, setScratchCards] = useState<ScratchCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [winners, setWinners] = useState<WinnerHistory[]>([]);

  // Active rewards scratching state
  const [activeScratchCard, setActiveScratchCard] = useState<ScratchCard | null>(null);

  // Product review draft state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // ==========================================
  // FETCHERS & INITIALIZERS
  // ==========================================

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Products load failed", e);
    }
  };

  const fetchWinners = async () => {
    try {
      const res = await fetch("/api/winners");
      if (res.ok) {
        const data = await res.json();
        setWinners(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserData = async (activeToken: string) => {
    try {
      // 1. Fetch Profile
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (meRes.ok) {
        const me = await meRes.json();
        setUser(me);
      } else if (meRes.status === 401) {
        // Clear expired/invalid token
        localStorage.removeItem("scratch_user_token");
        setToken(null);
        setUser(null);
        return;
      }

      // 2. Fetch user orders
      try {
        const ordRes = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (ordRes.ok) {
          setUserOrders(await ordRes.json());
        }
      } catch (err) {
        console.error("Orders fetch error:", err);
      }

      // 3. Fetch scratch cards
      try {
        const cardsRes = await fetch("/api/scratch-cards", {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (cardsRes.ok) {
          setScratchCards(await cardsRes.json());
        }
      } catch (err) {
        console.error("Scratch cards fetch error:", err);
      }

      // 4. Fetch transactions
      try {
        const txRes = await fetch("/api/wallets/history", {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (txRes.ok) {
          setTransactions(await txRes.json());
        }
      } catch (err) {
        console.error("Transactions fetch error:", err);
      }

      // 5. Fetch coupons
      try {
        const coupRes = await fetch("/api/coupons");
        if (coupRes.ok) {
          setCoupons(await coupRes.json());
        }
      } catch (err) {
        console.error("Coupons fetch error:", err);
      }

      // 6. Fetch notifications
      try {
        const notifRes = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (notifRes.ok) {
          setNotifications(await notifRes.json());
        }
      } catch (err) {
        console.error("Notifications fetch error:", err);
      }
    } catch (err) {
      console.error("User data synchronization failed:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWinners();

    // Auto load session token from local storage
    const storedToken = localStorage.getItem("scratch_user_token");
    if (storedToken) {
      setToken(storedToken);
      fetchUserData(storedToken);
    }
  }, []);

  // Sync winners ticker periodically (long-polling simulation)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchWinners();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Handle Stripe Redirection Success & Cancel Checks
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get("stripe_checkout_success");
    const stripeCancel = urlParams.get("stripe_checkout_cancel");
    const urlOrderId = urlParams.get("order_id");
    const sessionId = urlParams.get("session_id");

    if (stripeSuccess === "true" && urlOrderId && sessionId) {
      // Clear URL parameters cleanly
      window.history.replaceState({}, document.title, window.location.pathname);

      const verifyStripePayment = async () => {
        setCheckoutStep("simulating_payment");
        setIsCheckingOut(true);
        
        const storedToken = localStorage.getItem("scratch_user_token") || token;
        if (!storedToken) {
          alert("Your authorization session expired. Please log in to complete Stripe verification.");
          setIsCheckingOut(false);
          setCheckoutStep("cart");
          return;
        }

        try {
          const res = await fetch("/api/payments/stripe/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${storedToken}`
            },
            body: JSON.stringify({ orderId: urlOrderId, sessionId })
          });
          const data = await res.json();
          if (res.ok) {
            setCreatedOrder(data.order);
            setCheckoutStep("success");
            setCart([]); // clear cart
            fetchUserData(storedToken);
          } else {
            alert(`Stripe Verification Failed: ${data.message || data.error}`);
            setCheckoutStep("cart");
            setIsCheckingOut(false);
          }
        } catch (err) {
          console.error("Stripe verify error:", err);
          alert("Failed to contact payment verification gateway server.");
          setCheckoutStep("cart");
          setIsCheckingOut(false);
        }
      };

      verifyStripePayment();
    } else if (stripeCancel === "true") {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Stripe Checkout Payment was cancelled by the user.");
    }
  }, [token]);

  const handleRefreshAllData = () => {
    if (token) {
      fetchUserData(token);
    }
    fetchProducts();
    fetchWinners();
  };

  // ==========================================
  // AUTH PROCEDURES
  // ==========================================

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const isReg = authMode === "register";
    const url = isReg ? "/api/auth/register" : "/api/auth/login";
    const body = isReg
      ? { email: authEmail, password: authPassword, name: authName }
      : { email: authEmail, password: authPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("scratch_user_token", data.token);
        setShowAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        fetchUserData(data.token);
      } else {
        setAuthError(data.message);
      }
    } catch (err) {
      setAuthError("Failed to reach auth gateway. Please try again.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("scratch_user_token");
    setCart([]);
    setWishlist([]);
    setCurrentView("catalog");
  };

  // ==========================================
  // CATALOG SHOPPING OPERATORS
  // ==========================================

  const handleAddToCart = (productId: string, qty: number = 1) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.productId === productId);
      if (exists) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + qty, 10) }
            : item
        );
      }
      return [...prev, { productId, quantity: qty }];
    });
  };

  const handleModifyQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleToggleWishlist = (id: string) => {
    setWishlist((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  // ==========================================
  // COUPONS IMPLEMENTATION
  // ==========================================

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    setAppliedCoupon(null);

    if (!couponCode) {
      setCouponError("Please type a coupon code.");
      return;
    }

    try {
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, amount: calculateSubtotal() })
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon(data.coupon);
      } else {
        setCouponError(data.message);
      }
    } catch (err) {
      setCouponError("Could not apply coupon.");
    }
  };

  // ==========================================
  // CHECKOUT PROCEDURE
  // ==========================================

  const calculateSubtotal = () => {
    return cart.reduce((acc, item) => {
      const prod = products.find((p) => p.id === item.productId);
      return acc + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  const handleProceedToCheckout = () => {
    if (!token) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    setCheckoutStep("address");
    setIsCheckingOut(true);
  };

  const handleConfirmAddress = () => {
    setCheckoutStep("payment");
  };

  const handleSimulatePayment = () => {
    setCheckoutStep("simulating_payment");
    setTimeout(async () => {
      // Create checkout order on server
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cartItems: cart,
            shippingAddress,
            paymentMethod: selectedPaymentMethod,
            couponCode: appliedCoupon?.code
          })
        });

        const data = await res.json();
        if (res.ok) {
          setCreatedOrder(data.order);
          // Set generated card to open popup instantly!
          setActiveScratchCard(data.scratchCard);
          setCart([]); // Clear cart
          setAppliedCoupon(null);
          setCouponCode("");
          setCheckoutStep("success");
          handleRefreshAllData();
        } else {
          alert(`Checkout failed: ${data.message}`);
          setCheckoutStep("payment");
        }
      } catch (err) {
        console.error(err);
        setCheckoutStep("payment");
      }
    }, 2500);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    if (!reviewComment) return;

    try {
      const res = await fetch(`/api/products/${selectedProduct?.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      if (res.ok) {
        const prod = await res.json();
        setSelectedProduct(prod);
        setReviewComment("");
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? p.subCategory === categoryFilter : true;
    const matchesBadge = badgeFilter ? p.category === badgeFilter : true;
    const matchesPrice = p.price <= priceFilter;

    return matchesSearch && matchesCategory && matchesBadge && matchesPrice;
  });

  const subtotal = calculateSubtotal();
  const discount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) : 0;
  const deliveryFee = subtotal - discount >= 1000 ? 0 : 99;
  const total = subtotal - discount + deliveryFee;

  const subCategories: Product["subCategory"][] = [
    "Electronics",
    "Fashion",
    "Accessories",
    "Home",
    "Beauty",
    "Sports",
    "Books",
    "Groceries"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* 1. TOP MARGIN LIVE TICKER */}
      <LiveWinnerTicker winners={winners} />

      {/* PREMIUM PROMOTIONAL TAGLINE BANNER */}
      <div 
        id="promo-banner" 
        className="w-full bg-gradient-to-r from-[#2563EB] to-[#10B981] py-3 px-4 text-center text-white relative overflow-hidden flex items-center justify-center gap-2 font-display text-sm font-bold tracking-wide shadow-md"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-banner-shine pointer-events-none" />
        <span className="relative z-10 flex items-center gap-2 select-none text-white font-bold">
          🛍️ Shop & Win Cashback Instantly!
        </span>
      </div>

      {/* 2. LOGO NAVIGATION BAR */}
      <Navbar
        user={user}
        cartCount={cart.reduce((acc, c) => acc + c.quantity, 0)}
        onNavigate={(v, tab) => {
          setIsCheckingOut(false);
          if (tab) {
            setDashboardTab(tab);
          }
          if (v === "dashboard" && (!token || !user)) {
            setAuthMode("login");
            setShowAuthModal(true);
            return;
          }
          setCurrentView(v);
        }}
        onLogout={handleLogout}
        onTriggerLogin={() => {
          setAuthMode("login");
          setShowAuthModal(true);
        }}
        onSearchChange={setSearchQuery}
        onCategoryFilter={setCategoryFilter}
        notifications={notifications}
        scratchCards={scratchCards}
      />

      {/* 3. REWARD POPUP (WHEN AWARDED A SCRATCH CARD) */}
      {activeScratchCard && token && (
        <ScratchPopup
          card={activeScratchCard}
          token={token}
          onClose={() => {
            setActiveScratchCard(null);
            setCurrentView("dashboard");
          }}
          onClaimSuccess={handleRefreshAllData}
        />
      )}

      {/* 4. MAIN LAYOUT views */}

      {/* View: Admin Panel */}
      {currentView === "admin" && token && (
        <AdminPanel token={token} products={products} onRefreshProducts={handleRefreshAllData} />
      )}

      {/* View: Customer Dashboard */}
      {currentView === "dashboard" && token && user && (
        <UserDashboard
          token={token}
          user={user}
          orders={userOrders}
          scratchCards={scratchCards}
          transactions={transactions}
          coupons={coupons}
          notifications={notifications}
          onTriggerScratch={setActiveScratchCard}
          onRefreshData={handleRefreshAllData}
          onBrowseProducts={() => {
            setSelectedProduct(null);
            setCurrentView("catalog");
          }}
          initialTab={dashboardTab}
        />
      )}

      {/* View: Wishlist Page */}
      {currentView === "wishlist" && (
        <div className="max-w-7xl mx-auto px-4 py-12 w-full flex-1">
          <h2 className="text-2xl font-display font-extrabold text-slate-100 mb-6 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" /> Your Favorite Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((id) => {
              const p = products.find((prod) => prod.id === id);
              if (!p) return null;
              return (
                <div key={p.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                  <div className="h-44 bg-slate-900 relative">
                    <img
                      src={getProductMainImage(p)}
                      alt={p.name}
                      onError={(e) => handleImageError(e, p.name)}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleToggleWishlist(p.id)}
                      className="absolute top-2.5 right-2.5 p-2 bg-slate-950/80 hover:bg-slate-900 text-rose-500 rounded-full border border-slate-800 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs line-clamp-1">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">{p.subCategory}</p>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">₹{p.price}</span>
                      <button
                        onClick={() => handleAddToCart(p.id)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold tracking-wide transition cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {wishlist.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500">
                <Heart className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-xs font-medium">Your wishlist cabinet is empty. Explore catalog and save favorites!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View: Checkout / Cart Panel */}
      {currentView === "cart" && (
        <div className="max-w-5xl mx-auto px-4 py-12 w-full flex-1">
          {!isCheckingOut ? (
            /* CART SUMMARY VIEW */
            <div>
              <h2 className="text-2xl font-display font-extrabold text-slate-100 mb-6 flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-blue-500" /> Your Shopping Cart
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart items */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  {cart.map((item) => {
                    const p = products.find((prod) => prod.id === item.productId);
                    if (!p) return null;
                    return (
                      <div key={item.productId} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                        <img
                          src={getProductMainImage(p)}
                          alt={p.name}
                          onError={(e) => handleImageError(e, p.name)}
                          className="h-16 w-16 object-cover rounded-xl border border-slate-800"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-200 text-xs line-clamp-1">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.subCategory}</p>
                          <p className="text-xs text-emerald-400 font-mono mt-1 font-bold">₹{p.price}</p>
                        </div>

                        {/* Qty count */}
                        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button onClick={() => handleModifyQty(p.id, -1)} className="p-1 hover:text-white text-slate-400">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-mono font-bold text-slate-200 w-5 text-center">{item.quantity}</span>
                          <button onClick={() => handleModifyQty(p.id, 1)} className="p-1 hover:text-white text-slate-400">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveFromCart(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-950 rounded-lg border border-transparent hover:border-slate-800 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  {cart.length === 0 && (
                    <div className="py-16 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800">
                      <ShoppingBag className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                      <p className="text-xs font-medium">Your shopping cart is completely empty.</p>
                      <button
                        onClick={() => setCurrentView("catalog")}
                        className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition"
                      >
                        Start Shopping
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtotal Order Pricing Summary */}
                {cart.length > 0 && (
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800 h-fit">
                    <h3 className="font-bold text-slate-200 font-display text-sm mb-4">Cart Price Summary</h3>

                    {/* Apply Coupon code form */}
                    <form onSubmit={handleApplyCoupon} className="mb-6">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Promo Coupon Code</label>
                      <div className="flex gap-2 mt-1.5">
                        <input
                          type="text"
                          placeholder="e.g. WELCOME10"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs uppercase outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <p className="text-rose-400 text-[10px] font-mono mt-1.5">{couponError}</p>}
                      {appliedCoupon && (
                        <p className="text-emerald-400 text-[10px] font-mono mt-1.5 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Flat {appliedCoupon.discountPercent}% Coupon Active!
                        </p>
                      )}
                    </form>

                    <div className="flex flex-col gap-3 text-xs border-t border-slate-800 pt-4">
                      <div className="flex justify-between text-slate-400">
                        <span>Cart Subtotal</span>
                        <span className="font-mono text-slate-200">₹{subtotal}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Discount Coupon ({appliedCoupon.discountPercent}%)</span>
                          <span className="font-mono">-₹{discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400">
                        <span>Logistics Shipping Delivery</span>
                        <span className="font-mono text-slate-200">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
                      </div>

                      <div className="h-px bg-slate-800 my-1" />

                      <div className="flex justify-between font-bold text-slate-100 text-sm">
                        <span>Order Total Amount</span>
                        <span className="font-mono text-emerald-400">₹{total}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleProceedToCheckout}
                      className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Checkout Securely <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-3 font-mono">
                      🔒 256-bit encrypted secure checkout
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEPPED CHECKOUT GATEWAYS */
            <div>
              {/* Stepper Header */}
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <button
                  onClick={() => {
                    if (checkoutStep === "address") setIsCheckingOut(false);
                    if (checkoutStep === "payment") setCheckoutStep("address");
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to prev step
                </button>
                <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
                  <span className={checkoutStep === "address" ? "text-blue-400 font-bold" : ""}>1. ADDRESS</span>
                  <span>/</span>
                  <span className={checkoutStep === "payment" ? "text-blue-400 font-bold" : ""}>2. PAYMENT</span>
                </div>
              </div>

              {/* Step 1: Address Details Form */}
              {checkoutStep === "address" && (
                <div className="max-w-xl mx-auto glass-panel p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold font-display text-slate-100 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" /> Enter Shipping Coordinates
                  </h3>

                  <div className="flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">FullName Address</label>
                      <input
                        type="text"
                        value={shippingAddress.fullName}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Contact Number</label>
                      <input
                        type="text"
                        value={shippingAddress.phone}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400">Street Address Line</label>
                      <input
                        type="text"
                        value={shippingAddress.addressLine}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine: e.target.value })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400">City</label>
                        <input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400">State</label>
                        <input
                          type="text"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-400">Zip PIN</label>
                        <input
                          type="text"
                          value={shippingAddress.zipCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmAddress}
                      className="mt-4 w-full py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Confirm Address Coordinate <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Payment Portal Selection */}
              {checkoutStep === "payment" && (
                <CheckoutPayment
                  cart={cart}
                  token={token || ""}
                  subtotal={subtotal}
                  appliedCoupon={appliedCoupon}
                  shippingAddress={shippingAddress}
                  onPaymentSuccess={(order, scratchCard) => {
                    setCreatedOrder(order);
                    setSuccessScratchCard(scratchCard || null);
                    setCheckoutStep("success");
                    setCart([]);
                    setAppliedCoupon(null);
                    setCouponCode("");
                    handleRefreshAllData();
                  }}
                  onCancel={() => setCheckoutStep("address")}
                  user={user}
                  onRefreshAllData={handleRefreshAllData}
                  products={products}
                />
              )}

              {/* Step 3: Payment Loading Simulation Screen */}
              {checkoutStep === "simulating_payment" && (
                <div className="max-w-md mx-auto text-center py-12 flex flex-col items-center">
                  <div className="relative h-20 w-20 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                    <Lock className="h-6 w-6 text-blue-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold font-display text-slate-100">Contacting Payment Gateway...</h3>
                  <p className="text-slate-400 text-xs mt-2 max-w-[280px]">
                    Connecting securely with {selectedPaymentMethod} server nodes. Please do not close or reload this window.
                  </p>
                </div>
              )}

              {/* Step 4: Secure Order Successfully Placed View */}
              {checkoutStep === "success" && (
                <OrderSuccess
                  order={createdOrder}
                  scratchCard={successScratchCard}
                  onContinueShopping={() => {
                    setCreatedOrder(null);
                    setSuccessScratchCard(null);
                    setCheckoutStep("cart");
                    setIsCheckingOut(false);
                    setCurrentView("catalog");
                  }}
                  onTrackOrder={() => {
                    setCreatedOrder(null);
                    setSuccessScratchCard(null);
                    setCheckoutStep("cart");
                    setIsCheckingOut(false);
                    setCurrentView("dashboard");
                  }}
                  onClaimScratchCard={(card) => {
                    setActiveScratchCard(card);
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* View: Product Details View */}
      {currentView === "catalog" && selectedProduct && (
        <div className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">
          {/* Back button */}
          <button
            onClick={() => setSelectedProduct(null)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 mb-6"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Catalog Exploration
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Gallery Images */}
            <div className="space-y-4">
              <div className="h-80 md:h-[400px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative group">
                <img
                  src={getProductMainImage(selectedProduct)}
                  alt={selectedProduct.name}
                  onError={(e) => handleImageError(e, selectedProduct.name)}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-103"
                />
                <span className="absolute top-4 left-4 bg-blue-600/95 text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded text-white">
                  {selectedProduct.category}
                </span>
              </div>
            </div>

            {/* Specifications Details */}
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-display font-extrabold tracking-tight text-white">
                  {selectedProduct.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="flex items-center gap-0.5 text-xs text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {selectedProduct.rating}
                  </span>
                  <span className="text-slate-500 text-xs">({selectedProduct.reviewsCount} customer reviews)</span>
                </div>

                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-2xl font-black text-emerald-400 font-mono">₹{selectedProduct.price}</span>
                  <span className="text-sm text-slate-500 line-through font-mono">₹{selectedProduct.originalPrice}</span>
                  <span className="text-xs text-emerald-500 font-bold font-mono">
                    ({Math.round(((selectedProduct.originalPrice - selectedProduct.price) / selectedProduct.originalPrice) * 100)}% off)
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-4 leading-relaxed">{selectedProduct.description}</p>

                {/* Technical specs Table */}
                <div className="mt-6">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Product Specifications</h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-xs">
                    {Object.entries(selectedProduct.specifications).map(([key, val]) => (
                      <div key={key} className="flex border-b border-slate-800/40 last:border-0">
                        <span className="w-1/3 p-2.5 bg-slate-950 font-mono text-slate-400">{key}</span>
                        <span className="w-2/3 p-2.5 text-slate-200">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-800/60 flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct.id);
                    setSelectedProduct(null);
                    setCurrentView("cart");
                  }}
                  className="flex-1 min-w-[130px] py-3 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                >
                  🎁 Buy & Scratch <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct.id);
                    alert("Added to cart successfully!");
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
                >
                  Add to Cart
                </button>

                <button
                  onClick={() => handleToggleWishlist(selectedProduct.id)}
                  className={`p-3 rounded-xl border transition ${
                    wishlist.includes(selectedProduct.id) ? "border-rose-500 text-rose-500 bg-rose-500/10" : "border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-900 pt-8">
            <div className="md:col-span-1">
              <h3 className="text-md font-bold font-display text-slate-200 mb-4">Post a Review</h3>
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3.5 text-xs bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Rating Stars</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-blue-500 outline-none"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                    <option value={3}>⭐⭐⭐ (3/5)</option>
                    <option value={2}>⭐⭐ (2/5)</option>
                    <option value={1}>⭐ (1/5)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Review Comments</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell other shoppers what you loved about this design..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition cursor-pointer"
                >
                  Submit Review
                </button>
              </form>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-md font-bold font-display text-slate-200 mb-4"> Shoppers Reviews</h3>
              <div className="flex flex-col gap-3">
                {selectedProduct.reviewsList?.map((r, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-300">{r.user}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{r.date}</span>
                    </div>
                    <span className="text-amber-400 font-mono">{"★".repeat(r.rating)}</span>
                    <p className="text-slate-400 mt-2">{r.comment}</p>
                  </div>
                ))}
                {(!selectedProduct.reviewsList || selectedProduct.reviewsList.length === 0) && (
                  <p className="text-slate-500 text-xs italic">Be the first to review this catalog product!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View: Standard Catalog Explorer Landing */}
      {currentView === "catalog" && !selectedProduct && (
        <div className="flex-1 flex flex-col">
          {/* HERO BANNER BLOCK */}
          <div className="relative py-16 px-4 bg-slate-950 overflow-hidden border-b border-slate-900">
            {/* Absolute gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/10 border border-blue-800/30 text-blue-400 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase mb-5 animate-bounce">
                  <Sparkles className="h-3 w-3 animate-spin duration-3000" /> REWARDS SEASON ACTIVE
                </span>
                <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight leading-none text-white">
                  SHOP SMART <br />
                  <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#10B981] animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                    SCRATCH & WIN BIG
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-md">
                  Every successful purchase automatically issues a premium digital scratch card loaded with guaranteed cashback, reward coins, high-value coupons, or a mystery gift!
                </p>
                <div className="flex items-center gap-4 mt-8">
                  <button
                    onClick={() => {
                      const el = document.getElementById("catalog-showcase");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer"
                  >
                    Start Shopping
                  </button>
                  <button
                    onClick={() => {
                      if (!token) {
                        setAuthMode("login");
                        setShowAuthModal(true);
                      } else {
                        setCurrentView("dashboard");
                      }
                    }}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition cursor-pointer"
                  >
                    Explore Rewards Cabinet
                  </button>
                </div>
              </div>

              {/* Decorative Hero elements */}
              <div className="hidden lg:flex justify-center relative animate-float">
                <div className="relative w-80 h-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden glass-panel-glow">
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-full blur-2xl opacity-40" />
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-slate-500 font-mono">DIGITAL CABINET</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 uppercase">Guaranteed</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-slate-200">Scratch Card Reward</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Reveal exciting coins, vouchers, mystery swag bags & instant cashbacks.</p>
                  </div>
                  <div className="silver-scratch-layer h-16 rounded-xl flex items-center justify-center font-bold text-xs text-slate-950 font-display shadow">
                    SCRATCH SURFACE
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN PRODUCT SHOWCASE */}
          <div id="catalog-showcase" className="max-w-7xl mx-auto px-4 py-12 w-full">
            {/* Filter controls row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-display font-extrabold text-slate-100 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-5 w-5 text-blue-500" /> Explore Catalog Collections
                </h3>
                <p className="text-slate-400 text-xs mt-1">Filter by category collections, hot badges, and price margins.</p>
              </div>

              {/* Instant Category Buttons */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => setCategoryFilter("")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                    categoryFilter === "" ? "bg-blue-600/10 text-blue-400 border-blue-500/30" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Items
                </button>
                {subCategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setCategoryFilter(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                      categoryFilter === sub ? "bg-blue-600/10 text-blue-400 border-blue-500/30" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Badge layout filter bar */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap gap-4 items-center mb-8 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Badge Filter:</span>
                <select
                  value={badgeFilter}
                  onChange={(e) => setBadgeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
                >
                  <option value="">Any Badges</option>
                  <option value="General">General</option>
                  <option value="Trending">Trending</option>
                  <option value="Hot Deals">Hot Deals</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-slate-400 whitespace-nowrap">Price limit:</span>
                <input
                  type="range"
                  min={100}
                  max={6000}
                  step={100}
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(Number(e.target.value))}
                  className="flex-1 accent-blue-500 bg-slate-950 h-1 rounded-full cursor-pointer"
                />
                <span className="font-mono text-emerald-400 font-bold">₹{priceFilter}</span>
              </div>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden hover:border-blue-500/20 transition duration-300 flex flex-col justify-between"
                >
                  <div className="h-44 bg-slate-900 relative overflow-hidden">
                    <img
                      src={getProductMainImage(p)}
                      alt={p.name}
                      onError={(e) => handleImageError(e, p.name)}
                      onClick={() => setSelectedProduct(p)}
                      className="w-full h-full object-cover cursor-pointer hover:scale-102 transition duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-blue-600/90 text-white text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded shadow">
                      {p.category}
                    </span>
                    <button
                      onClick={() => handleToggleWishlist(p.id)}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full border border-slate-800 transition cursor-pointer ${
                        wishlist.includes(p.id) ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-slate-950/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4
                        onClick={() => setSelectedProduct(p)}
                        className="font-bold font-display text-slate-100 text-sm hover:text-blue-400 transition cursor-pointer line-clamp-1"
                      >
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{p.subCategory}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="flex items-center text-[10px] text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400 mr-0.5" /> {p.rating}
                        </span>
                        <span className="text-[10px] text-slate-500">({p.reviewsCount} reviews)</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-800/40 pt-3">
                      <div className="flex justify-between items-baseline mb-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-md font-bold text-emerald-400 font-mono">₹{p.price}</span>
                          <span className="text-[10px] text-slate-500 line-through font-mono">₹{p.originalPrice}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">{p.stock > 0 ? "In Stock" : "Out of Stock"}</span>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={() => {
                            handleAddToCart(p.id);
                            setCurrentView("cart");
                          }}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:scale-[1.01] cursor-pointer"
                        >
                          🎁 Buy & Scratch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <Search className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs font-medium">No products matching the selected catalog filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER SECTION */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500">
          <div>
            <p className="font-bold text-slate-300 font-display">Scratch Rewards eCommerce Platform</p>
            <p className="mt-1">Experience luxury gamified shopping. Earn real-time cashbacks, coins, and coupon rewards.</p>
          </div>
          <div className="flex gap-4 font-mono">
            <span className="text-blue-400 font-bold text-[10px]">100% SECURE GATEWAYS</span>
            <span>·</span>
            <span>TERMS</span>
            <span>·</span>
            <span>PRIVACY RULES</span>
          </div>
        </div>
      </footer>

      {/* 6. GLASSMORPHIC AUTH LOGIN/REGISTER OVERLAY MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
            {/* Glows */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-5">
              <h3 className="font-bold font-display text-base text-slate-100">
                {authMode === "login" ? "🔒 Sign In to Account" : "✨ Join Scratch Rewards"}
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {authError && (
              <div className="mb-4 bg-red-950/40 border border-red-800/50 text-red-300 p-2.5 rounded-lg text-[11px] font-medium font-mono">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-xs">
              {authMode === "register" && (
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">FullName</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">Password Code</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md mt-2 cursor-pointer"
              >
                {authMode === "login" ? "Authorize Login" : "Create My Account"}
              </button>

              <div className="text-center mt-3 text-[10px] text-slate-500 font-mono">
                {authMode === "login" ? (
                  <span>
                    New to the app?{" "}
                    <strong
                      onClick={() => {
                        setAuthError("");
                        setAuthMode("register");
                      }}
                      className="text-blue-400 cursor-pointer hover:underline"
                    >
                      Create Account
                    </strong>
                  </span>
                ) : (
                  <span>
                    Already have account?{" "}
                    <strong
                      onClick={() => {
                        setAuthError("");
                        setAuthMode("login");
                      }}
                      className="text-blue-400 cursor-pointer hover:underline"
                    >
                      Sign In here
                    </strong>
                  </span>
                )}
              </div>
            </form>

            {/* Hint Box */}
            <div className="mt-5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[10px] text-slate-500 font-mono leading-relaxed">
              <strong className="text-blue-400">Demo Logins:</strong> <br />
              • Customer: <span className="text-slate-300">customer@scratchrewards.com</span> / <span className="text-slate-300">customer123</span> <br />
              • Admin Panel: <span className="text-slate-300">admin@scratchrewards.com</span> / <span className="text-slate-300">admin123</span>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING LIVE WINNER NOTIFICATION POPUP */}
      <LiveWinnerPopup />
    </div>
  );
}
