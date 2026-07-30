import React, { useState } from "react";
import {
  Search,
  ShoppingBag,
  Heart,
  Gift,
  Coins,
  CreditCard,
  Percent,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Clock,
  Home,
  ChevronRight
} from "lucide-react";
import { User, Notification, ScratchCard } from "../types.js";

interface NavbarProps {
  user: User | null;
  cartCount: number;
  onNavigate: (
    view: "catalog" | "cart" | "dashboard" | "admin" | "wishlist",
    tab?: "profile" | "cards" | "orders" | "coin_wallet" | "cashback_wallet" | "coupons" | "notifications"
  ) => void;
  onLogout: () => void;
  onTriggerLogin: () => void;
  onSearchChange: (query: string) => void;
  onCategoryFilter: (cat: string) => void;
  notifications: Notification[];
  scratchCards: ScratchCard[];
}

export default function Navbar({
  user,
  cartCount,
  onNavigate,
  onLogout,
  onTriggerLogin,
  onSearchChange,
  onCategoryFilter,
  notifications,
  scratchCards
}: NavbarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onSearchChange(searchVal);
    onNavigate("catalog");
  };

  const hasUnreadNotifs = notifications.some((n) => !n.isRead);
  const pendingScratchCards = scratchCards.filter((c) => c.status === "pending").length;

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-r from-[#172554] via-[#1E3A8A] to-[#172554] border-b border-blue-800/80 shadow-md text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div
            onClick={() => {
              onCategoryFilter("");
              onSearchChange("");
              setSearchVal("");
              setMobileMenuOpen(false);
              onNavigate("catalog");
            }}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              <Gift className="h-5 w-5 text-slate-100 fill-slate-100/10 animate-pulse" />
            </div>
            <span className="text-lg font-display font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition">
              Scratch <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10B981] to-emerald-300">Rewards</span>
            </span>
          </div>

          {/* Instant Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search premium electronics, fashion, lifestyle..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                onSearchChange(e.target.value);
              }}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-1.5 pl-4 pr-10 text-xs text-slate-300 placeholder-slate-500 outline-none focus:border-blue-500 transition font-mono"
            />
            <button type="submit" className="absolute right-3 top-2 text-slate-500 hover:text-emerald-400">
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Desktop Right Hand Section */}
          <div className="hidden lg:flex items-center gap-5">
            {/* Wallet Indicators for Customer */}
            {user && user.role === "customer" && (
              <div className="flex items-center gap-3.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 font-mono">
                {/* Coins */}
                <div
                  onClick={() => onNavigate("dashboard", "coin_wallet")}
                  className="flex items-center gap-1 cursor-pointer text-amber-400 hover:scale-102 transition"
                  title="Reward Coins Balance"
                >
                  <Coins className="h-3.5 w-3.5 fill-amber-400" />
                  <span className="text-xs font-bold">{user.coinBalance}</span>
                </div>
                {/* Partition line */}
                <span className="h-4 w-px bg-slate-800" />
                {/* Cashback */}
                <div
                  onClick={() => onNavigate("dashboard", "cashback_wallet")}
                  className="flex items-center gap-1 cursor-pointer text-[#10B981] hover:scale-102 transition"
                  title="Cashback Balance"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">₹{user.cashbackBalance.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* Cabinet link */}
            {user && user.role === "customer" && (
              <button
                onClick={() => onNavigate("dashboard", "cards")}
                className="relative p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                title="Scratch Cards Cabinet"
              >
                <Gift className="h-4.5 w-4.5" />
                {pendingScratchCards > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-rose-500 text-white font-mono text-[8px] font-extrabold flex items-center justify-center animate-bounce">
                    {pendingScratchCards}
                  </span>
                )}
              </button>
            )}

            {/* Wishlist */}
            {user && (
              <button
                onClick={() => onNavigate("wishlist")}
                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                title="Wishlist"
              >
                <Heart className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Notifications */}
            {user && (
              <button
                onClick={() => onNavigate("dashboard", "notifications")}
                className="relative p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {hasUnreadNotifs && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                )}
              </button>
            )}

            {/* Shopping Cart */}
            <button
              onClick={() => onNavigate("cart")}
              className="relative p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition"
              title="Shopping Cart"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#10B981] text-white text-[9px] font-mono font-bold h-4 w-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin Deck Badge Toggle if Admin */}
            {user && user.role === "admin" && (
              <button
                onClick={() => onNavigate("admin")}
                className="flex items-center gap-1 px-3 py-1 bg-red-950/30 border border-red-800/40 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-bold font-mono tracking-wider transition uppercase"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Admin Control
              </button>
            )}

            {/* Auth / Profile Link */}
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate("dashboard", "profile")}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-medium"
                >
                  <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="hidden xl:inline">{user.name.split(" ")[0]}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                  title="Log Out Account"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onTriggerLogin}
                className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-slate-100 text-xs font-bold rounded-lg transition shadow-md cursor-pointer"
              >
                Sign In / Join
              </button>
            )}
          </div>

          {/* Mobile Header Bar Right Section */}
          <div className="lg:hidden flex items-center gap-2">
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("dashboard", "profile");
                }}
                className="p-2 text-slate-300 hover:text-emerald-400 cursor-pointer"
                title="User Profile"
              >
                <UserIcon className="h-5 w-5 text-emerald-400" />
              </button>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("cart");
              }}
              className="relative p-2 text-slate-400 hover:text-emerald-400 cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#10B981] text-white text-[8px] font-mono font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FFFFFF] border-t border-[#CBD5E1] p-4 flex flex-col gap-2.5 font-bold text-[#0F172A] text-xs shadow-2xl relative z-50 pointer-events-auto opacity-100">
          {/* Mobile search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full mb-1">
            <input
              type="text"
              placeholder="Search items..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                onSearchChange(e.target.value);
              }}
              className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl py-2 pl-3 pr-8 text-xs text-[#0F172A] font-bold placeholder-[#64748B] outline-none focus:border-[#2563EB]"
            />
            <button type="submit" className="absolute right-2.5 top-2.5 text-[#2563EB] hover:text-blue-700">
              <Search className="h-3.5 w-3.5 text-[#2563EB]" />
            </button>
          </form>

          {/* User Profile Card Header */}
          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("dashboard", "profile");
              }}
              className="w-full flex items-center justify-between p-3 bg-[#FFFFFF] hover:bg-[#DBEAFE] rounded-xl border border-[#CBD5E1] text-left transition cursor-pointer my-1 shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-blue-50 border border-[#CBD5E1] flex items-center justify-center shrink-0">
                  <UserIcon className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] truncate">{user.name}</div>
                  <div className="text-[10px] text-[#0F172A] truncate font-mono font-bold">{user.email}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-white bg-[#2563EB] px-2.5 py-1 rounded-md shrink-0">
                Profile
              </span>
            </button>
          ) : null}

          {/* Quick Wallet Info */}
          {user && (
            <div className="grid grid-cols-2 gap-2 my-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("dashboard", "coin_wallet");
                }}
                className="flex items-center justify-between p-2.5 bg-[#F8FAFC] hover:bg-[#DBEAFE] rounded-xl border border-[#CBD5E1] text-left cursor-pointer transition shadow-sm group"
              >
                <div className="flex items-center gap-1.5 text-[#0F172A]">
                  <Coins className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span className="font-mono text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB]">{user.coinBalance}</span>
                </div>
                <span className="text-[9px] text-[#0F172A] font-bold font-mono">Coins</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("dashboard", "cashback_wallet");
                }}
                className="flex items-center justify-between p-2.5 bg-[#F8FAFC] hover:bg-[#DBEAFE] rounded-xl border border-[#CBD5E1] text-left cursor-pointer transition shadow-sm group"
              >
                <div className="flex items-center gap-1.5 text-[#0F172A]">
                  <CreditCard className="h-4 w-4 text-[#10B981] shrink-0" />
                  <span className="font-mono text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB]">₹{user.cashbackBalance.toFixed(1)}</span>
                </div>
                <span className="text-[9px] text-[#0F172A] font-bold font-mono">Cashback</span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col gap-1 border-t border-[#CBD5E1] pt-2">
            {/* Home / Browse Products */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("catalog");
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Home className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Home / Browse Products</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* Profile Link */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "profile");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Profile</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* My Orders */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "orders");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">My Orders</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* Scratch Card Cabinet */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "cards");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Gift className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Scratch Card Cabinet</span>
              </div>
              {pendingScratchCards > 0 ? (
                <span className="bg-rose-600 text-white font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">
                  {pendingScratchCards} Pending
                </span>
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              )}
            </button>

            {/* Coin Wallet */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "coin_wallet");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Coins className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Coin Wallet</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* Cashback Wallet */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "cashback_wallet");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Cashback Wallet</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* Wishlist */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("wishlist");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Wishlist</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  onNavigate("dashboard", "notifications");
                } else {
                  onTriggerLogin();
                }
              }}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#DBEAFE] text-[#0F172A] hover:text-[#2563EB] font-bold transition cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-[#2563EB] shrink-0" />
                <span className="text-[#0F172A] group-hover:text-[#2563EB] font-bold">Notifications</span>
              </div>
              {hasUnreadNotifs ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
              )}
            </button>

            {/* Admin Dashboard (if admin) */}
            {user && user.role === "admin" && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate("admin");
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 border border-red-200 text-red-600 transition cursor-pointer my-1 hover:bg-red-100 font-bold"
              >
                <div className="flex items-center gap-2.5 font-mono font-bold">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                  <span>Admin Dashboard</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-red-600 shrink-0" />
              </button>
            )}
          </div>

          {/* User Footer / Logout */}
          {user ? (
            <div className="flex justify-between items-center border-t border-[#CBD5E1] pt-3 mt-1">
              <span className="text-[11px] text-[#0F172A] font-mono font-bold truncate max-w-[180px]">
                Signed: {user.email}
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1.5 text-[#EF4444] font-bold hover:text-red-700 transition cursor-pointer py-1 px-2.5 rounded-lg hover:bg-red-50 text-xs"
              >
                <LogOut className="h-3.5 w-3.5 text-[#EF4444]" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onTriggerLogin();
              }}
              className="w-full text-center py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl mt-2 cursor-pointer shadow-md text-xs"
            >
              Sign In / Register Account
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

