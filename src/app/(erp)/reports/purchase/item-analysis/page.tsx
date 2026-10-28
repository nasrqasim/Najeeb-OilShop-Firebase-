"use client";

import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import React, { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Package, Hash, ShoppingCart, DollarSign, FileSpreadsheet, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ItemPurchaseAnalysisReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [purRes, itemsRes, catsRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/items'),
        fetch('/api/categories')
      ]);

      const [purJson, itemsJson, catsJson] = await Promise.all([
        purRes.json(),
        itemsRes.json(),
        catsRes.json()
      ]);

      const allItems = itemsJson.ok && Array.isArray(itemsJson.data) ? itemsJson.data : [];
      const allCats = catsJson.ok && Array.isArray(catsJson.data) ? catsJson.data : [];
      setItemsList(allItems);
      setCategories(allCats);

      // Create lookup maps for items
      const itemById = new Map<string, any>();
      const itemByName = new Map<string, any>();
      const catById = new Map<string, any>();

      allCats.forEach((c: any) => {
        catById.set(String(c._id || c.id), c);
      });

      allItems.forEach((i: any) => {
        itemById.set(String(i._id || i.id), i);
        if (i.code) itemById.set(String(i.code), i);
        if (i.name) itemByName.set(String(i.name).toLowerCase().trim(), i);
      });

      const purchases = purJson.ok && Array.isArray(purJson.data) ? purJson.data : [];
      const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
      const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Infinity;

      const itemAnalysisMap = new Map<string, any>();

      purchases.forEach((p: any) => {
        const pDate = new Date(p.date || p.createdAt).getTime();
        if (pDate < fromTime || pDate > toTime) return;

        const isReturn = p.type === 'purchase_return';

        (p.lines || []).forEach((line: any) => {
          const rawItemId = String(line.itemId?._id || line.itemId || line.productId || "");
          const lineDesc = String(line.description || line.name || "").trim();

          const matchedItem = itemById.get(rawItemId) || itemByName.get(lineDesc.toLowerCase());

          const itemId = matchedItem?._id || rawItemId || lineDesc || "unknown";
          const itemCode = matchedItem?.code || line.code || line.itemCode || "-";
          const itemName = matchedItem?.name || lineDesc || line.itemName || "Unknown Item";

          const mainCatId = matchedItem?.mainCategoryId || matchedItem?.categoryId;
          const catName = catById.get(String(mainCatId))?.name || matchedItem?.category || line.category || "General";
          const unit = matchedItem?.unit || line.unit || "Pcs";

          // Calculate line quantity safely across all invoice models
          const qty = Number(line.cartons || line.gallons || line.liters || line.quantity || line.qty || 1);
          // Calculate line total amount safely
          const lineTotal = Number(line.netAmount || line.total || (Number(line.rate || line.ratePerCtn || line.unitPrice || 0) * qty) || line.grossAmount || 0);

          if (!itemAnalysisMap.has(itemId)) {
            itemAnalysisMap.set(itemId, {
              id: itemId,
              itemCode,
              itemName,
              category: catName,
              unit,
              qtyPurchased: 0,
              qtyReturned: 0,
              totalAmount: 0
            });
          }

          const entry = itemAnalysisMap.get(itemId);
          if (isReturn) {
            entry.qtyReturned += qty;
            entry.totalAmount -= lineTotal;
          } else {
            entry.qtyPurchased += qty;
            entry.totalAmount += lineTotal;
          }
        });
      });

      const list = Array.from(itemAnalysisMap.values());
      const totalNetAmt = list.reduce((s, r) => s + r.totalAmount, 0);

      const processed = list.map(r => ({
        ...r,
        netQty: r.qtyPurchased - r.qtyReturned,
        avgCost: (r.qtyPurchased - r.qtyReturned) > 0 ? (r.totalAmount / (r.qtyPurchased - r.qtyReturned)).toFixed(2) : (r.totalAmount > 0 ? r.totalAmount.toFixed(2) : "0.00"),
        percent: totalNetAmt > 0 ? ((Math.max(0, r.totalAmount) / totalNetAmt) * 100).toFixed(1) + "%" : "0%"
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      setData(processed);
    } catch (error) {
      console.error("Error fetching item purchase analysis:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return data.filter(d => {
      const matchesSearch = !q || d.itemName.toLowerCase().includes(q) || d.itemCode.toLowerCase().includes(q);
      const matchesCat = selectedCategory === "All" || d.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [data, searchQuery, selectedCategory]);

  const totalItems = filteredData.length;
  const totalQty = filteredData.reduce((s, r) => s + r.netQty, 0);
  const totalAmt = filteredData.reduce((s, r) => s + r.totalAmount, 0);

  const stats = [
    { title: "Items Purchased", value: totalItems.toString(), icon: Package, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Net Qty", value: totalQty.toString(), icon: Hash, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Purchase Amount", value: `Rs. ${totalAmt.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Avg Unit Cost", value: `Rs. ${totalQty > 0 ? (totalAmt / totalQty).toFixed(2) : 0}`, icon: DollarSign, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
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
        <div className="space-y-1 flex items-end lg:col-span-2">
          <div className="relative w-full">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name or code..." 
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
        >
          <Play size={14} /> Generate Report
        </button>
      </div>
    </div>
  );

  const barData = filteredData.map(d => ({ name: d.itemName, value: d.totalAmount })).sort((a, b) => b.value - a.value).slice(0, 15);

  const pieData = Object.entries(filteredData.reduce((acc: any, curr) => {
    if (!acc[curr.category]) acc[curr.category] = 0;
    acc[curr.category] += curr.totalAmount;
    return acc;
  }, {})).map(([name, value], idx) => ({
    name: `${name}`,
    value: Number(value),
    color: ['#881337', '#be123c', '#e11d48', '#fb7185', '#fda4af'][idx % 5]
  }));

  return (
    <ERPReportLayout
      title="Item Purchase Analysis"
      description="Item-level analysis of purchased quantities, returns, average costs, and total procurement spend."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Analysis", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "ItemPurchaseAnalysis.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Code</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unit</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Qty Purchased</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Qty Returned</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Net Qty</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Avg Cost</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Total Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    Loading item purchase analysis...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    No purchase data found matching the selected dates and filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/30">{row.itemCode}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.itemName}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.category}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.unit}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.qtyPurchased}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.qtyReturned}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">{row.netQty}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 text-right">Rs. {row.avgCost}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">Rs. {row.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-rose-800 text-right bg-rose-50/30">{row.percent}</td>
                  </tr>
                ))
              )}
              {filteredData.length > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                  <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">
                    Totals ({filteredData.length} items)
                  </td>
                  <td className="px-4 py-3 text-[11px] text-right">{filteredData.reduce((s, r) => s + r.qtyPurchased, 0)}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-rose-600">{filteredData.reduce((s, r) => s + r.qtyReturned, 0)}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-emerald-600">{totalQty}</td>
                  <td className="px-4 py-3 text-[11px] text-right">-</td>
                  <td className="px-4 py-3 text-[11px] text-right text-maroon-800 dark:text-rose-400">Rs. {totalAmt.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top 15 Items by Purchase Amount</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{fontSize: 10}} />
                    <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                    <RechartsTooltip formatter={(val: any) => `Rs. ${Number(val).toLocaleString()}`} />
                    <Bar dataKey="value" name="Purchase Amount" fill="#881337" barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Purchase by Category</h3>
              <div className="h-64 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => `Rs. ${Number(val).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </ERPReportLayout>
  );
}
