"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Box, DollarSign, AlertTriangle, Clock, TrendingUp, MapPin, BarChart3, History, LayoutPanelLeft, FileSpreadsheet, Search, ArrowUpDown } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function InventoryIntelligenceReportPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("reorder");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [inactivityDays, setInactivityDays] = useState(60);
  const [sortBy, setSortBy] = useState<"gap-desc" | "stock-asc" | "value-desc">("gap-desc");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, salesRes, purRes, catsRes] = await Promise.all([
        fetch('/api/items?t=' + Date.now()),
        fetch('/api/sales'),
        fetch('/api/purchases'),
        fetch('/api/categories')
      ]);
      const [itemsJson, salesJson, purJson, catsJson] = await Promise.all([
        itemsRes.json(),
        salesRes.json(),
        purRes.json(),
        catsRes.json()
      ]);
      if (itemsJson.ok && Array.isArray(itemsJson.data)) setItems(itemsJson.data);
      if (salesJson.ok && Array.isArray(salesJson.data)) setSales(salesJson.data);
      if (purJson.ok && Array.isArray(purJson.data)) setPurchases(purJson.data);
      if (catsJson.ok && Array.isArray(catsJson.data)) setCategories(catsJson.data);
    } catch (e) {
      console.error("Error fetching intelligence data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Items Below Reorder
  const reorderAlertsList = useMemo(() => {
    const rawList = items
      .filter(item => {
        const stock = Number(item.stockQtyCartons) || 0;
        const reorder = Number(item.reorderLevel) || 0;
        // Low stock condition: explicit reorder level reached, or stock <= 0
        return (reorder > 0 && stock <= reorder) || stock <= 0;
      })
      .map(item => {
        const stock = Number(item.stockQtyCartons) || 0;
        const reorder = Number(item.reorderLevel) || 0;
        // Stock gap is the positive amount needed to restore safe stock
        const gap = reorder > stock ? reorder - stock : (stock <= 0 ? Math.abs(stock) + (reorder || 5) : 0);
        const cat = categories.find(c => String(c._id || c.id) === String(item.mainCategoryId))?.name || item.category || "General";
        
        let severity = "Low";
        if (stock <= 0) severity = "Critical";
        else if (gap >= 15) severity = "High";
        else if (gap >= 5) severity = "Medium";

        return {
          ...item,
          stock,
          reorderLevel: reorder,
          stockGap: gap,
          categoryName: cat,
          severity,
          value: stock * (Number(item.purchaseRate) || 0),
          recommendedOrder: gap + (reorder > 0 ? Math.ceil(reorder * 0.2) : 10)
        };
      });

    // Apply Filters & Search
    return rawList
      .filter(row => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (row.name?.toLowerCase().includes(q) || row.code?.toLowerCase().includes(q));
        const matchesCat = selectedCategory === "All" || row.categoryName === selectedCategory || row.category === selectedCategory;
        const matchesSeverity = selectedSeverity === "All" || row.severity === selectedSeverity;
        return matchesSearch && matchesCat && matchesSeverity;
      })
      .sort((a, b) => {
        if (sortBy === "gap-desc") return b.stockGap - a.stockGap;
        if (sortBy === "stock-asc") return a.stock - b.stock;
        if (sortBy === "value-desc") return b.value - a.value;
        return 0;
      });
  }, [items, categories, searchQuery, selectedCategory, selectedSeverity, sortBy]);

  // Compute Dead Stock with sensible logic
  const deadStockList = useMemo(() => {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - inactivityDays);

    return items
      .filter(item => {
        const stock = Number(item.stockQtyCartons) || 0;
        if (stock <= 0) return false;

        // Check item creation date - if the item was added recently, it cannot be considered dead stock
        const createdAt = item.createdAt ? new Date(item.createdAt) : null;
        if (createdAt && createdAt > thresholdDate) {
          return false;
        }

        // Find last sale timestamp
        let lastSaleTime = 0;
        sales.forEach(s => {
          if ((s.lines || []).some((l: any) => (l.itemId?._id || l.itemId) === (item._id || item.id))) {
            const t = new Date(s.date || s.createdAt).getTime();
            if (t > lastSaleTime) lastSaleTime = t;
          }
        });

        // Find last purchase timestamp
        let lastPurTime = 0;
        purchases.forEach(p => {
          if ((p.lines || []).some((l: any) => (l.itemId?._id || l.itemId) === (item._id || item.id))) {
            const t = new Date(p.date || p.createdAt).getTime();
            if (t > lastPurTime) lastPurTime = t;
          }
        });

        const thresholdTime = thresholdDate.getTime();
        // If there was activity within the threshold window, it is NOT dead stock
        if (lastSaleTime > 0 && lastSaleTime > thresholdTime) return false;
        if (lastPurTime > 0 && lastPurTime > thresholdTime) return false;

        const latestTime = Math.max(lastSaleTime, lastPurTime, createdAt ? createdAt.getTime() : 0);
        const daysInactive = latestTime > 0
          ? Math.floor((Date.now() - latestTime) / (1000 * 3600 * 24))
          : inactivityDays;

        (item as any)._lastMovementStr = latestTime > 0 ? new Date(latestTime).toLocaleDateString() : "No movement recorded";
        (item as any)._daysInactive = daysInactive;
        (item as any)._deadStockVal = stock * (Number(item.purchaseRate) || 0);

        return true;
      })
      .filter(item => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (item.name?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q));
        const cat = categories.find(c => String(c._id || c.id) === String(item.mainCategoryId))?.name || item.category || "General";
        const matchesCat = selectedCategory === "All" || cat === selectedCategory;
        return matchesSearch && matchesCat;
      });
  }, [items, sales, purchases, categories, inactivityDays, searchQuery, selectedCategory]);

  const totalStockValue = items.reduce((sum, item) => sum + ((item.stockQtyCartons || 0) * (item.purchaseRate || 0)), 0);
  const totalDeadStockValue = deadStockList.reduce((s, i: any) => s + (i._deadStockVal || 0), 0);

  const stats = [
    { title: "Total SKUs", value: items.length.toString(), icon: Box, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Total Stock Value", value: `Rs.${(totalStockValue / 1000).toFixed(1)}K`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Items Below Reorder", value: reorderAlertsList.length.toString(), icon: AlertTriangle, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Dead Stock Value", value: `Rs.${(totalDeadStockValue / 1000).toFixed(1)}K`, icon: Clock, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Active Categories", value: categories.length ? categories.length.toString() : "1", icon: LayoutPanelLeft, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Search Product</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or Code..."
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Categories</option>
            {categories.map((c: any) => (
              <option key={c._id || c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {activeTab === 'reorder' ? (
          <>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical (Out of Stock)</option>
                <option value="High">High (Gap ≥ 15)</option>
                <option value="Medium">Medium (Gap ≥ 5)</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sort By</label>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
              >
                <option value="gap-desc">Highest Gap (Urgent)</option>
                <option value="stock-asc">Lowest Stock First</option>
                <option value="value-desc">Highest Value</option>
              </select>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Inactivity Period</label>
            <select
              value={inactivityDays}
              onChange={(e) => setInactivityDays(Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
            >
              <option value={30}>30+ Days Inactive</option>
              <option value={60}>60+ Days Inactive</option>
              <option value={90}>90+ Days Inactive</option>
              <option value={120}>120+ Days Inactive</option>
            </select>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={() => exportToExcel(activeTab === 'reorder' ? reorderAlertsList : deadStockList, `Inventory_${activeTab}.xlsx`)}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
        >
          <Download size={14} /> Export CSV
        </button>
        <button
          onClick={printPage}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
        >
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={fetchData}
        >
          <Play size={14} /> Generate Report
        </button>
      </div>
    </div>
  );

  const Tabs = (
    <div className="flex border-b border-slate-200 dark:border-slate-800 px-4">
      <button 
        onClick={() => setActiveTab("reorder")}
        className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'reorder' ? 'border-maroon-800 text-maroon-800 bg-maroon-50/30' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <AlertTriangle size={14} /> Reorder Alerts ({reorderAlertsList.length})
      </button>
      <button 
        onClick={() => setActiveTab("dead")}
        className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'dead' ? 'border-maroon-800 text-maroon-800 bg-maroon-50/30' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <History size={14} /> Dead Stock ({deadStockList.length})
      </button>
    </div>
  );

  return (
    <ERPReportLayout
      title="Inventory Intelligence Report"
      description="Real-time analytics on stock reorder requirements, deficit calculations, and dead stock tracking."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Analytics", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(activeTab === 'reorder' ? reorderAlertsList : deadStockList, "InventoryIntelligence.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Analyzing inventory data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Tabs}
            
            <div className="px-4">
              {activeTab === 'reorder' && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Name</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">In Stock</th>
                        <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right">Reorder Level</th>
                        <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Stock Deficit (Gap)</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Severity</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reorderAlertsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                            No products currently need reordering matching your filters.
                          </td>
                        </tr>
                      ) : (
                        reorderAlertsList.map((row, i) => (
                          <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">
                              <div>{row.name}</div>
                              {row.code && <span className="text-[9px] text-slate-400 font-mono">Code: {row.code}</span>}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">{row.categoryName}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-right">
                              <span className={row.stock <= 0 ? "text-rose-600 font-black" : "text-slate-800 dark:text-slate-100"}>
                                {row.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] font-black text-amber-600 text-right bg-amber-50/20">{row.reorderLevel}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-rose-600 text-right bg-rose-50/20">
                              +{row.stockGap}
                            </td>
                            <td className="px-4 py-3 text-[11px]">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                row.severity === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                                row.severity === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {row.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-1">
                                <BarChart3 size={12} className="text-blue-500" /> Order {row.recommendedOrder} units
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'dead' && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Name</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">In Stock</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Last Movement</th>
                        <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Days Inactive</th>
                        <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Dead Stock Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {deadStockList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                            No dead stock found for the selected {inactivityDays} days inactivity criteria.
                          </td>
                        </tr>
                      ) : (
                        deadStockList.map((row: any, i) => (
                          <tr key={row._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                            <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.name}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100">{row.stockQtyCartons}</td>
                            <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">{row._lastMovementStr}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-rose-600 text-right bg-rose-50/20">{row._daysInactive} days</td>
                            <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">Rs. {Math.round(row._deadStockVal || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ERPReportLayout>
  );
}
