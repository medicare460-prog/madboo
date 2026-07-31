import React, { useEffect, useState, useRef } from "react";
import { Zap, ShieldAlert, Award } from "lucide-react";
import { io } from "socket.io-client";

interface WinnerNotification {
  id: string;
  userName: string;
  city: string;
  rewardType: string;
  rewardValue: any;
  createdAt: string;
  pinned?: boolean;
}

export default function LiveWinnerTicker() {
  const [winners, setWinners] = useState<WinnerNotification[]>([]);
  const [scrollSpeed, setScrollSpeed] = useState<number>(25); // default scroll duration in seconds
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const socketRef = useRef<any>(null);

  const fetchWinnersAndSettings = async () => {
    try {
      // Fetch active public winners
      const res = await fetch("/api/winners");
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await res.json();
          if (Array.isArray(data)) setWinners(data);
        }
      }

      // Fetch admin scroll configuration
      const adminRes = await fetch("/api/admin/settings");
      if (adminRes.ok) {
        const contentType = adminRes.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const adminSettings = await adminRes.json();
          setIsEnabled(adminSettings.liveWinnerBarEnabled !== false);
          setScrollSpeed(adminSettings.winnerScrollSpeed || 25);
        }
      }
    } catch (e) {
      // Ignore network errors silently for live ticker
    }
  };

  useEffect(() => {
    fetchWinnersAndSettings();

    // Setup real-time Socket.IO connection
    const socketOptions = {
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 5000,
      transports: ["polling", "websocket"]
    };
    const socket = io(socketOptions);
    socketRef.current = socket;

    socket.on("new-winner", (newWinner: WinnerNotification) => {
      setWinners((prev) => {
        // Prevent duplicates
        if (prev.some((w) => w.id === newWinner.id)) return prev;
        
        const updated = [newWinner, ...prev];
        // Keep maximum 50 winners in local view
        return updated.slice(0, 50);
      });
    });

    socket.on("connect", () => {
      console.log("[Ticker] Socket.IO synced for live winners");
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  if (!isEnabled || winners.length === 0) return null;

  // Duplicate list to ensure seamless transition in continuous marquee
  const marqueeList = [...winners, ...winners];

  const formatReward = (type: string, value: any, title?: string) => {
    if (title && title !== "undefined") return title;
    if (!value || value === "undefined") {
      if (type === "cashback") return "₹100 Cashback";
      if (type === "coins") return "500 Coins";
      if (type === "coupon") return "10% Coupon";
      return "Special Reward";
    }
    if (type === "cashback") return `₹${value} Cashback`;
    if (type === "coins") return `${value} Coins`;
    if (type === "coupon") return typeof value === "string" && value.includes("%") ? `${value} Coupon` : `₹${value} OFF Coupon`;
    if (type === "free_shipping") return `Free Shipping`;
    if (type === "mystery_gift") return `Mystery Gift: ${value}`;
    return String(value);
  };

  return (
    <div 
      id="live-winner-bar"
      className="w-full bg-slate-950 border-b border-blue-900/30 text-xs py-2 relative flex items-center overflow-hidden select-none z-40"
    >
      {/* Sticky Left Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/90 border-r border-blue-800/40 text-amber-400 font-mono text-[10px] uppercase tracking-widest z-10 shrink-0 font-bold font-display shadow-lg">
        <Zap className="h-3.5 w-3.5 fill-amber-400 animate-pulse text-amber-400" />
        ⚡ Live Winner
      </div>

      {/* Marquee Wrapper */}
      <div className="w-full overflow-hidden relative flex items-center">
        <div 
          className="animate-marquee hover:[animation-play-state:paused] flex gap-12 whitespace-nowrap pl-4"
          style={{ 
            "--scroll-duration": `${scrollSpeed}s`,
            animationDuration: `${scrollSpeed}s`
          } as React.CSSProperties}
        >
          {marqueeList.map((w, index) => (
            <div 
              key={`${w.id}-${index}`} 
              className={`inline-flex items-center gap-2 text-slate-200 text-xs tracking-wide cursor-default transition duration-200 ${
                w.pinned ? "border-b border-amber-500/30 pb-0.5" : ""
              }`}
            >
              <strong className="text-blue-400 font-display">
                {w.userName || (w as any).name || "Lucky Winner"}
              </strong>
              <span className="text-slate-500 text-[10px] font-mono">
                ({w.city || "India"})
              </span>
              <span className="text-slate-400">won</span>
              <span className="font-bold text-amber-400 underline decoration-dotted decoration-amber-500/50 underline-offset-4 tracking-normal bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 font-mono">
                {formatReward(w.rewardType, w.rewardValue, (w as any).rewardTitle)}
              </span>
              {w.pinned && (
                <Award className="h-3.5 w-3.5 text-amber-500 animate-bounce ml-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Connection active dot indicator */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-[10px] text-slate-500 font-mono shrink-0 select-none border-l border-slate-900 bg-slate-950 z-10">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>LIVE</span>
      </div>
    </div>
  );
}
