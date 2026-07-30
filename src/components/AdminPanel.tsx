import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Package,
  ShoppingBag,
  Settings,
  Users,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  CreditCard,
  Percent,
  RefreshCw,
  Gift,
  Coins,
  CheckCircle2,
  Truck,
  UserCheck,
  Image,
  Link,
  Upload,
  Eye,
  Star,
  Move,
  AlertCircle,
  X
} from "lucide-react";
import { Product, Order, AdminSettings, User, ScratchCard, ProductImage, getProductMainImage, handleImageError, getProductImageUrl } from "../types.js";
import { fetchWithRetry } from "../utils/api.js";

interface AdminPanelProps {
  token: string;
  onRefreshProducts: () => void;
  products: Product[];
}

export default function AdminPanel({ token, onRefreshProducts, products }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "products" | "orders" | "settings" | "users">("stats");
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states for Product Add/Edit
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pOrigPrice, setPOrigPrice] = useState("");
  const [pCategory, setPCategory] = useState<"General" | "Trending" | "Hot Deals">("General");
  const [pSubCategory, setPSubCategory] = useState<Product["subCategory"]>("Electronics");
  const [pStock, setPStock] = useState("");
  const [pImages, setPImages] = useState<ProductImage[]>([]);
  const [pWarranty, setPWarranty] = useState("");
  const [pDelivery, setPDelivery] = useState("");
  const [pSeller, setPSeller] = useState("");

  // Image upload and URL helper states
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOverActive, setDragOverActive] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetchWithRetry("/api/admin/dashboard-stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchWithRetry("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetchWithRetry("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetchWithRetry("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSettings();
    fetchOrders();
    fetchUsers();
  }, [activeTab]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await fetch("/api/admin/settings/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Admin scratch configurations saved successfully!");
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetchWithRetry(`/api/admin/products/delete/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefreshProducts();
      }
    } catch (err) {
      console.error("Delete product error:", err);
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsAddMode(false);
    setPName(prod.name);
    setPDesc(prod.description);
    setPPrice(prod.price.toString());
    setPOrigPrice(prod.originalPrice.toString());
    setPCategory(prod.category);
    setPSubCategory(prod.subCategory);
    setPStock(prod.stock.toString());
    
    // Normalize and load images
    const loadedImages: ProductImage[] = (prod.images || []).map((img, idx) => {
      if (typeof img === "string") {
        return {
          type: "url",
          url: img,
          isPrimary: idx === 0,
          name: `Image ${idx + 1}`
        };
      }
      return img;
    });
    setPImages(loadedImages);
    
    setPWarranty(prod.warranty);
    setPDelivery(prod.delivery);
    setPSeller(prod.seller);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsAddMode(true);
    setPName("");
    setPDesc("");
    setPPrice("");
    setPOrigPrice("");
    setPCategory("General");
    setPSubCategory("Electronics");
    setPStock("20");
    setPImages([]);
    setPWarranty("1 Year Standard Warranty");
    setPDelivery("Free Delivery");
    setPSeller("Scratch Authorized Partner");
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pName.trim()) {
      alert("Product Name is required.");
      return;
    }
    if (!pDesc.trim()) {
      alert("Product Description is required.");
      return;
    }
    if (!pPrice || Number(pPrice) <= 0) {
      alert("Please enter a valid Sale Price greater than 0.");
      return;
    }
    if (pImages.length === 0) {
      alert("Please upload at least one product image or add an image URL.");
      return;
    }

    const priceNum = Number(pPrice);
    const origPriceNum = pOrigPrice ? Number(pOrigPrice) : priceNum;

    const productBody = {
      name: pName.trim(),
      description: pDesc.trim(),
      price: priceNum,
      originalPrice: origPriceNum >= priceNum ? origPriceNum : priceNum,
      images: pImages,
      category: pCategory,
      subCategory: pSubCategory,
      stock: Number(pStock || 0),
      delivery: pDelivery || "Free Delivery",
      warranty: pWarranty || "1 Year Standard Warranty",
      seller: pSeller || "Scratch Authorized Merchant"
    };

    const url = isAddMode
      ? "/api/admin/products/add"
      : `/api/admin/products/edit/${editingProduct?.id}`;

    try {
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(productBody)
      });
      if (res.ok) {
        alert(isAddMode ? "Product saved successfully to the production database!" : "Product updated successfully!");
        setIsAddMode(false);
        setEditingProduct(null);
        setPImages([]);
        onRefreshProducts();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save product: ${errData.message || "Server error"}`);
      }
    } catch (err: any) {
      console.error("Save product error:", err);
      alert(`Error saving product: ${err.message || "Network error"}`);
    }
  };

  // Image Manager Helpers
  const handleAddUrlImage = () => {
    setUrlError("");
    if (!urlInput) {
      setUrlError("Please enter an image URL.");
      return;
    }

    // Validate URL format
    try {
      new URL(urlInput);
    } catch (_) {
      setUrlError("Invalid image URL. Must be a valid HTTP or HTTPS address.");
      return;
    }

    // Validate image format (.jpg, .jpeg, .png, .webp, .svg)
    const allowedExts = /\.(jpg|jpeg|png|webp|svg)(\?.*)?$/i;
    if (!allowedExts.test(urlInput)) {
      setUrlError("Invalid image URL. Supported formats: JPG, JPEG, PNG, WEBP, SVG.");
      return;
    }

    // Prevent duplicate URLs
    if (pImages.some(img => img.url.toLowerCase() === urlInput.toLowerCase())) {
      setUrlError("This image has already been added.");
      return;
    }

    // Extract filename for name property
    const filename = urlInput.substring(urlInput.lastIndexOf('/') + 1).split('?')[0] || "image.jpg";

    const newImg: ProductImage = {
      type: "url",
      url: urlInput,
      isPrimary: pImages.length === 0,
      name: filename
    };

    setPImages([...pImages, newImg]);
    setUrlInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    // Check sizes and types first
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" has an unsupported format. Supported formats: JPG, JPEG, PNG, WEBP.`);
        setUploading(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        alert(`File "${file.name}" is too large. Maximum size is 10 MB.`);
        setUploading(false);
        return;
      }
      formData.append("files", file);
    }

    try {
      const res = await fetchWithRetry("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const uploaded: ProductImage[] = data.files;

        if (replaceIndex !== undefined && replaceIndex !== null) {
          // Replace single image
          const updated = [...pImages];
          const wasPrimary = updated[replaceIndex].isPrimary;
          updated[replaceIndex] = {
            ...uploaded[0],
            isPrimary: wasPrimary
          };
          setPImages(updated);
          setReplacingIndex(null);
        } else {
          // Append multiple images
          const withPrimaryCheck = uploaded.map((img, idx) => ({
            ...img,
            isPrimary: pImages.length === 0 && idx === 0
          }));
          setPImages([...pImages, ...withPrimaryCheck]);
        }
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to upload images.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    const updated = pImages.map((img, idx) => ({
      ...img,
      isPrimary: idx === index
    }));
    setPImages(updated);
  };

  const handleRemoveImage = (index: number) => {
    const removedItem = pImages[index];
    const updated = pImages.filter((_, idx) => idx !== index);
    
    // If we removed the primary image, set another one as primary
    if (removedItem.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setPImages(updated);
  };

  // Drag and Drop Reordering States and Handlers
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...pImages];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);

    setDraggedIndex(null);
    setPImages(reordered);
  };

  const triggerReplaceFileInput = (index: number) => {
    setReplacingIndex(index);
    setTimeout(() => {
      const fileInput = document.getElementById("replace-file-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
    }, 50);
  };

  const handleModifyBalances = async (userId: string, newCoins: number, newCash: number) => {
    try {
      const res = await fetch("/api/admin/users/modify-balances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, coinAmount: newCoins, cashbackAmount: newCash })
      });
      if (res.ok) {
        alert("Balances updated!");
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight bg-gradient-to-r from-[#2563EB] to-[#10B981] bg-clip-text text-transparent">
            Admin Management Deck
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure scratch rewards, manage products, view analytic indicators and process client orders.
          </p>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchSettings();
            fetchOrders();
            fetchUsers();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-700 font-mono transition cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("stats")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "stats"
              ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Real-time Analytics
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "products"
              ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Package className="h-4 w-4" /> Product Catalog
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "orders"
              ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <ShoppingBag className="h-4 w-4" /> Client Orders
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "users"
              ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Users className="h-4 w-4" /> Users Directory
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "bg-blue-600/10 text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Settings className="h-4 w-4" /> Reward Settings
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Stats Tab */}
      {!loading && activeTab === "stats" && stats && (
        <div>
          {/* Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-mono tracking-wider uppercase">Gross Revenue</p>
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2 font-display">₹{stats.totalSales}</h3>
              <p className="text-[10px] text-emerald-500 font-mono mt-1">100% Secure Flow</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-mono tracking-wider uppercase">Order Count</p>
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                  <ShoppingBag className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2 font-display">{stats.totalOrders}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Completed Checkouts</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-mono tracking-wider uppercase">Total Customers</p>
                <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2 font-display">{stats.totalUsers}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Registered accounts</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-mono tracking-wider uppercase">Cards Handed Out</p>
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Gift className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2 font-display">{stats.totalScratchCards}</h3>
              <p className="text-[10px] text-amber-500 font-mono mt-1">1 Scratch Card Per Order</p>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-slate-800">
              <div className="flex justify-between items-start">
                <p className="text-slate-400 text-xs font-mono tracking-wider uppercase">Cards Claimed</p>
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mt-2 font-display">{stats.claimedCards}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Conversion: {stats.totalScratchCards ? Math.round((stats.claimedCards / stats.totalScratchCards) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold font-display text-slate-100 mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-500" /> Recent Activity Orders
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-slate-400 uppercase text-[10px] bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-2">Order ID</th>
                      <th className="py-3 px-2">Items</th>
                      <th className="py-3 px-2">Total</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {stats.recentOrders?.map((o: Order) => (
                      <tr key={o.id} className="hover:bg-slate-800/20">
                        <td className="py-3 px-2 font-mono text-slate-200">{o.id}</td>
                        <td className="py-3 px-2 max-w-[150px] truncate">
                          {o.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                        </td>
                        <td className="py-3 px-2 text-emerald-400 font-mono">₹{o.total}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/30">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!stats.recentOrders || stats.recentOrders.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">No recent orders yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Scratch Cards */}
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <h3 className="text-lg font-bold font-display text-slate-100 mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" /> Recent Digital Rewards Issued
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-slate-400 uppercase text-[10px] bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-2">Card ID</th>
                      <th className="py-3 px-2">Assigned Reward</th>
                      <th className="py-3 px-2">Reward Type</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {stats.recentScratchCards?.map((c: ScratchCard) => (
                      <tr key={c.id} className="hover:bg-slate-800/20">
                        <td className="py-3 px-2 font-mono text-slate-200">{c.id}</td>
                        <td className="py-3 px-2 font-medium text-amber-300">{c.rewardTitle}</td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700 uppercase">
                            {c.rewardType}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.status === "claimed"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800/30"
                                : "bg-amber-950/80 text-amber-400 border border-amber-800/30"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!stats.recentScratchCards || stats.recentScratchCards.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">No scratch cards generated yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Catalog Tab */}
      {!loading && activeTab === "products" && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" /> Catalog Products Inventory
            </h3>
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Premium Product
            </button>
          </div>

          {/* Form Modal/Section */}
          {(isAddMode || editingProduct) && (
            <form onSubmit={handleSaveProduct} className="p-5 rounded-xl bg-slate-900 border border-slate-700 mb-8 gap-4 grid grid-cols-1 md:grid-cols-2">
              <h4 className="text-md font-bold font-display text-blue-400 col-span-1 md:col-span-2 border-b border-slate-800 pb-2">
                {isAddMode ? "✨ Add New Catalog Product" : `🛠️ Edit Product: ${editingProduct?.name}`}
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Product Title</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  placeholder="e.g. VaporX Mechanical Keyboard"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {/* Product Images Management Block */}
              <div className="col-span-1 md:col-span-2 border-t border-b border-slate-800 py-6 my-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold font-display text-slate-200 flex items-center gap-2">
                    <Image className="h-4.5 w-4.5 text-blue-500" /> Product Images Gallery
                  </h5>
                  <span className="text-[10px] font-mono text-slate-500">
                    {pImages.length} image(s) added
                  </span>
                </div>

                {/* Hidden Inputs for File Upload */}
                <input
                  id="product-file-input"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(e)}
                  className="hidden"
                />
                <input
                  id="replace-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(e, replacingIndex ?? undefined)}
                  className="hidden"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Method 1: Upload from Computer */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverActive(true);
                    }}
                    onDragLeave={() => setDragOverActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const fakeEvent = {
                          target: { files: e.dataTransfer.files }
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleFileUpload(fakeEvent);
                      }
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center cursor-pointer min-h-[160px] ${
                      dragOverActive
                        ? "border-blue-500 bg-blue-600/10 text-blue-300"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60 text-slate-400"
                    }`}
                    onClick={() => document.getElementById("product-file-input")?.click()}
                  >
                    <Upload className={`h-8 w-8 mb-2 transition ${dragOverActive ? "text-blue-400 scale-110" : "text-slate-500"}`} />
                    <span className="text-xs font-semibold text-slate-300">Method 1: Upload from Computer</span>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
                      Drag & drop your files here or click to browse. Supports JPG, JPEG, PNG, WEBP up to 10 MB.
                    </p>
                    {uploading && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400 font-mono animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Uploading to server...
                      </div>
                    )}
                  </div>

                  {/* Method 2: Image URL */}
                  <div className="bg-slate-950/30 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-300">
                        <Link className="h-4 w-4 text-blue-500" /> Method 2: Add Image by URL
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                        Display catalog items using external image URLs. Enter a valid web address ending in JPG, JPEG, PNG, WEBP, or SVG.
                      </p>
                      
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => {
                            setUrlInput(e.target.value);
                            setUrlError("");
                          }}
                          placeholder="https://example.com/product-image.jpg"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-blue-500 outline-none transition"
                        />
                        {urlError && (
                          <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {urlError}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      className="w-full mt-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      + Add URL
                    </button>
                  </div>
                </div>

                {/* Gallery List (Drag and drop reordering) */}
                {pImages.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Images Gallery List</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Move className="h-3 w-3" /> Drag & drop cards to reorder display sequence
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pImages.map((img, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`relative border rounded-2xl bg-slate-950/80 p-3 flex flex-col justify-between transition group/card cursor-grab active:cursor-grabbing ${
                            img.isPrimary
                              ? "border-blue-500/80 shadow-md shadow-blue-500/5"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Image Preview Thumbnail */}
                          <div className="relative h-32 bg-slate-900 rounded-xl overflow-hidden mb-3 border border-slate-800">
                            <img
                              src={getProductImageUrl(img)}
                              alt={img.name || "Product"}
                              onError={(e) => handleImageError(e, img.name)}
                              className="w-full h-full object-cover select-none"
                              referrerPolicy="no-referrer"
                            />
                            {img.isPrimary && (
                              <span className="absolute top-2 left-2 bg-blue-600 text-white font-bold text-[9px] font-mono tracking-wide px-2 py-0.5 rounded shadow flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 fill-white" /> Primary
                              </span>
                            )}
                            <span className="absolute bottom-2 right-2 bg-slate-950/85 text-slate-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-slate-800 uppercase">
                              {img.type}
                            </span>
                          </div>

                          {/* Image details */}
                          <div className="text-left mb-3.5 px-0.5">
                            <div className="text-xs font-semibold text-slate-300 truncate max-w-full" title={img.name || img.url}>
                              {img.name || "Product Image"}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-full" title={img.url}>
                              {img.type === "upload" && img.size ? `${(img.size / (1024 * 1024)).toFixed(2)} MB` : img.url}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(index)}
                              disabled={img.isPrimary}
                              className={`py-1 rounded-lg font-semibold transition cursor-pointer ${
                                img.isPrimary
                                  ? "bg-blue-600/20 text-blue-400 cursor-not-allowed border border-transparent"
                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800"
                              }`}
                            >
                              Main Image
                            </button>

                            <button
                              type="button"
                              onClick={() => setFullscreenImageUrl(img.url)}
                              className="py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg font-semibold border border-slate-800 transition flex items-center justify-center gap-0.5"
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (img.type === "upload") {
                                  triggerReplaceFileInput(index);
                                } else {
                                  const newUrl = prompt("Enter replacement image URL:", img.url);
                                  if (newUrl) {
                                    const allowed = /\.(jpg|jpeg|png|webp|svg)/i;
                                    if (!allowed.test(newUrl)) {
                                      alert("Invalid URL. Supported formats: JPG, JPEG, PNG, WEBP, SVG.");
                                      return;
                                    }
                                    const updated = [...pImages];
                                    updated[index] = {
                                      ...updated[index],
                                      url: newUrl,
                                      name: newUrl.substring(newUrl.lastIndexOf('/') + 1).split('?')[0] || "image.jpg"
                                    };
                                    setPImages(updated);
                                  }
                                }
                              }}
                              className="py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg font-semibold border border-slate-800 transition"
                            >
                              Replace
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="py-1 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg font-semibold border border-rose-900/40 transition flex items-center justify-center gap-0.5"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                <label className="text-xs text-slate-400">Description</label>
                <textarea
                  rows={3}
                  required
                  value={pDesc}
                  onChange={e => setPDesc(e.target.value)}
                  placeholder="Detailed layout specifications, fabric details, features..."
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Sale Price (₹)</label>
                <input
                  type="number"
                  required
                  value={pPrice}
                  onChange={e => setPPrice(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Original MRP Price (₹)</label>
                <input
                  type="number"
                  required
                  value={pOrigPrice}
                  onChange={e => setPOrigPrice(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Primary Category Badge</label>
                <select
                  value={pCategory}
                  onChange={e => setPCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="General">General</option>
                  <option value="Trending">Trending</option>
                  <option value="Hot Deals">Hot Deals</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Sub-Category</label>
                <select
                  value={pSubCategory}
                  onChange={e => setPSubCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Home">Home</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Sports">Sports</option>
                  <option value="Books">Books</option>
                  <option value="Groceries">Groceries</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">In-Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={pStock}
                  onChange={e => setPStock(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Warranty</label>
                <input
                  type="text"
                  value={pWarranty}
                  onChange={e => setPWarranty(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Delivery Label</label>
                <input
                  type="text"
                  value={pDelivery}
                  onChange={e => setPDelivery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">Seller Name</label>
                <input
                  type="text"
                  value={pSeller}
                  onChange={e => setPSeller(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMode(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Catalog list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="h-32 bg-slate-950 relative overflow-hidden">
                  <img
                    src={getProductMainImage(p)}
                    alt={p.name}
                    onError={(e) => handleImageError(e, p.name)}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <span className="absolute top-2 left-2 bg-blue-600/90 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white">
                    {p.category}
                  </span>
                  <span className="absolute bottom-2 right-2 bg-slate-900/90 text-[10px] text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-800">
                    Stock: {p.stock}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm line-clamp-1">{p.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-1 uppercase">{p.subCategory}</p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-4 border-t border-slate-800 pt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-md font-bold text-emerald-400 font-mono">₹{p.price}</span>
                      <span className="text-xs text-slate-500 line-through font-mono">₹{p.originalPrice}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:text-blue-400 cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:text-red-400 cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {!loading && activeTab === "orders" && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <h3 className="text-lg font-bold font-display text-slate-100 mb-6 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" /> Manage Customer Orders
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-4 px-3">Order Details</th>
                  <th className="py-4 px-3">Shipping Address</th>
                  <th className="py-4 px-3">Amount & Payment</th>
                  <th className="py-4 px-3">Logistics Status</th>
                  <th className="py-4 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((o: Order) => (
                  <tr key={o.id} className="hover:bg-slate-800/10">
                    <td className="py-4 px-3">
                      <p className="font-mono font-bold text-blue-400">{o.id}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(o.createdAt).toLocaleString()}</p>
                      <div className="mt-2 flex flex-col gap-1 max-w-[200px]">
                        {o.items.map((i, idx) => (
                          <div key={idx} className="flex gap-1.5 items-center bg-slate-950 p-1 rounded border border-slate-800">
                            <img
                              src={getProductImageUrl(i.image)}
                              alt={i.name}
                              onError={(e) => handleImageError(e, i.name)}
                              className="h-6 w-6 object-cover rounded"
                            />
                            <span className="truncate text-[10px]">{i.quantity}x {i.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 max-w-[220px]">
                      <p className="font-bold text-slate-200">{o.shippingAddress.fullName}</p>
                      <p className="text-[10px] text-slate-400">{o.shippingAddress.phone}</p>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{o.shippingAddress.addressLine}, {o.shippingAddress.city}</p>
                    </td>
                    <td className="py-4 px-3">
                      <p className="font-mono text-slate-200 font-bold">₹{o.total}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 inline-block font-mono">
                        {o.paymentMethod}
                      </p>
                      <p className="text-[10px] text-emerald-400 mt-1 font-semibold">{o.paymentStatus} Payment</p>
                    </td>
                    <td className="py-4 px-3">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800/40 uppercase">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="flex flex-col sm:flex-row gap-1.5 justify-end">
                        <select
                          value={o.status}
                          onChange={e => handleOrderStatusUpdate(o.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] outline-none"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No customer orders placed yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Directory Tab */}
      {!loading && activeTab === "users" && (
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <h3 className="text-lg font-bold font-display text-slate-100 mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" /> Registered Customer Accounts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-4 px-3">User Profiles</th>
                  <th className="py-4 px-3">Wallet Coins Balance</th>
                  <th className="py-4 px-3">Cashback Wallet</th>
                  <th className="py-4 px-3">Action Modifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u: User) => (
                  <tr key={u.id} className="hover:bg-slate-800/10">
                    <td className="py-4 px-3">
                      <p className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                        {u.name}{" "}
                        <span className="px-1.5 py-0.2 bg-slate-800 text-[9px] font-mono text-slate-400 border border-slate-700 rounded uppercase">
                          {u.role}
                        </span>
                      </p>
                      <p className="text-slate-400 font-mono mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-1 text-amber-400 font-mono font-bold text-sm">
                        <Coins className="h-4 w-4 fill-amber-400" /> {u.coinBalance}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-1 text-blue-400 font-mono font-bold text-sm">
                        <CreditCard className="h-4 w-4" /> ₹{u.cashbackBalance.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const coin = prompt("Enter new coin balance:", u.coinBalance.toString());
                            if (coin !== null) handleModifyBalances(u.id, Number(coin), u.cashbackBalance);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-semibold border border-slate-700 rounded transition cursor-pointer"
                        >
                          Modify Coins
                        </button>
                        <button
                          onClick={() => {
                            const cash = prompt("Enter new cashback balance (₹):", u.cashbackBalance.toString());
                            if (cash !== null) handleModifyBalances(u.id, u.coinBalance, Number(cash));
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-semibold border border-slate-700 rounded transition cursor-pointer"
                        >
                          Modify Cashback
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reward Settings Tab */}
      {!loading && activeTab === "settings" && settings && (
        <form onSubmit={handleUpdateSettings} className="glass-panel p-6 rounded-xl border border-slate-800 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold font-display text-slate-100 mb-6 flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" /> Digital Scratch Card Settings
          </h3>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <h4 className="text-xs font-mono tracking-wider uppercase text-blue-400 col-span-2 border-b border-slate-800 pb-2">
              Weighted Probabilities (%) - Sum must equal 100
            </h4>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Cashback Probability</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.cashbackProb}
                onChange={e => setSettings({ ...settings, cashbackProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Coins Probability</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.coinProb}
                onChange={e => setSettings({ ...settings, coinProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Coupons Probability</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.couponProb}
                onChange={e => setSettings({ ...settings, couponProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Free Shipping Probability</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.freeShipProb}
                onChange={e => setSettings({ ...settings, freeShipProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Mystery Gift Probability</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.mysteryGiftProb}
                onChange={e => setSettings({ ...settings, mysteryGiftProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Better Luck Next Time Prob</label>
              <input
                type="number"
                required
                min={0}
                max={100}
                value={settings.betterLuckProb}
                onChange={e => setSettings({ ...settings, betterLuckProb: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="col-span-2 text-xs font-mono text-slate-500 text-right">
              Total Weight:{" "}
              <strong className="text-blue-400">
                {settings.cashbackProb +
                  settings.coinProb +
                  settings.couponProb +
                  settings.freeShipProb +
                  settings.mysteryGiftProb +
                  settings.betterLuckProb}
                %
              </strong>
            </div>

            <h4 className="text-xs font-mono tracking-wider uppercase text-blue-400 col-span-2 border-b border-slate-800 pb-2 mt-4">
              eCommerce & Reward Rules
            </h4>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Minimum Purchase Amount (₹)</label>
              <input
                type="number"
                required
                value={settings.minPurchaseAmount}
                onChange={e => setSettings({ ...settings, minPurchaseAmount: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Card Expiry (Days)</label>
              <input
                type="number"
                required
                value={settings.rewardExpiryDays}
                onChange={e => setSettings({ ...settings, rewardExpiryDays: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Daily Reward Limit</label>
              <input
                type="number"
                required
                value={settings.maxDailyRewards}
                onChange={e => setSettings({ ...settings, maxDailyRewards: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3 mt-5">
              <input
                type="checkbox"
                id="oneCard"
                checked={settings.oneCardPerOrder}
                onChange={e => setSettings({ ...settings, oneCardPerOrder: e.target.checked })}
                className="accent-blue-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="oneCard" className="text-xs text-slate-300 cursor-pointer select-none">
                Limit to exactly 1 Scratch Card per success order checkout
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800 mt-6">
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#2563EB] hover:to-[#10B981] text-white rounded-lg text-xs font-bold shadow-lg cursor-pointer"
            >
              Save Configuration Settings
            </button>
          </div>
        </form>
      )}

      {/* Fullscreen Image Lightbox */}
      {fullscreenImageUrl && (
        <div
          id="lightbox-overlay"
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4"
          onClick={() => setFullscreenImageUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-800 rounded-full border border-slate-700 text-slate-400 hover:text-white transition"
            onClick={() => setFullscreenImageUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
            <img
              src={getProductImageUrl(fullscreenImageUrl)}
              alt="Full screen preview"
              onError={(e) => handleImageError(e, "Fullscreen Preview")}
              className="max-w-full max-h-[80vh] object-contain select-none"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <p className="text-slate-400 text-xs mt-4 font-medium font-mono select-none">
            Click anywhere to close full screen preview
          </p>
        </div>
      )}
    </div>
  );
}
