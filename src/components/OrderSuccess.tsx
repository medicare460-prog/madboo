import React from "react";
import { CheckCircle, ShoppingBag, Truck, Calendar, CreditCard, Gift, ArrowRight, Download, Receipt } from "lucide-react";
import { Order, ScratchCard } from "../types";

interface OrderSuccessProps {
  order: Order | null;
  scratchCard?: ScratchCard | null;
  onContinueShopping: () => void;
  onTrackOrder: () => void;
  onClaimScratchCard?: (card: ScratchCard) => void;
}

export const OrderSuccess: React.FC<OrderSuccessProps> = ({
  order,
  scratchCard,
  onContinueShopping,
  onTrackOrder,
  onClaimScratchCard
}) => {
  if (!order) {
    return (
      <div className="max-w-md mx-auto text-center py-16 text-slate-400">
        <p className="text-sm font-semibold">Loading your order success state...</p>
      </div>
    );
  }

  const isCOD = order.paymentMethod === "Cash on Delivery" || order.paymentMethod === "COD";
  
  // Calculate delivery date (3-5 days in future)
  const deliveryDate = new Date(order.createdAt || Date.now());
  deliveryDate.setDate(deliveryDate.getDate() + 4);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Mock receipt download trigger
  const handleDownloadInvoice = () => {
    const invoiceContent = `
========================================
     SCRATCH REWARDS ECOMMERCE INVOICE
========================================
Order ID: ${order.id}
Date: ${new Date(order.createdAt).toLocaleString()}
Customer ID: ${order.userId}
----------------------------------------
Items purchased:
${order.items.map(item => `- ${item.name} (x${item.quantity}): ₹${item.price}`).join("\n")}
----------------------------------------
Subtotal: ₹${order.subtotal}
Discounts Applied: -₹${order.discount}
Delivery Fee: ₹${order.deliveryFee}
GST (inclusive): ₹${order.gst || 0}
Total Amount: ₹${order.total}
----------------------------------------
Payment Method: ${order.paymentMethod}
Payment Status: ${order.paymentStatus}
Shipping Address:
${order.shippingAddress.fullName}
${order.shippingAddress.addressLine}, ${order.shippingAddress.city},
${order.shippingAddress.state} - ${order.shippingAddress.zipCode}
========================================
Thank you for shopping with us!
    `;
    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice-${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Visual Success Confirmation Banner */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full mb-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <CheckCircle className="h-9 w-9 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black font-display text-white tracking-tight leading-none">
          {isCOD ? "ORDER REGISTERED SUCCESSFULLY!" : "PAYMENT COMPLETED SUCCESSFULLY!"}
        </h2>
        <p className="text-slate-400 text-xs mt-2.5 max-w-md mx-auto leading-relaxed">
          {isCOD 
            ? "Your Cash on Delivery request is confirmed. Our logistics agents will verify your shipping details shortly."
            : "Your transaction was secured and processed. A payment receipt has been delivered to your email coordinates."}
        </p>
      </div>

      {/* Grid: Order summary & Reward Section */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
        
        {/* Core Order Details card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40 relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
            <span>Order Metadata Details</span>
            <span className="text-blue-500 font-bold">#{order.id}</span>
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs mb-6 font-mono">
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Payment Method</p>
              <p className="text-slate-200 font-semibold flex items-center gap-1.5 mt-1">
                <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                {order.paymentMethod}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Status Settlement</p>
              <p className={`font-semibold inline-flex px-2 py-0.5 rounded text-[10px] mt-1 ${
                order.paymentStatus === "Success" || order.paymentStatus === "Paid"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              }`}>
                {order.paymentStatus}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Expected Delivery</p>
              <p className="text-slate-200 font-semibold flex items-center gap-1.5 mt-1">
                <Truck className="h-3.5 w-3.5 text-blue-500" />
                {isCOD ? "COD Shipment (3-5 days)" : "Standard Logistics"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Logistics Handover</p>
              <p className="text-slate-200 font-semibold flex items-center gap-1.5 mt-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                {formattedDeliveryDate}
              </p>
            </div>
          </div>

          {/* Pricing Ledger summary */}
          <div className="border-t border-slate-800 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Items Total Price</span>
              <span className="font-mono text-slate-300">₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promotional Discounts Applied</span>
                <span className="font-mono">-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Standard Logistics Fee</span>
              <span className="font-mono text-slate-300">{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</span>
            </div>
            {order.gst && order.gst > 0 && (
              <div className="flex justify-between text-slate-500/80 text-[10px] italic">
                <span>Inclusive GST Tax (18%)</span>
                <span className="font-mono">₹{order.gst}</span>
              </div>
            )}
            <div className="h-px bg-slate-800 my-2" />
            <div className="flex justify-between items-baseline font-bold text-slate-100">
              <span className="text-sm">Settlement COD/Paid Amount</span>
              <span className="font-mono text-emerald-500 text-lg">₹{order.total}</span>
            </div>
          </div>

          {/* Button: Invoice Download */}
          <button
            onClick={handleDownloadInvoice}
            className="w-full mt-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold font-mono uppercase border border-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download Tax Invoice Receipt
          </button>
        </div>

        {/* Scratch Card Prize Announcement box */}
        {scratchCard && (
          <div className="bg-gradient-to-br from-blue-950/40 to-slate-900 border border-blue-800/40 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(37,99,235,0.06)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="h-14 w-14 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded-2xl flex items-center justify-center animate-pulse">
                <Gift className="h-8 w-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-500 uppercase">GAMIFIED REWARDS ACTIVE</span>
                <h4 className="text-base font-black text-slate-200 font-display mt-0.5">You Won 1 Premium Scratch Card!</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1 max-w-sm">
                  Your order automatically issued a digital reward card. Scratch it instantly to unlock guaranteed cashbacks, coin tokens, or active shopping vouchers.
                </p>
              </div>
            </div>

            {onClaimScratchCard && (
              <button
                onClick={() => onClaimScratchCard(scratchCard)}
                className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#10B981] hover:from-[#1D4ED8] hover:to-[#059669] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 uppercase tracking-wider font-mono shrink-0 shadow-lg cursor-pointer"
              >
                Scratch Reward Card <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Redirect Buttons */}
      <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
        <button
          onClick={onContinueShopping}
          className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
        >
          <ShoppingBag className="h-4 w-4 text-slate-400" /> Continue Catalog Browsing
        </button>
        <button
          onClick={onTrackOrder}
          className="flex-1 py-3 bg-gradient-to-r from-[#2563EB] to-[#10B981] hover:from-[#1D4ED8] hover:to-[#059669] text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
        >
          <Truck className="h-4 w-4" /> Go to My Orders Dashboard
        </button>
      </div>
    </div>
  );
};
