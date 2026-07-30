import mongoose, { Schema, Document } from "mongoose";

// Order Schema
export interface IOrder extends Document {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  scratchCardId?: string;
  paymentId?: string;
  mrp?: number;
  promoDiscount?: number;
  couponDiscount?: number;
  coinDiscount?: number;
  walletDiscount?: number;
  gst?: number;
  coinsRedeemed?: number;
}

const OrderSchema = new Schema<IOrder>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String }
    }
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, required: true },
  deliveryFee: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  paymentMethod: { type: String, required: true },
  paymentStatus: { type: String, default: "Pending" },
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  createdAt: { type: Schema.Types.Date, default: Date.now },
  scratchCardId: { type: String },
  paymentId: { type: String },
  mrp: { type: Number },
  promoDiscount: { type: Number },
  couponDiscount: { type: Number },
  coinDiscount: { type: Number },
  walletDiscount: { type: Number },
  gst: { type: Number },
  coinsRedeemed: { type: Number }
});

// Payment Schema
export interface IPayment extends Document {
  orderId: string;
  paymentId: string;
  gateway: string;
  amount: number;
  currency: string;
  status: string;
  signature?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  orderId: { type: String, required: true },
  paymentId: { type: String, required: true, unique: true },
  gateway: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, default: "Pending" },
  signature: { type: String },
  createdAt: { type: Schema.Types.Date, default: Date.now }
});

// ScratchCard Schema
export interface IScratchCard extends Document {
  id: string;
  orderId: string;
  userId: string;
  rewardType: string;
  rewardValue: string | number;
  rewardTitle: string;
  status: string;
  purchaseDate: Date;
  scratchedAt?: Date;
  expiryDate: Date;
}

const ScratchCardSchema = new Schema<IScratchCard>({
  id: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  rewardType: { type: String, required: true },
  rewardValue: { type: Schema.Types.Mixed, required: true },
  rewardTitle: { type: String, required: true },
  status: { type: String, default: "pending" },
  purchaseDate: { type: Schema.Types.Date, default: Date.now },
  scratchedAt: { type: Schema.Types.Date },
  expiryDate: { type: Schema.Types.Date, required: true }
});

export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export const ScratchCardModel = mongoose.models.ScratchCard || mongoose.model<IScratchCard>("ScratchCard", ScratchCardSchema);
