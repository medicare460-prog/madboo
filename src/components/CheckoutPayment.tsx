import { useState, useEffect } from "react";
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Building, 
  Wallet, 
  TrendingUp, 
  Truck, 
  Check, 
  Search, 
  HelpCircle, 
  Lock, 
  Loader2, 
  ChevronRight, 
  User, 
  Coins, 
  Percent, 
  Info,
  ShieldCheck,
  ArrowLeft,
  Clock
} from "lucide-react";
import { Coupon, Order, ScratchCard } from "../types.js";

interface CheckoutPaymentProps {
  cart: { productId: string; quantity: number }[];
  token: string;
  subtotal: number;
  appliedCoupon: Coupon | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onPaymentSuccess: (order: Order, scratchCard: ScratchCard) => void;
  onCancel: () => void;
  user: any;
  onRefreshAllData: () => void;
  products: any[];
}

export default function CheckoutPayment({
  cart,
  token,
  subtotal,
  appliedCoupon,
  shippingAddress,
  onPaymentSuccess,
  onCancel,
  user,
  onRefreshAllData,
  products
}: CheckoutPaymentProps) {
  // Config state
  const [gatewayConfig, setGatewayConfig] = useState<any>({
    hasRazorpay: false,
    razorpayKeyId: null,
    hasStripe: false,
    stripePublishableKey: null
  });

  // Redemption states
  const [coinDiscountEnabled, setCoinDiscountEnabled] = useState(false);
  const [walletDiscountEnabled, setWalletDiscountEnabled] = useState(false);

  // Payment method selection state
  // Methods: 'UPI_QR' | 'UPI_APPS' | 'CARDS' | 'NET_BANKING' | 'WALLETS' | 'EMI' | 'COD'
  const [paymentCategory, setPaymentCategory] = useState<string>("UPI_QR");
  const [selectedSubMethod, setSelectedSubMethod] = useState<string>("");

  // Gateway integration states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingCod, setIsCheckingCod] = useState(false);
  const [codEligibility, setCodEligibility] = useState<{ eligible: boolean; reason?: string } | null>(null);
  const [isPlacingCod, setIsPlacingCod] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [hasTimeoutError, setHasTimeoutError] = useState(false);
  
  // Custom states for complete gateways integrations
  const [errorBanner, setErrorBanner] = useState<{ title: string; message: string } | null>(null);
  const [upiQrData, setUpiQrData] = useState<{ qrUrl: string; upiLink: string; total: number; orderId: string } | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [progressText, setProgressText] = useState("Establishing secure session connection...");

  // Form states for Credit/Debit Cards
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [cardType, setCardType] = useState<string>("UNKNOWN");

  // Search filter for Net Banking
  const [nbSearchQuery, setNbSearchQuery] = useState("");

  // UPI QR states
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(300); // 5 min timer

  // Load gateway configs & check COD eligibility on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/payments/config");
        if (res.ok) {
          setGatewayConfig(await res.json());
        }
      } catch (err) {
        console.error("Failed to load payment credentials config:", err);
      }
    };

    const checkCod = async () => {
      setIsCheckingCod(true);
      try {
        const res = await fetch("/api/payments/cod-eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zipCode: shippingAddress.zipCode,
            totalAmount: total
          })
        });
        if (res.ok) {
          setCodEligibility(await res.json());
        }
      } catch (err) {
        console.error("COD check error:", err);
      } finally {
        setIsCheckingCod(false);
      }
    };

    fetchConfig();
    checkCod();
  }, [shippingAddress, coinDiscountEnabled, walletDiscountEnabled]);

  // Card detection helper
  const handleCardNumberChange = (value: string) => {
    // Format card number with spaces every 4 digits
    const cleaned = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const trimmed = cleaned.substring(0, 16);
    let formatted = "";
    for (let i = 0; i < trimmed.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += trimmed[i];
    }
    setCardNumber(formatted);

    // Detect card network
    if (trimmed.startsWith("4")) setCardType("VISA");
    else if (/^(51|52|53|54|55)/.test(trimmed)) setCardType("MASTERCARD");
    else if (/^(50|62|65|81|82)/.test(trimmed)) setCardType("RUPAY");
    else if (/^(34|37)/.test(trimmed)) setCardType("AMEX");
    else if (/^(30|36|38)/.test(trimmed)) setCardType("DINERS");
    else if (/^(35)/.test(trimmed)) setCardType("JCB");
    else setCardType("UNKNOWN");
  };

  // Timer for UPI QR Code
  useEffect(() => {
    if (upiQrData && qrSecondsLeft > 0) {
      const interval = setInterval(() => {
        setQrSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [upiQrData, qrSecondsLeft]);

  // Effect to cycle progress messages during secure payment connections
  useEffect(() => {
    if (!isProcessing) {
      setProgressText("Establishing secure session connection...");
      return;
    }
    
    const steps = [
      "Establishing secure 256-bit SSL handshake...",
      "Initiating transaction handshake protocols...",
      "Securing route packet channels with payment nodes...",
      "Contacting secure bank settlement servers...",
      "Redirecting securely to checkout terminal..."
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % steps.length;
      setProgressText(steps[index]);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handle automatic 20-second timeout for online gateways
  useEffect(() => {
    let timer: any = null;
    if (isProcessing) {
      setHasTimeoutError(false);
      timer = setTimeout(() => {
        setIsProcessing(false);
        setHasTimeoutError(true);
        setErrorBanner({
          title: "Gateway Connection Failure",
          message: "Unable to connect to payment gateway. Please try again."
        });
      }, 20000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isProcessing]);

  // Mathematical price calculations
  const mrp = cart.reduce((acc, item) => {
    const prod = products.find((p) => p.id === item.productId);
    const itemOriginalPrice = prod ? (prod.originalPrice || prod.price) : 0;
    return acc + itemOriginalPrice * item.quantity;
  }, 0);

  const promoDiscount = mrp - subtotal;
  
  const couponDiscount = appliedCoupon 
    ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) 
    : 0;

  // Coin redemption: 10 coins = ₹1 (or 100 coins = ₹10 => so coinBalance / 10). Capped at subtotal - couponDiscount.
  const coinsToRedeem = user ? Math.min(user.coinBalance, Math.floor((subtotal - couponDiscount) * 10)) : 0;
  const coinDiscountValue = coinDiscountEnabled ? Math.round(coinsToRedeem / 10) : 0;

  // Wallet Discount: Capped at subtotal - couponDiscount - coinDiscount and user cashbackBalance
  const walletDiscountValue = walletDiscountEnabled && user 
    ? Math.round(Math.min(subtotal - couponDiscount - coinDiscountValue, user.cashbackBalance)) 
    : 0;

  const totalDiscount = couponDiscount + coinDiscountValue + walletDiscountValue;
  const deliveryFee = (subtotal - totalDiscount) >= 1000 || subtotal === 0 ? 0 : 99;
  const total = Math.max(0, subtotal - totalDiscount + deliveryFee);
  
  // 18% GST Included
  const gstValue = Math.round((subtotal - totalDiscount) * 18 / 118);

  // Sub-method options lists
  const upiApps = [
    { id: "gpay", name: "Google Pay", logo: "GPay" },
    { id: "phonepe", name: "PhonePe", logo: "PhonePe" },
    { id: "paytm", name: "Paytm", logo: "Paytm" },
    { id: "bhim", name: "BHIM UPI", logo: "BHIM" },
    { id: "amazonpay", name: "Amazon Pay", logo: "APay" }
  ];

  const netBanks = [
    { id: "sbi", name: "State Bank of India (SBI)" },
    { id: "hdfc", name: "HDFC Bank" },
    { id: "icici", name: "ICICI Bank" },
    { id: "axis", name: "Axis Bank" },
    { id: "kotak", name: "Kotak Mahindra Bank" },
    { id: "canara", name: "Canara Bank" },
    { id: "pnb", name: "Punjab National Bank (PNB)" },
    { id: "indian", name: "Indian Bank" },
    { id: "bob", name: "Bank of Baroda" },
    { id: "idfc", name: "IDFC First Bank" },
    { id: "federal", name: "Federal Bank" },
    { id: "yesbank", name: "Yes Bank" }
  ];

  const filteredNetBanks = netBanks.filter((bank) =>
    bank.name.toLowerCase().includes(nbSearchQuery.toLowerCase())
  );

  const wallets = [
    { id: "paytm_wallet", name: "Paytm Wallet", description: "Direct linked wallet checkout" },
    { id: "amazon_pay_wallet", name: "Amazon Pay Balance", description: "Pay with Amazon gift cards & wallet" },
    { id: "mobikwik", name: "Mobikwik", description: "SuperCash payments & wallets" },
    { id: "freecharge", name: "Freecharge", description: "Quick rewards wallet" }
  ];

  const emiOptions = [
    { id: "cc_emi", name: "Credit Card EMI", description: "SBI, HDFC, ICICI Credit Card monthly installments" },
    { id: "no_cost", name: "No Cost EMI", description: "Available on select bank cards above ₹3,000" },
    { id: "lazypay", name: "LazyPay PayLater", description: "Buy now & pay in 15 days interest free" },
    { id: "simpl", name: "Simpl PayLater", description: "One-tap checkout with consolidated 15-day billing" }
  ];

  // Simulate a successful sandbox transaction when live API keys are missing
  const handleSimulateSandboxSuccess = async () => {
    setShowSandboxModal(false);
    setIsProcessing(true); // Show authentic connection overlay for 1.5 seconds

    setTimeout(async () => {
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
            paymentMethod: paymentCategory === "CARDS" ? "Stripe Credit Card (Sandbox)" : `Razorpay ${paymentCategory} (Sandbox)`,
            couponCode: appliedCoupon?.code,
            coinDiscountEnabled,
            walletDiscountEnabled
          })
        });

        const data = await res.json();
        if (res.ok) {
          onPaymentSuccess(data.order, data.scratchCard);
          onRefreshAllData();
        } else {
          setErrorBanner({
            title: "Simulated Checkout Failed",
            message: data.message || "An error occurred during sandbox payment simulation."
          });
        }
      } catch (err) {
        setErrorBanner({
          title: "Sandbox Connection Error",
          message: "Failed to connect to the checkout server nodes."
        });
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  // Initiate Payment Gateway order / session creation on server
  const handleInitiatePayment = async () => {
    setErrorBanner(null);

    // 1. CASH ON DELIVERY FLOW
    if (paymentCategory === "COD") {
      setIsPlacingCod(true);
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
            paymentMethod: "Cash on Delivery",
            couponCode: appliedCoupon?.code,
            coinDiscountEnabled,
            walletDiscountEnabled
          })
        });

        const data = await res.json();
        if (res.ok) {
          onPaymentSuccess(data.order, data.scratchCard);
          onRefreshAllData();
        } else {
          setErrorBanner({
            title: data.error || "COD Verification Failed",
            message: data.message || "Unable to process Cash on Delivery for this order."
          });
        }
      } catch (err) {
        setErrorBanner({
          title: "Connection Error",
          message: "Unable to contact order registration servers. Please check your network."
        });
      } finally {
        setIsPlacingCod(false);
      }
      return;
    }

    // 2. CHECK CREDENTIALS & DEFER TO ERROR BANNER IF MISSING
    if (!gatewayConfig.hasRazorpay) {
      setErrorBanner({
        title: "Missing API Keys",
        message: "Razorpay Key ID (RAZORPAY_KEY_ID) and Key Secret (RAZORPAY_KEY_SECRET) are missing or not configured in the environment variables."
      });
      return;
    }

    // 3. PROCEED WITH REAL RAZORPAY API FLOW
    setIsProcessing(true);

    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cartItems: cart,
          shippingAddress,
          couponCode: appliedCoupon?.code,
          coinDiscountEnabled,
          walletDiscountEnabled
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorBanner({
          title: data.error || "Razorpay Connection Failed",
          message: data.message || "Unable to initiate Razorpay checkout order. Check backend keys."
        });
        setIsProcessing(false);
        return;
      }

      // Dynamic Loading of Razorpay Script
      const loadRzp = () => {
        return new Promise((resolve) => {
          if ((window as any).Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadRzp();
      if (!loaded) {
        setErrorBanner({
          title: "Gateway SDK Error",
          message: "Razorpay Checkout script failed to load. Check your internet connection."
        });
        setIsProcessing(false);
        return;
      }

      const options = {
        key: gatewayConfig.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: "Scratch Rewards",
        description: `Secure checkout for Order #${data.receipt}`,
        order_id: data.order_id,
        handler: async (response: any) => {
          setIsProcessing(true);
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                orderId: data.order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              onPaymentSuccess(verifyData.order, verifyData.scratchCard);
              onRefreshAllData();
            } else {
              setErrorBanner({
                title: "Signature Verification Failed",
                message: verifyData.message || "Invalid Razorpay payment signature."
              });
            }
          } catch (verifyErr: any) {
            setErrorBanner({
              title: "Payment Capture Error",
              message: verifyErr.message || "Failed to finalize Razorpay order verification."
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: shippingAddress.fullName,
          contact: shippingAddress.phone,
          email: user?.email
        },
        theme: { color: "#7C3AED" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setErrorBanner({
              title: "Payment Cancelled",
              message: "The secure checkout session was closed without completing the payment."
            });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      
      // Hide loading overlay immediately when Checkout opens
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Initiate payment error:", err);
      setErrorBanner({
        title: "Network Connection Timeout",
        message: "A critical network error occurred while communicating with the payment gateways."
      });
      setIsProcessing(false);
    }
  };

  if (upiQrData) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-slate-200">
        {/* Full-Screen Handshake Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative h-24 w-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
              <Lock className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold font-display text-slate-100 tracking-tight">
              Verifying UPI Transaction Reference...
            </h3>
            <div className="mt-4 max-w-sm">
              <p className="text-blue-400 font-mono text-xs tracking-wider uppercase mb-1">
                NPCI Instant Settlement Secure Node
              </p>
              <p className="text-slate-300 text-sm font-medium animate-pulse">
                {progressText}
              </p>
            </div>
            <div className="mt-8 flex gap-1.5 items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce" />
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden shadow-2xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Back Button */}
          <button
            onClick={() => setUpiQrData(null)}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> CANCEL UPI
          </button>

          <div className="pt-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Dynamic UPI QR Active
            </div>

            <h3 className="text-lg font-bold font-display text-slate-100 mb-1">
              Scan & Pay with Any UPI App
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">
              Amount Due: <span className="text-emerald-500 font-extrabold text-base font-mono">₹{upiQrData.total}</span>
            </p>

            {/* QR Code Frame with Scanner Animation */}
            <div className="relative mx-auto w-60 h-60 bg-white rounded-2xl p-4 shadow-xl border border-slate-700/50 flex items-center justify-center overflow-hidden">
              <img
                src={upiQrData.qrUrl}
                alt="UPI QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 animate-bounce" style={{ top: "10%", animationDuration: "2.5s" }} />
            </div>

            {/* Countdown timer & Payment status ticker */}
            <div className="mt-6 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                <Clock className="h-4 w-4 text-blue-400" />
                Expires in: <span className="text-slate-200 font-bold">{Math.floor(qrSecondsLeft / 60)}:{(qrSecondsLeft % 60).toString().padStart(2, "0")}</span>
              </div>

              {/* Broadcast Status simulation */}
              <div className="w-full mt-4 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
                <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">UPI Log Ticker</p>
                <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                  {qrSecondsLeft % 15 < 5 ? (
                    <span>Broadcasting payment intent to BHIM UPI logs...</span>
                  ) : qrSecondsLeft % 15 < 10 ? (
                    <span>Awaiting deposit confirm of ₹{upiQrData.total}...</span>
                  ) : (
                    <span>Verifying NPCI instant settle node response...</span>
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 my-6 pt-6 text-left">
              <h4 className="text-xs font-bold text-slate-300 mb-2 font-display uppercase tracking-wider">
                Step 2: Enter Transaction/UTR ID
              </h4>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-sans">
                Once you have scanned the QR and completed the payment in your UPI App (Google Pay, PhonePe, Paytm, BHIM, etc.), enter the 12-digit UPI Ref/UTR number below to confirm.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 12-Digit UPI Ref / UTR No."
                  value={upiTransactionId}
                  onChange={(e) => setUpiTransactionId(e.target.value.replace(/[^0-9]/g, "").substring(0, 12))}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-200 font-mono text-sm focus:outline-none placeholder-slate-600"
                />
                <button
                  onClick={async () => {
                    if (upiTransactionId.length < 12) {
                      alert("Please enter a valid 12-digit UPI UTR/Reference number.");
                      return;
                    }
                    setIsProcessing(true);
                    try {
                      const res = await fetch("/api/payments/upi/verify", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          orderId: upiQrData.orderId,
                          transactionId: upiTransactionId
                        })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        onPaymentSuccess(data.order, data.scratchCard);
                        onRefreshAllData();
                      } else {
                        alert(`Verification Failed: ${data.message || data.error}`);
                      }
                    } catch (err) {
                      console.error("UPI verification error:", err);
                      alert("Failed to verify UPI payment.");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-slate-200">
      {/* Full-Screen Secure Handshake Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative h-24 w-24 mb-6 flex items-center justify-center">
            {/* Spinning glowing outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
            <Lock className="h-8 w-8 text-blue-400 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-bold font-display text-slate-100 tracking-tight">
            Connecting to Secure Payment Gateway...
          </h3>
          
          {/* Progress Indicator Dots / Steps */}
          <div className="mt-4 max-w-sm">
            <p className="text-blue-400 font-mono text-xs tracking-wider uppercase mb-1">
              Active Session Secured
            </p>
            <p className="text-slate-300 text-sm font-medium animate-pulse">
              {progressText}
            </p>
          </div>

          <div className="mt-8 flex gap-1.5 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce" />
          </div>

          <p className="text-slate-500 text-xs mt-12 max-w-xs leading-relaxed font-sans">
            Please wait while we establish a direct encrypted node connection. Do not close, refresh, or navigate away from this page.
          </p>
        </div>
      )}

      {/* 20-Second Gateway Timeout Error Overlay */}
      {hasTimeoutError && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="inline-flex items-center justify-center h-16 w-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full mb-5">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>

            <h3 className="text-lg font-black text-white font-display tracking-tight">
              Payment Gateway Connection Timeout
            </h3>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              Unable to connect to payment gateway. The communication with secure servers took longer than 20 seconds. Please choose an action below to proceed.
            </p>

            <div className="flex flex-col gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setHasTimeoutError(false);
                  setErrorBanner(null);
                  handleInitiatePayment();
                }}
                className="w-full py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md uppercase tracking-wider cursor-pointer"
              >
                Retry Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasTimeoutError(false);
                  setErrorBanner(null);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition uppercase tracking-wider"
              >
                Choose Another Payment Method
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold border border-transparent hover:border-slate-800 transition uppercase tracking-wider"
              >
                Back to Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Test Mode Simulation Modal */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in animate-duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-blue-900/40 rounded-3xl p-6 shadow-2xl overflow-hidden">
            {/* Visual branding decor */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl" />

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
              <div className="h-10 w-10 bg-blue-600/15 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                <ShieldCheck className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold font-display text-sm text-slate-100 flex items-center gap-1.5">
                  Secure Sandbox Test Terminal
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">
                  Simulation Active
                </p>
              </div>
            </div>

            {/* Content description */}
            <div className="text-xs space-y-3 mb-6 leading-relaxed">
              <p className="text-slate-300">
                Live gateway API keys for <strong className="text-blue-400">{paymentCategory === "CARDS" ? "Stripe" : "Razorpay"}</strong> are not configured in this workspace environment.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono">
                <p className="text-blue-400 font-bold mb-1">🔍 Why am I seeing this?</p>
                To provide a fully operational experience, we automatically activate Sandbox Fallback. You can test the end-to-end checkout loop, trigger stock reduction, and instantly earn your scratch card.
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono">
                <span className="text-slate-400 text-[11px]">Settlement Amount:</span>
                <span className="text-sm font-black text-emerald-400">₹{total}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 font-mono">
              <button
                type="button"
                onClick={handleSimulateSandboxSuccess}
                className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer"
              >
                Simulate Successful Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  setErrorBanner({
                    title: "Sandbox Transaction Failed",
                    message: "The simulated sandbox payment was cancelled or rejected."
                  });
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs font-bold border border-slate-700 transition uppercase tracking-wider cursor-pointer"
              >
                Simulate Payment Failure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <button 
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition mb-6 font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back to Address
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Payment options container */}
        <div className="lg:col-span-7 space-y-6">
          {errorBanner && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex gap-3 text-left relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-xs font-bold text-red-200 uppercase tracking-wide">
                  {errorBanner.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {errorBanner.message}
                </p>
                <div className="pt-2 text-[10px] text-slate-400">
                  💡 <span className="font-medium">Developer Tip:</span> Ensure your API Keys are configured in your env or workspace Settings.
                </div>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-slate-500 hover:text-slate-300 self-start text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
          )}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
            <h3 className="text-base font-bold font-display text-slate-100 mb-5 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" /> Select Secure Payment Method
            </h3>

            {/* Main Categories Navigation Rows */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
              <button
                onClick={() => { setPaymentCategory("UPI_QR"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "UPI_QR" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <QrCode className="h-5 w-5" />
                <span className="text-[10px] font-bold">UPI QR</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("UPI_APPS"); setSelectedSubMethod("gpay"); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "UPI_APPS" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-[10px] font-bold">UPI Apps</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("CARDS"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "CARDS" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-[10px] font-bold">Credit/Debit</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("NET_BANKING"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "NET_BANKING" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Building className="h-5 w-5" />
                <span className="text-[10px] font-bold">Net Banking</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("WALLETS"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "WALLETS" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-[10px] font-bold">Wallets</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("EMI"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 cursor-pointer ${
                  paymentCategory === "EMI" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="text-[10px] font-bold">EMI/Pay Later</span>
              </button>

              <button
                onClick={() => { setPaymentCategory("COD"); setSelectedSubMethod(""); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition gap-1.5 col-span-2 sm:col-span-2 cursor-pointer ${
                  paymentCategory === "COD" 
                    ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Truck className="h-5 w-5" />
                <span className="text-[10px] font-bold">Cash on Delivery</span>
              </button>
            </div>

            {/* CATEGORY DETAILS CONTENT */}
            <div className="border-t border-slate-800 pt-5 min-h-[220px]">
              
              {/* Category 1: UPI QR CODE */}
              {paymentCategory === "UPI_QR" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    A dynamic, encrypted UPI QR code will be generated specifically for your order amount of <span className="text-emerald-400 font-bold">₹{total}</span>.
                  </p>
                  <div className="flex flex-col items-center py-6 bg-slate-950/60 border border-slate-800 rounded-2xl">
                    <QrCode className="h-16 w-16 text-blue-500/60 animate-pulse mb-3" />
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-1">UPI Apps Supported</p>
                    <div className="flex gap-2 text-[10px] bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 font-medium text-slate-400">
                      GPay • PhonePe • Paytm • BHIM • Amazon Pay
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Clicking the "Pay & Secure Checkout" button below will generate a live secure scan code directly communicating with the NPCI gateway nodes.
                  </p>
                </div>
              )}

              {/* Category 2: UPI APPS */}
              {paymentCategory === "UPI_APPS" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium">
                    Choose your active UPI app to trigger a direct checkout overlay.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {upiApps.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedSubMethod(app.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                          selectedSubMethod === app.id 
                            ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="text-xs font-bold font-display">{app.name}</span>
                        <Check className={`h-4 w-4 rounded-full p-0.5 ${selectedSubMethod === app.id ? "bg-blue-500 text-white" : "opacity-0"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: CREDIT/DEBIT CARDS */}
              {paymentCategory === "CARDS" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium flex justify-between">
                    <span>Pay with Visa, MasterCard, RuPay, AMEX, or Diners.</span>
                    {cardType !== "UNKNOWN" && (
                      <span className="text-amber-400 font-mono text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {cardType} Detected
                      </span>
                    )}
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Card Number</label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Card Holder Name</label>
                      <input
                        type="text"
                        placeholder="Rahul Kumar"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs outline-none focus:border-blue-500 mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Expiry Month</label>
                        <input
                           type="text"
                           placeholder="MM"
                           maxLength={2}
                           value={cardExpiryMonth}
                           onChange={(e) => setCardExpiryMonth(e.target.value.replace(/\D/g, ""))}
                           className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 mt-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Expiry Year</label>
                        <input
                           type="text"
                           placeholder="YY"
                           maxLength={2}
                           value={cardExpiryYear}
                           onChange={(e) => setCardExpiryYear(e.target.value.replace(/\D/g, ""))}
                           className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 mt-1 text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">CVV / CVC</label>
                        <input
                           type="password"
                           placeholder="***"
                           maxLength={3}
                           value={cardCvv}
                           onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                           className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs font-mono outline-none focus:border-blue-500 mt-1 text-center"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="accent-blue-600 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">Save this card securely for future fast-checkout</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Category 4: NET BANKING */}
              {paymentCategory === "NET_BANKING" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search Bank (e.g. SBI, HDFC...)"
                      value={nbSearchQuery}
                      onChange={(e) => setNbSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3.5 py-2 text-slate-200 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {filteredNetBanks.map((bank) => (
                      <button
                        key={bank.id}
                        onClick={() => setSelectedSubMethod(bank.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition cursor-pointer ${
                          selectedSubMethod === bank.id 
                            ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="text-[11px] font-medium font-display leading-tight">{bank.name}</span>
                        <Check className={`h-3 w-3 rounded-full p-0.5 ${selectedSubMethod === bank.id ? "bg-blue-500 text-white" : "opacity-0"}`} />
                      </button>
                    ))}
                    {filteredNetBanks.length === 0 && (
                      <div className="col-span-2 text-center text-slate-500 text-xs py-4">No banks matched search.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Category 5: WALLETS */}
              {paymentCategory === "WALLETS" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-medium">Link & pay using major partner wallets.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedSubMethod(w.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                          selectedSubMethod === w.id 
                            ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold font-display">{w.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{w.description}</p>
                        </div>
                        <Check className={`h-4 w-4 rounded-full p-0.5 ${selectedSubMethod === w.id ? "bg-blue-500 text-white" : "opacity-0"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 6: EMI / PAY LATER */}
              {paymentCategory === "EMI" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-medium">Easy monthly payments or direct 15-day interest free bills.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {emiOptions.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelectedSubMethod(e.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                          selectedSubMethod === e.id 
                            ? "bg-blue-600/10 border-blue-500 text-blue-300" 
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold font-display">{e.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{e.description}</p>
                        </div>
                        <Check className={`h-4 w-4 rounded-full p-0.5 ${selectedSubMethod === e.id ? "bg-blue-500 text-white" : "opacity-0"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 7: CASH ON DELIVERY */}
              {paymentCategory === "COD" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium">
                    Order with zero online payment. Pay when logistics delivers at your doorstep.
                  </p>

                  {isCheckingCod ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Checking Delivery PIN Code eligibility...
                    </div>
                  ) : codEligibility ? (
                    codEligibility.eligible ? (
                      <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs rounded-xl font-medium flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 bg-emerald-950 rounded-full p-0.5" />
                        <div>
                          <p className="font-bold text-slate-100">Congratulations! Your address is eligible.</p>
                          <p className="text-[11px] text-emerald-400/80 mt-1 font-sans">
                            Cash on Delivery drops are active for PIN {shippingAddress.zipCode} (Total: ₹{total}).
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs rounded-xl font-medium flex items-start gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0 mt-0.5 bg-rose-950 rounded-full p-0.5" />
                        <div>
                          <p className="font-bold text-slate-100">COD Unavailable</p>
                          <p className="text-[11px] text-rose-400/80 mt-1 font-sans leading-relaxed">
                            {codEligibility.reason}
                          </p>
                        </div>
                      </div>
                    )
                  ) : null}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order summary & totals breakdown */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* COINS & CASHBACK BALANCES TOGGLES */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-xs text-slate-300 font-display uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" /> Redeem Rewards Balance
            </h4>

            {/* Coin balance toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Coins className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Redeem Coin Balance</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Available: {user?.coinBalance || 0} Coins (Value: ₹{Math.round((user?.coinBalance || 0) / 10)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!user || user.coinBalance < 10}
                onClick={() => setCoinDiscountEnabled(!coinDiscountEnabled)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg border transition ${
                  coinDiscountEnabled 
                    ? "bg-amber-600/10 border-amber-500 text-amber-300" 
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40"
                }`}
              >
                {coinDiscountEnabled ? "Applied" : "Apply"}
              </button>
            </div>

            {/* Wallet Cashback balance toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Wallet className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-200">Use Cashback Wallet Balance</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Available: ₹{user?.cashbackBalance?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!user || user.cashbackBalance <= 0}
                onClick={() => setWalletDiscountEnabled(!walletDiscountEnabled)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg border transition ${
                  walletDiscountEnabled 
                    ? "bg-emerald-600/10 border-emerald-500 text-emerald-300" 
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-40"
                }`}
              >
                {walletDiscountEnabled ? "Applied" : "Apply"}
              </button>
            </div>
          </div>

          {/* FINAL DETAILED BILLING CARD */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative">
            <h3 className="font-bold text-slate-200 font-display text-sm mb-4">Complete Payment Summary</h3>

            <div className="flex flex-col gap-3.5 text-xs border-t border-slate-800 pt-4">
              
              <div className="flex justify-between text-slate-400">
                <span>Maximum Retail Price (MRP)</span>
                <span className="font-mono text-slate-300">₹{mrp}</span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Product Promotion Discount</span>
                  <span className="font-mono">-₹{promoDiscount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Cart Subtotal</span>
                <span className="font-mono text-slate-200">₹{subtotal}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span className="font-mono">-₹{couponDiscount}</span>
                </div>
              )}

              {coinDiscountEnabled && coinDiscountValue > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Redeemed Coins Discount</span>
                  <span className="font-mono">-₹{coinDiscountValue}</span>
                </div>
              )}

              {walletDiscountEnabled && walletDiscountValue > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Cashback Wallet Applied</span>
                  <span className="font-mono">-₹{walletDiscountValue}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>GST Tax (18% Included)</span>
                <span className="font-mono text-slate-400">₹{gstValue}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Logistics Shipping & Handling</span>
                <span className="font-mono text-slate-200">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wide bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">FREE</span>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>

              <div className="h-px bg-slate-800 my-1" />

              <div className="flex justify-between font-bold text-slate-100 text-sm">
                <span>Grand Total Amount</span>
                <span className="font-mono text-emerald-400 text-base">₹{total}</span>
              </div>
            </div>

            {/* AUTHORIZE PAYMENT ACTION ROW */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessing || isPlacingCod || (paymentCategory === "COD" && codEligibility?.eligible === false)}
                onClick={handleInitiatePayment}
                className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing || isPlacingCod ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isPlacingCod ? "Placing Order..." : "Processing Payment..."}
                  </>
                ) : paymentCategory === "COD" ? (
                  `Confirm COD Order (₹${total})`
                ) : (
                  `Pay & Secure checkout (₹${total})`
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono select-none">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>🔒 Secure 256-Bit SSL Encrypted Gateways</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
