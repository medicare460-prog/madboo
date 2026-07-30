import { useState } from "react";
import { Gift, X, Sparkles, Trophy, CheckCircle, ArrowRight } from "lucide-react";
import ScratchCardComponent from "./ScratchCardComponent.js";
import ConfettiEffect from "./ConfettiEffect.js";
import { ScratchCard } from "../types.js";

interface ScratchPopupProps {
  card: ScratchCard;
  token: string;
  onClose: () => void;
  onClaimSuccess: () => void;
}

export default function ScratchPopup({
  card,
  token,
  onClose,
  onClaimSuccess
}: ScratchPopupProps) {
  const [scratchCompleted, setScratchCompleted] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimCompleted, setClaimCompleted] = useState(false);
  const [userRewardInfo, setUserRewardInfo] = useState<any>(null);

  const handleScratchComplete = async () => {
    if (scratchCompleted) return;
    setScratchCompleted(true);

    // Call the server API to claim and log the win
    try {
      const res = await fetch(`/api/scratch-cards/${card.id}/scratch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRewardInfo(data.scratchCard);
        // Refresh global user state in parent
        onClaimSuccess();
      }
    } catch (err) {
      console.error("Error claim-scratching card:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      {/* Confetti celebration effect! */}
      <ConfettiEffect active={scratchCompleted} />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden animate-float">
        {/* Glow behind the popup */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button if skipped */}
        {!scratchCompleted && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800/60 transition"
            title="Claim Later from cabinet"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* 1. INITIAL SCRATCH STATE */}
        {!scratchCompleted ? (
          <div className="text-center flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center mb-4 shadow-xl border border-blue-400/20">
              <Gift className="h-7 w-7 text-white fill-white/10" />
            </div>

            <h2 className="text-2xl font-display font-extrabold tracking-tight text-white px-2">
              🎁 Congratulations!
            </h2>
            <p className="text-blue-400 font-display font-bold text-sm mt-1">
              You Earned One Scratch Card
            </p>
            <p className="text-slate-400 text-xs mt-2 mb-6 max-w-[280px]">
              Swipe with finger or drag mouse on the silver surface below to reveal your surprise reward!
            </p>

            {/* Canvas Scratch Component */}
            <div className="p-2 bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-inner">
              <ScratchCardComponent onComplete={handleScratchComplete} />
            </div>

            {/* Skip Option */}
            <button
              onClick={onClose}
              className="mt-6 text-xs text-slate-500 hover:text-slate-300 font-mono tracking-wide underline decoration-dotted transition"
            >
              Skip & Claim Later in Cabinet
            </button>
          </div>
        ) : (
          /* 2. REVEALED CELEBRATION STATE */
          <div className="text-center flex flex-col items-center py-4">
            <div className="relative mb-4">
              {/* Spinning Trophy background glow */}
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl scale-125 animate-pulse" />
              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-2xl relative border border-yellow-200/30">
                <Trophy className="h-10 w-10 text-slate-950 animate-bounce" />
              </div>
            </div>

            <span className="text-[10px] font-bold text-amber-400 font-mono tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              🎉 YOU WON 🎉
            </span>

            <h3 className="text-3xl font-display font-black text-slate-100 mt-4 tracking-tight">
              {card.rewardTitle}
            </h3>

            <p className="text-slate-400 text-xs mt-2 max-w-[260px]">
              Credited successfully to your reward balances profile! Start shopping or explore your ledger.
            </p>

            {/* Gift/Cashback summary item */}
            <div className="mt-6 w-full max-w-[280px] bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-left flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Rewards Synced</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Tx ID: {card.id}</p>
              </div>
            </div>

            {/* Claim and Proceed buttons */}
            <button
              onClick={onClose}
              className="mt-8 w-full max-w-[280px] py-3 bg-gradient-to-r from-[#2563EB] to-[#10B981] hover:from-[#1D4ED8] hover:to-[#059669] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/10 cursor-pointer"
            >
              Continue Shopping <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
