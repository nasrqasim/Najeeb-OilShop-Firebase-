"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, ArrowRight, ShoppingCart, RefreshCw, Box } from "lucide-react";
import Link from "next/link";

interface LowStockItem {
  _id: string;
  name: string;
  code?: string;
  stockQtyCartons: number;
  reorderLevel: number;
  stockGap: number;
  unit?: string;
}

export default function ReorderNotificationBell({ className = "" }: { className?: string }) {
  const [itemsNeedingReorder, setItemsNeedingReorder] = useState<LowStockItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/items?t=${Date.now()}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        const lowStock: LowStockItem[] = json.data
          .filter((item: any) => {
            const stock = Number(item.stockQtyCartons) || 0;
            const reorder = Number(item.reorderLevel) || 0;
            return (reorder > 0 && stock <= reorder) || stock <= 0;
          })
          .map((item: any) => {
            const stock = Number(item.stockQtyCartons) || 0;
            const reorder = Number(item.reorderLevel) || 0;
            const gap = reorder > stock ? reorder - stock : (stock <= 0 ? Math.abs(stock) + (reorder || 5) : 0);
            return {
              _id: item._id || item.id,
              name: item.name,
              code: item.code,
              stockQtyCartons: stock,
              reorderLevel: reorder,
              stockGap: gap,
              unit: item.unit || "Cartons"
            };
          });

        setItemsNeedingReorder(lowStock);
      }
    } catch (e) {
      console.error("Error fetching low stock notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStockItems();
    // Periodic check every 60 seconds
    const interval = setInterval(fetchLowStockItems, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const count = itemsNeedingReorder.length;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={count > 0 ? `${count} items need reordering` : "No low stock alerts"}
        className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all focus:outline-none"
      >
        <Bell size={20} className={count > 0 ? "animate-pulse" : ""} />

        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-rose-600/40 ring-2 ring-maroon-900 animate-bounce">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Quick View Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-maroon-900 to-maroon-800 text-white">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Reorder Alerts</h3>
                <p className="text-[10px] text-maroon-200 font-bold">
                  {count === 1 ? "1 item needs reordering" : `${count} items need reordering`}
                </p>
              </div>
            </div>
            <button
              onClick={fetchLowStockItems}
              disabled={loading}
              title="Refresh alerts"
              className="p-1 hover:bg-white/10 rounded-lg text-maroon-200 hover:text-white transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Items List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {count === 0 ? (
              <div className="py-8 px-4 text-center">
                <Box size={32} className="mx-auto text-emerald-500 mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All Stocks Sufficient</p>
                <p className="text-[10px] text-slate-400 mt-0.5">No products currently at or below reorder level.</p>
              </div>
            ) : (
              itemsNeedingReorder.map((item) => (
                <div
                  key={item._id}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>
                    </div>
                    {item.code && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Code: {item.code}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        In Stock: <span className={item.stockQtyCartons <= 0 ? "text-rose-600 font-black" : "text-slate-900 dark:text-white"}>{item.stockQtyCartons}</span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        Min: {item.reorderLevel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-lg text-[10px] font-black">
                      Gap: +{item.stockGap}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Action Links */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <Link
              href="/reports/inventory/intelligence"
              onClick={() => setIsOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold transition-all text-center"
            >
              <span>View Report</span>
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/purchases/purchase-order"
              onClick={() => setIsOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl text-[11px] font-bold shadow-sm shadow-maroon-900/20 transition-all text-center"
            >
              <ShoppingCart size={12} />
              <span>New Order</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
