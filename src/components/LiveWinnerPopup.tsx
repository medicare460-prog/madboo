import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Gift, Coins, CreditCard } from "lucide-react";

interface Winner {
  id: string;
  userName: string;
  city: string;
  rewardType: string;
  rewardValue: any;
}

const DEMO_WINNERS: Winner[] = [
  { id: "demo-1", userName: "Arjun", city: "Mumbai", rewardType: "cashback", rewardValue: 300 },
  { id: "demo-2", userName: "Sanju", city: "Bangalore", rewardType: "cashback", rewardValue: 100 },
  { id: "demo-3", userName: "Rahul", city: "Delhi", rewardType: "coins", rewardValue: 500 },
  { id: "demo-4", userName: "Priya", city: "Chennai", rewardType: "coupon", rewardValue: "20%" },
  { id: "demo-5", userName: "Amit", city: "Hyderabad", rewardType: "cashback", rewardValue: 250 },
  { id: "demo-6", userName: "Neha", city: "Pune", rewardType: "coins", rewardValue: 1000 },
  { id: "demo-7", userName: "Karan", city: "Kolkata", rewardType: "coupon", rewardValue: "15%" },
  { id: "demo-8", userName: "Ananya", city: "Ahmedabad", rewardType: "cashback", rewardValue: 500 }
];

export default function LiveWinnerPopup() {
  const [winners, setWinners] = useState<Winner[]>(DEMO_WINNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fetch live winners from API if available
    const fetchWinners = async () => {
      try {
        const res = await fetch("/api/winners");
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setWinners(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch winners in popup:", err);
      }
    };
    fetchWinners();
  }, []);

  useEffect(() => {
    if (winners.length === 0) return;

    // Toggling loop:
    // Every 8 seconds: show popup for 4.5 seconds, then hide for 3.5 seconds before showing next
    const showInterval = setInterval(() => {
      setVisible(true);
      
      // Auto-hide after 4.5 seconds
      const hideTimeout = setTimeout(() => {
        setVisible(false);
        // Move to next winner after fade animation completes
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % winners.length);
        }, 800); // Wait for fade out transition to finish
      }, 4500);

      return () => clearTimeout(hideTimeout);
    }, 8000);

    // Show initial winner shortly after mount
    const initialTimeout = setTimeout(() => {
      setVisible(true);
      const initialHide = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % winners.length);
        }, 800);
      }, 4500);
      return () => clearTimeout(initialHide);
    }, 1500);

    return () => {
      clearInterval(showInterval);
      clearTimeout(initialTimeout);
    };
  }, [winners]);

  const currentWinner = winners[currentIndex];
  if (!currentWinner) return null;

  const getRewardDisplay = (type: string, val: any, title?: string) => {
    if (title && title !== "undefined") return title;
    if (!val || val === "undefined") {
      if (type === "cashback") return "₹100 Cashback";
      if (type === "coins") return "500 Coins";
      if (type === "coupon") return "10% Coupon";
      return "Special Reward";
    }
    if (type === "cashback") return `₹${val} Cashback`;
    if (type === "coins") return `${val} Coins`;
    if (type === "coupon") return typeof val === "string" && val.includes("%") ? `${val} Coupon` : `₹${val} OFF Coupon`;
    if (type === "free_shipping") return `Free Shipping`;
    if (type === "mystery_gift") return `Mystery Gift: ${val}`;
    return String(val);
  };

  const getRewardIcon = (type: string) => {
    if (type === "cashback") return <CreditCard className="h-4 w-4 text-[#10B981]" />;
    if (type === "coins") return <Coins className="h-4 w-4 text-[#2563EB]" />;
    if (type === "coupon") return <Gift className="h-4 w-4 text-[#10B981]" />;
    return <Trophy className="h-4 w-4 text-[#2563EB]" />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="pointer-events-auto flex items-center gap-3.5 bg-white border border-[#2563EB]/25 px-4.5 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.12)] max-w-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#10B981] flex items-center justify-center shadow-md text-white shrink-0">
              <Trophy className="h-5 w-5 animate-bounce text-white" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#2563EB] font-bold">
                  Live Reward Winner
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-ping" />
              </div>
              <p className="text-xs text-slate-800 font-semibold mt-0.5">
                🎉 <span className="font-bold text-slate-950 font-display">{currentWinner.userName || (currentWinner as any).name || "Lucky Winner"}</span> from <span className="text-slate-500 text-[10px] font-mono font-normal">({currentWinner.city || "India"})</span>
              </p>
              <div className="flex items-center gap-1 mt-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 self-start">
                {getRewardIcon(currentWinner.rewardType)}
                <span className="text-[11px] font-bold text-slate-900 font-mono">
                  won {getRewardDisplay(currentWinner.rewardType, currentWinner.rewardValue, (currentWinner as any).rewardTitle)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
