import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  ShoppingBag,
  Gift,
  Coins,
  CreditCard,
  Percent,
  Bell,
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  Unlock,
  Sparkles,
  Search,
  CheckCircle2,
  ChevronDown,
  Info
} from "lucide-react";
import { User, Order, ScratchCard, Transaction, Coupon, Notification, handleImageError, getProductImageUrl } from "../types.js";

interface UserDashboardProps {
  token: string;
  user: User;
  orders: Order[];
  scratchCards: ScratchCard[];
  transactions: Transaction[];
  coupons: Coupon[];
  notifications: Notification[];
  onTriggerScratch: (card: ScratchCard) => void;
  onRefreshData: () => void;
  onBrowseProducts?: () => void;
  initialTab?: "profile" | "cards" | "orders" | "coin_wallet" | "cashback_wallet" | "coupons" | "notifications";
}

export default function UserDashboard({
  token,
  user,
  orders,
  scratchCards,
  transactions,
  coupons,
  notifications,
  onTriggerScratch,
  onRefreshData,
  onBrowseProducts,
  initialTab = "profile"
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "cards" | "orders" | "coin_wallet" | "cashback_wallet" | "coupons" | "notifications">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Wallet Form states
  const [coinsToConvert, setCoinsToConvert] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filter state for scratch cards
  const [cardFilter, setCardFilter] = useState<"all" | "pending" | "claimed">("all");

  const handleConvertCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const coins = Number(coinsToConvert);
    if (!coins || coins <= 0) {
      setErrorMsg("Please enter a valid positive number of coins.");
      return;
    }

    if (coins % 10 !== 0) {
      setErrorMsg("Coins to convert must be a multiple of 10.");
      return;
    }

    if (user.coinBalance < coins) {
      setErrorMsg("Insufficient coin balance.");
      return;
    }

    try {
      const res = await fetch("/api/wallets/convert-coins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ coinsToConvert: coins })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setCoinsToConvert("");
        onRefreshData();
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg("Conversion failed. Please try again.");
    }
  };

  const handleWithdrawCashback = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) {
      setErrorMsg("Minimum withdrawal amount is ₹100.");
      return;
    }

    if (!upiId.includes("@")) {
      setErrorMsg("Please enter a valid UPI address (e.g. name@upi).");
      return;
    }

    if (user.cashbackBalance < amount) {
      setErrorMsg("Insufficient cashback balance.");
      return;
    }

    try {
      const res = await fetch("/api/wallets/withdraw-cashback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount, upiId })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setWithdrawAmount("");
        setUpiId("");
        onRefreshData();
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg("Withdrawal registration failed. Please try again.");
    }
  };

  const markNotifsRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "notifications") {
      markNotifsRead();
    }
    setErrorMsg("");
    setSuccessMsg("");
  }, [activeTab]);

  const filteredCards = scratchCards.filter((card) => {
    if (cardFilter === "all") return true;
    return card.status === cardFilter;
  });

  const coinTxs = transactions.filter(t => t.type === "coins");
  const cashTxs = transactions.filter(t => t.type === "cashback");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* LEFT COLUMN: NAVIGATION DRAWER */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        {/* User profile Summary card */}
        <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] text-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-3">
            <Sparkles className="h-5 w-5 text-[#2563EB] animate-pulse" />
          </div>
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-[#CBD5E1] flex items-center justify-center mx-auto mb-3 shadow-md">
            <UserIcon className="h-8 w-8 text-[#2563EB]" />
          </div>
          <h3 className="font-bold font-display text-[#111827] text-base">{user.name}</h3>
          <p className="text-xs text-[#374151] font-mono mt-0.5 font-bold">{user.email}</p>
          <div className="mt-4 pt-4 border-t border-[#CBD5E1] grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-[10px] text-[#1E3A8A] font-mono tracking-wider uppercase font-bold">Coins Balance</p>
              <p className="text-sm font-bold text-[#111827] font-mono mt-0.5">{user.coinBalance}</p>
            </div>
            <div className="border-l border-[#CBD5E1]">
              <p className="text-[10px] text-[#1E3A8A] font-mono tracking-wider uppercase font-bold">Cashback Wallet</p>
              <p className="text-sm font-bold text-[#111827] font-mono mt-0.5">₹{user.cashbackBalance.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="bg-white p-2.5 rounded-2xl border border-[#CBD5E1] flex flex-col gap-1 shadow-sm">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "profile" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <UserIcon className={`h-4 w-4 ${activeTab === "profile" ? "text-white" : "text-[#2563EB]"}`} /> Account Profile
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "profile" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("cards")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "cards" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Gift className={`h-4 w-4 ${activeTab === "cards" ? "text-white" : "text-[#2563EB]"}`} /> Scratch Cards Cabinet
              {scratchCards.some(c => c.status === "pending") && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping ml-1" />
              )}
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "cards" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "orders" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className={`h-4 w-4 ${activeTab === "orders" ? "text-white" : "text-[#2563EB]"}`} /> Purchase Orders
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "orders" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("coin_wallet")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "coin_wallet" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Coins className={`h-4 w-4 ${activeTab === "coin_wallet" ? "text-white" : "text-[#2563EB]"}`} /> Coins Exchange
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "coin_wallet" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("cashback_wallet")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "cashback_wallet" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CreditCard className={`h-4 w-4 ${activeTab === "cashback_wallet" ? "text-white" : "text-[#2563EB]"}`} /> Cashback Wallet
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "cashback_wallet" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("coupons")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "coupons" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Percent className={`h-4 w-4 ${activeTab === "coupons" ? "text-white" : "text-[#2563EB]"}`} /> Active Coupons
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "coupons" ? "text-white" : "text-[#2563EB]"}`} />
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "notifications" ? "bg-[#2563EB] text-white font-bold" : "bg-transparent text-[#111827] hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Bell className={`h-4 w-4 ${activeTab === "notifications" ? "text-white" : "text-[#2563EB]"}`} /> Notifications Inbox
              {notifications.some(n => !n.isRead) && (
                <span className="bg-blue-500 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1.5">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </span>
            <ChevronRight className={`h-3.5 w-3.5 ${activeTab === "notifications" ? "text-white" : "text-[#2563EB]"}`} />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: MAIN CONTENT BODY */}
      <div className="lg:col-span-3">
        {/* Error / Success Notifications */}
        {errorMsg && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold">{errorMsg}</div>}
        {successMsg && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold">{successMsg}</div>}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-sm">
              <h3 className="text-lg font-bold font-display text-[#111827] flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-[#2563EB]" /> Account Profile Summary
              </h3>
              <p className="text-[#374151] text-xs mt-1 font-medium">
                Your registered customer account details, overall metrics, and wallet summaries.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white border border-[#CBD5E1] p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] text-[#1E3A8A] uppercase tracking-wider font-mono font-bold">Coins</span>
                  <div className="flex items-center gap-1.5 text-[#111827] font-bold font-mono text-xl mt-2">
                    <Coins className="h-5 w-5 text-[#2563EB]" /> {user.coinBalance}
                  </div>
                  <button onClick={() => setActiveTab("coin_wallet")} className="text-[11px] text-[#2563EB] font-bold font-mono mt-4 hover:underline flex items-center gap-1 transition self-start cursor-pointer">
                    Exchange Coins <ChevronRight className="h-3 w-3 text-[#2563EB]" />
                  </button>
                </div>

                <div className="bg-white border border-[#CBD5E1] p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] text-[#1E3A8A] uppercase tracking-wider font-mono font-bold">Cashback Balance</span>
                  <div className="flex items-center gap-1.5 text-[#111827] font-bold font-mono text-xl mt-2">
                    <CreditCard className="h-5 w-5 text-[#2563EB]" /> ₹{user.cashbackBalance.toFixed(2)}
                  </div>
                  <button onClick={() => setActiveTab("cashback_wallet")} className="text-[11px] text-[#2563EB] font-bold font-mono mt-4 hover:underline flex items-center gap-1 transition self-start cursor-pointer">
                    Withdraw Cashback <ChevronRight className="h-3 w-3 text-[#2563EB]" />
                  </button>
                </div>

                <div className="bg-white border border-[#CBD5E1] p-4 rounded-xl flex flex-col justify-between shadow-xs">
                  <span className="text-[10px] text-[#1E3A8A] uppercase tracking-wider font-mono font-bold">Wallet Balance</span>
                  <div className="flex items-center gap-1.5 text-[#111827] font-bold font-mono text-xl mt-2">
                    <Gift className="h-5 w-5 text-[#2563EB]" /> ₹{user.cashbackBalance.toFixed(2)}
                  </div>
                  <button onClick={() => setActiveTab("cards")} className="text-[11px] text-[#2563EB] font-bold font-mono mt-4 hover:underline flex items-center gap-1 transition self-start cursor-pointer">
                    Go to Cabinet <ChevronRight className="h-3 w-3 text-[#2563EB]" />
                  </button>
                </div>
              </div>

              {/* Account details list */}
              <div className="mt-8 border-t border-[#CBD5E1] pt-6 flex flex-col gap-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Full Name:</span>
                  <span className="text-[#111827] font-bold text-xs">{user.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">User Name:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">{user.name || user.email.split("@")[0]}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Email Address:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Phone Number:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">{(user as any).phone || "+91 9876543210"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Join Date:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Wallet Balance:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">₹{user.cashbackBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Cashback Balance:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">₹{user.cashbackBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#CBD5E1]">
                  <span className="text-[#1E3A8A] font-bold text-xs">Coins:</span>
                  <span className="text-[#111827] font-bold font-mono text-xs">{user.coinBalance} Coins</span>
                </div>
              </div>
            </div>

            {/* Quick Promo banner */}
            <div className="relative rounded-2xl bg-gradient-to-r from-blue-900 via-blue-950 to-blue-900 border border-blue-700 p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
              <div className="absolute top-0 right-0 p-4">
                <Sparkles className="h-6 w-6 text-amber-300 opacity-80 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Earn 1 Guaranteed Scratch Card on Every Purchase</h4>
                <p className="text-xs text-blue-100 mt-1 max-w-md font-medium">No matter what the order value is, complete a checkout and unlock cashback, rewards coins, high-value coupons, or a mystery gift instantly!</p>
              </div>
              <button
                onClick={() => {
                  if (onBrowseProducts) {
                    onBrowseProducts();
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="px-4 py-2 bg-white text-[#2563EB] hover:bg-blue-50 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer shadow-md"
              >
                Browse Products
              </button>
            </div>
          </div>
        )}

        {/* Scratch Cards Cabinet Tab */}
        {activeTab === "cards" && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-blue-500" /> Digital Scratch Card Cabinet
                </h3>
                <p className="text-slate-400 text-xs mt-1">Scratch cards you earned from placing successful eCommerce orders.</p>
              </div>

              {/* Filter */}
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-medium text-slate-400">
                <button
                  onClick={() => setCardFilter("all")}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${cardFilter === "all" ? "bg-slate-800 text-slate-100" : "hover:text-slate-200"}`}
                >
                  All ({scratchCards.length})
                </button>
                <button
                  onClick={() => setCardFilter("pending")}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${cardFilter === "pending" ? "bg-slate-800 text-slate-100" : "hover:text-slate-200"}`}
                >
                  Unscratched ({scratchCards.filter(c => c.status === "pending").length})
                </button>
                <button
                  onClick={() => setCardFilter("claimed")}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${cardFilter === "claimed" ? "bg-slate-800 text-slate-100" : "hover:text-slate-200"}`}
                >
                  Claimed ({scratchCards.filter(c => c.status === "claimed").length})
                </button>
              </div>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((c) => (
                <div key={c.id} className="relative bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden p-4 flex flex-col justify-between min-h-[140px] hover:border-blue-500/25 transition">
                  {c.status === "pending" && (
                    <div className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider">REWARD ID: {c.id}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded font-mono ${c.status === "pending" ? "bg-slate-800 text-blue-400 border border-slate-700" : "bg-emerald-950 text-emerald-400 border border-emerald-800/30"}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.status === "pending" ? (
                      <h4 className="text-sm font-bold font-display text-slate-200 mt-3">Guaranteed Scratch Reward Card</h4>
                    ) : (
                      <h4 className="text-sm font-bold font-display text-amber-300 mt-3 flex items-center gap-1">
                        🏆 Won: {c.rewardTitle}
                      </h4>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Issued: {new Date(c.purchaseDate).toLocaleDateString()}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Expires: {new Date(c.expiryDate).toLocaleDateString()}</span>
                    {c.status === "pending" ? (
                      <button
                        onClick={() => onTriggerScratch(c)}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        Scratch Now <Sparkles className="h-3 w-3 text-amber-300" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono font-medium">Scratched & Claimed</span>
                    )}
                  </div>
                </div>
              ))}

              {filteredCards.length === 0 && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-12 text-center text-slate-500">
                  <Gift className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">No scratch cards in this filtered category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === "orders" && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold font-display text-slate-100 mb-6 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-500" /> Your Shopping Orders
            </h3>

            <div className="flex flex-col gap-4">
              {orders.map((o) => (
                <div key={o.id} className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between md:justify-start items-center gap-3">
                      <span className="font-mono text-blue-400 font-bold text-xs">{o.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/30 uppercase tracking-wider">
                        {o.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Date: {new Date(o.createdAt).toLocaleString()}</p>

                    <div className="mt-3.5 flex flex-col gap-2">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="flex gap-2 items-center text-xs">
                          <img
                            src={getProductImageUrl(i.image)}
                            alt={i.name}
                            onError={(e) => handleImageError(e, i.name)}
                            className="h-8 w-8 object-cover rounded border border-slate-800"
                          />
                          <div>
                            <p className="font-semibold text-slate-200 line-clamp-1">{i.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{i.quantity}x @ ₹{i.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5 flex flex-col justify-between items-start md:items-end min-w-[140px]">
                    <div className="text-left md:text-right w-full">
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Checkout Total</p>
                      <p className="text-lg font-bold font-mono text-slate-200 mt-1">₹{o.total}</p>
                      <p className="text-[10px] text-emerald-400 font-mono mt-1">Payment: {o.paymentStatus}</p>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono mt-4 flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                      <MapPin className="h-3 w-3" /> Delivery Address details intact
                    </div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <ShoppingBag className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">You have not placed any orders yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coins Wallet Exchange Tab */}
        {activeTab === "coin_wallet" && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold font-display text-slate-100 mb-2 flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" /> Coins Exchange Center
            </h3>
            <p className="text-slate-400 text-xs">
              Convert your Reward Coins into Cashback wallet balance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {/* Convert Form */}
              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-xs flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Conversion Rate:</strong> 10 Coins = ₹1 Cashback. Converts must be in multiples of 10 coins.
                  </div>
                </div>

                <form onSubmit={handleConvertCoins} className="flex flex-col gap-4 mt-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">Coins to Exchange</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50, 100, 250"
                      value={coinsToConvert}
                      onChange={e => setCoinsToConvert(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-blue-500 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Convert Coins to Cashback
                  </button>
                </form>
              </div>

              {/* Coins History Logs */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Coins Ledger Logs</h4>
                <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto">
                  {coinTxs.map((t) => (
                    <div key={t.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-slate-200">{t.description}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(t.date).toLocaleString()}</p>
                      </div>
                      <span className={`font-mono font-bold ${t.action === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.action === "credit" ? "+" : "-"}
                        {t.amount}
                      </span>
                    </div>
                  ))}
                  {coinTxs.length === 0 && (
                    <p className="text-slate-500 text-xs italic">No transactions listed in history ledger</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cashback Wallet Tab */}
        {activeTab === "cashback_wallet" && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold font-display text-slate-100 mb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" /> Instant Cashback Withdrawal
            </h3>
            <p className="text-slate-400 text-xs">
              Transfer your real cashback earnings straight to your bank account via UPI.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {/* Withdraw form */}
              <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-xl">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-blue-400 text-xs flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Withdrawal rules:</strong> Minimum withdrawal value is ₹100. Verification holds up to 2-4 hours.
                  </div>
                </div>

                <form onSubmit={handleWithdrawCashback} className="flex flex-col gap-4 mt-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">Withdraw Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 100, 250, 500"
                      value={withdrawAmount}
                      onChange={e => setWithdrawAmount(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-blue-500 outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400">UPI Address ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. user@paytm"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-blue-500 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    Initiate Withdrawal
                  </button>
                </form>
              </div>

              {/* Transactions list */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Cashback Transaction Logs</h4>
                <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto">
                  {cashTxs.map((t) => (
                    <div key={t.id} className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-slate-200">{t.description}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(t.date).toLocaleString()}</p>
                      </div>
                      <span className={`font-mono font-bold ${t.action === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.action === "credit" ? "+" : "-"}
                        ₹{t.amount}
                      </span>
                    </div>
                  ))}
                  {cashTxs.length === 0 && (
                    <p className="text-slate-500 text-xs italic">No transactions listed in history ledger</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-sm">
            <h3 className="text-lg font-bold font-display text-[#111827] mb-6 flex items-center gap-2">
              <Percent className="h-5 w-5 text-[#2563EB]" /> Active Discount Coupons
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((c) => (
                <div key={c.code} className="bg-white border border-[#CBD5E1] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#DBEAFE] border border-blue-200 rounded font-mono px-3 py-1.5 text-xs font-bold text-[#2563EB]">
                      {c.code}
                    </span>
                    <span className="bg-[#DBEAFE] text-[#2563EB] text-[10px] font-bold font-mono px-2.5 py-1 rounded-md border border-blue-200">
                      {(c as any).status ? (c as any).status.toUpperCase() : "ACTIVE"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="font-bold text-[#111827] text-sm">Flat {c.discountPercent}% Discount</p>
                    <p className="text-xs text-[#374151] mt-1 font-medium">{c.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#CBD5E1] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#374151] text-[11px] font-medium">Min Purchase: </span>
                      <strong className="text-[#059669] font-bold font-mono">₹{c.minPurchase}</strong>
                    </div>
                    <div className="text-[10px] text-[#4B5563] font-mono font-medium">
                      Expiry: {new Date(c.expiryDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && (
                <p className="text-[#374151] text-xs col-span-2 text-center py-6 font-semibold">No scratch coupons unlocked yet. Place orders to find coupons!</p>
              )}
            </div>
          </div>
        )}

        {/* Notifications Inbox */}
        {activeTab === "notifications" && (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" /> Notifications Inbox
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <div key={n.id} className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex items-start gap-3 relative">
                  {!n.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                  <div className="p-2 bg-blue-950/40 border border-blue-800/25 text-blue-400 rounded-lg shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{n.title}</h4>
                    <p className="text-slate-400 text-[11px] mt-1 max-w-xl">{n.message}</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-2">{new Date(n.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-8">Inbox is empty</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
