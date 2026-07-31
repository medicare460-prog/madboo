import { User, ScratchCard, Transaction, Coupon, Notification, WinnerHistory } from "../types";

export const DEFAULT_USERS: Record<string, User> = {
  usr_admin: {
    id: "usr_admin",
    email: "admin@scratchrewards.com",
    name: "Admin User",
    role: "admin",
    coinBalance: 500,
    cashbackBalance: 100.0,
    createdAt: new Date().toISOString()
  },
  usr_customer: {
    id: "usr_customer",
    email: "customer@scratchrewards.com",
    name: "John Doe",
    role: "customer",
    coinBalance: 250,
    cashbackBalance: 25.5,
    createdAt: new Date().toISOString()
  }
};

export const INITIAL_SCRATCH_CARDS: ScratchCard[] = [
  {
    id: "sc_1",
    orderId: "ord_welcome",
    userId: "usr_customer",
    rewardType: "coins",
    rewardValue: 250,
    rewardTitle: "250 Welcome Coins",
    status: "pending",
    purchaseDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_1",
    userId: "usr_customer",
    type: "coins",
    amount: 250,
    action: "credit",
    description: "Welcome Reward bonus",
    date: new Date().toISOString()
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    code: "WELCOME10",
    discountPercent: 10,
    minPurchase: 500,
    description: "10% off for new registrations. Min purchase ₹500.",
    expiryDate: "2027-12-31T23:59:59.000Z",
    status: "active"
  },
  {
    code: "FESTIVE25",
    discountPercent: 25,
    minPurchase: 2000,
    description: "Get flat 25% off during our reward festival! Min purchase ₹2000.",
    expiryDate: "2027-12-31T23:59:59.000Z",
    status: "active"
  },
  {
    code: "SUPER50",
    discountPercent: 50,
    minPurchase: 4000,
    description: "Max savings! Get flat 50% off. Min purchase ₹4000.",
    expiryDate: "2027-12-31T23:59:59.000Z",
    status: "active"
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_1",
    userId: "usr_customer",
    title: "Welcome to Scratch Rewards! 🎉",
    message: "You have received a FREE Welcome Scratch Card in your cabinet. Go Scratch it to unlock your first reward!",
    date: new Date().toISOString(),
    isRead: false
  }
];

export const INITIAL_WINNERS: WinnerHistory[] = [
  { id: "win_1", name: "Rahul S.", rewardTitle: "₹100 Cashback", timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: "win_2", name: "Sneha P.", rewardTitle: "200 Coins", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "win_3", name: "Anita K.", rewardTitle: "Flat 20% Coupon", timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString() },
  { id: "win_4", name: "Vikram R.", rewardTitle: "500 Coins", timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString() },
  { id: "win_5", name: "Pooja M.", rewardTitle: "₹500 Cashback", timestamp: new Date(Date.now() - 72 * 60 * 1000).toISOString() }
];
