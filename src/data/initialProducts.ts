import { Product } from "../types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod_1",
    name: "Chronos Neon Edition Smartwatch",
    description: "The ultimate lifestyle wrist accessory featuring a stunning 1.95-inch AMOLED curved display, real-time blood-oxygen monitoring, advanced stress analysis, and built-in premium speaker for Bluetooth calls.",
    price: 2999,
    originalPrice: 5999,
    images: [
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=600&auto=format&fit=crop",
        isPrimary: true,
        name: "Chronos Neon Smartwatch"
      },
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
        isPrimary: false,
        name: "Smartwatch Side View"
      }
    ],
    category: "Hot Deals",
    subCategory: "Electronics",
    rating: 4.8,
    reviewsCount: 124,
    stock: 45,
    delivery: "Free Delivery by Sunday",
    warranty: "1 Year Domestic Warranty",
    seller: "Chronos India Tech",
    specifications: {
      Display: '1.95" AMOLED Curved Screen',
      "Battery Life": "Up to 10 Days",
      Waterproof: "IP68 Certified",
      Sensors: "Heart Rate, SpO2, Sleep, Pedometer"
    },
    reviewsList: [
      { user: "Rahul S.", rating: 5, comment: "Absolutely marvelous battery life! Highly recommended.", date: "2026-06-15" },
      { user: "Sneha P.", rating: 4.5, comment: "Screen looks super high-end, touch response is amazing.", date: "2026-07-02" }
    ]
  },
  {
    id: "prod_2",
    name: "Vortex Spatial Audio Headphones",
    description: "Immerse yourself completely with state-of-the-art hybrid Active Noise Cancellation (up to 42dB) and full 360-degree spatial audio tracking. Crafted with memory-foam ear cushions for professional, long-duration listening sessions.",
    price: 4599,
    originalPrice: 8999,
    images: [
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
        isPrimary: true,
        name: "Vortex Headphones"
      }
    ],
    category: "Trending",
    subCategory: "Electronics",
    rating: 4.9,
    reviewsCount: 88,
    stock: 30,
    delivery: "Free Delivery tomorrow",
    warranty: "2 Years Replacement Warranty",
    seller: "Vortex Sound Labs",
    specifications: {
      "Noise Cancelling": "Hybrid ANC (42dB)",
      Playtime: "Up to 50 Hours",
      Driver: "40mm Dynamic Driver",
      Bluetooth: "Version 5.3"
    },
    reviewsList: [
      { user: "Aman V.", rating: 5, comment: "Best ANC headphones in this price category! Pure studio-grade sound.", date: "2026-07-10" }
    ]
  },
  {
    id: "prod_3",
    name: "Noir Minimalist Leather Wallet",
    description: "Handcrafted from full-grain vegetable-tanned genuine leather. Features 6 card slots, a quick-access cash sleeve, and built-in advanced RFID block security keeping your sensitive digital cards safe.",
    price: 999,
    originalPrice: 1999,
    images: [
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=600&auto=format&fit=crop",
        isPrimary: true,
        name: "Noir Wallet"
      }
    ],
    category: "General",
    subCategory: "Accessories",
    rating: 4.5,
    reviewsCount: 230,
    stock: 120,
    delivery: "Delivery in 3 days",
    warranty: "6 Months Stitching Warranty",
    seller: "Noir Craftwear",
    specifications: {
      Material: "100% Full-Grain Vegetable-Tanned Leather",
      "Card Slots": "6 Slots + 1 ID Window",
      Security: "RFID Blocking Technology",
      Dimensions: "11cm x 8cm x 1.5cm"
    },
    reviewsList: []
  },
  {
    id: "prod_4",
    name: "Aero-Knit Prime Running Shoes",
    description: "Ultra-breathable weave pattern combined with an engineered responsive air-cushion sole. Designed to absorb vertical shock and deliver maximum energy return for high-performance marathons or casual jogs.",
    price: 2499,
    originalPrice: 4999,
    images: [
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
        isPrimary: true,
        name: "Aero Running Shoes"
      }
    ],
    category: "Trending",
    subCategory: "Sports",
    rating: 4.6,
    reviewsCount: 154,
    stock: 18,
    delivery: "Free Delivery tomorrow",
    warranty: "3 Months Warranty against Manufacturing Defects",
    seller: "Aero Sports Ltd",
    specifications: {
      "Upper Material": "Fly-Knit Polyester Mesh",
      Sole: "Reactive Polymer Cushion Sole",
      Weight: "240g (Single Shoe)"
    },
    reviewsList: []
  },
  {
    id: "prod_5",
    name: "Glow Radiance Vitamin C Serum",
    description: "Infused with 15% pure ethyl ascorbic acid, vitamin E, and natural hyaluronic acid. Revitalizes dull skin tone, stimulates collagen synthesis, and diminishes blemishes for a luminous, hydrated complexion.",
    price: 699,
    originalPrice: 1299,
    images: [
      {
        type: "url",
        url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop",
        isPrimary: true,
        name: "Vitamin C Serum"
      }
    ],
    category: "Hot Deals",
    subCategory: "Beauty",
    rating: 4.4,
    reviewsCount: 310,
    stock: 75,
    delivery: "Delivery in 2 days",
    warranty: "100% Cruelty Free & Dermatologically Tested",
    seller: "Glow Aesthetics",
    specifications: {
      Volume: "30ml e",
      "Skin Type": "Suitable for All Skin Types"
    },
    reviewsList: []
  }
];
