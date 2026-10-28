"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Package, Hash, DollarSign, TrendingUp, Box, FileSpreadsheet, RotateCcw, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ItemSaleAnalysisReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, itemsRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/items')
        ]);
        const [salesJson, itemsJson] = await Promise.all([
          salesRes.json(),
          itemsRes.json()
        ]);

        const itemsList = itemsJson.ok && Array.isArray(itemsJson.data) ? itemsJson.data : [];
        setCatalogItems(itemsList);

        const cats = Array.from(new Set(itemsList.map((i: any) => i.category).filter(Boolean))) as string[];
        setCategories(cats);

        if (salesJson.ok && Array.isArray(salesJson.data)) {
          setRawSales(salesJson.data);
          processItemSales(salesJson.data, itemsList, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            selectedCategory: "All",
            taxFilter: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching item analysis:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processItemSales(sales: any[], itemsList: any[], filters: any) {
    const itemMapById: Record<string, any> = {};
    const itemMapByName: Record<string, any> = {};
    itemsList.forEach((it: any) => {
      if (it._id) itemMapById[String(it._id)] = it;
      if (it.id) itemMapById[String(it.id)] = it;
      if (it.name) itemMapByName[it.name.trim().toLowerCase()] = it;
      if (it.code) itemMapByName[it.code.trim().toLowerCase()] = it;
    });

    let filteredSales = sales.filter((s: any) => {
      if (s.date) {
        const d = s.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }
      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return false;
      }
      return true;
    });

    const itemAggMap: Record<string, any> = {};

    filteredSales.forEach((s: any) => {
      const isReturn = s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return';
      const factor = isReturn ? -1 : 1;

      (s.lines || []).forEach((line: any) => {
        const rawItemId = line.itemId?._id || line.itemId?.id || line.itemId;
        const rawItemIdStr = rawItemId ? String(rawItemId) : "";
        const desc = (line.description || line.itemName || line.name || "").trim();

        const catalogMatch = itemMapById[rawItemIdStr] || itemMapByName[desc.toLowerCase()] || (typeof line.itemId === 'object' ? line.itemId : null);

        const code = catalogMatch?.code || line.itemCode || line.code || (rawItemIdStr ? `ITM-${rawItemIdStr.slice(-4)}` : "GEN-01");
        const name = catalogMatch?.name || desc || line.itemName || "General Item";
        const category = catalogMatch?.category || line.category || "General";
        const unit = catalogMatch?.unit || line.unit || "Unit";

        if (filters.selectedCategory !== "All" && category !== filters.selectedCategory) {
          return;
        }

        const rawQty = line.quantity ?? line.qty ?? line.liters ?? line.gallons;
        const qty = Number(rawQty !== undefined && rawQty !== null ? rawQty : (line.cartons ? line.cartons * (catalogMatch?.packSize || 1) : 1)) || 0;
        const rate = Number(line.rate ?? line.unitPrice ?? line.price ?? 0);
        const netAmt = Number(line.netAmount ?? line.total ?? line.amount ?? (qty * rate)) || 0;

        if (!itemAggMap[code]) {
          itemAggMap[code] = {
            id: code,
            itemCode: code,
            itemName: name,
            category: category,
            unit: unit,
            qtySold: 0,
            qtyReturned: 0,
            totalRevenue: 0
          };
        }

        if (isReturn) {
          itemAggMap[code].qtyReturned += qty;
        } else {
          itemAggMap[code].qtySold += qty;
        }
        itemAggMap[code].totalRevenue += netAmt * factor;
      });
    });

    let items = Object.values(itemAggMap).map((item: any) => {
      const netQty = item.qtySold - item.qtyReturned;
      return {
        ...item,
        netQty,
        avgPrice: netQty > 0 ? (item.totalRevenue / netQty).toFixed(2) : "0.00"
      };
    }).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      items = items.filter((i: any) => 
        i.itemName.toLowerCase().includes(q) || 
        i.itemCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    const totalRevenueSum = items.reduce((s, i) => s + i.totalRevenue, 0);
    const finalized = items.map((i: any) => ({
      ...i,
      percent: totalRevenueSum > 0 ? ((i.totalRevenue / totalRevenueSum) * 100).toFixed(1) + "%" : "0.0%",
      displayTotal: i.totalRevenue.toLocaleString()
    }));

    setData(finalized);
  }

  const handleGenerate = () => {
    processItemSales(rawSales, catalogItems, {
      dateFrom,
      dateTo,
      selectedCategory,
      taxFilter,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedCategory("All");
    setTaxFilter("All");
    setSearchQuery("");
    processItemSales(rawSales, catalogItems, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedCategory: "All",
      taxFilter: "All",
      searchQuery: ""
    });
  };

  const totalQty = data.reduce((s, i) => s + i.netQty, 0);
  const totalAmt = data.reduce((s, i) => s + i.totalRevenue, 0);

  const stats = [
    { title: "Total Items Sold", value: data.length.toString(), subtitle: "Unique items sold", icon: Hash, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Qty Sold", value: totalQty.toLocaleString(), subtitle: "Net units sold", icon: Package, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Sale Amount", value: `Rs. ${totalAmt.toLocaleString()}`, subtitle: "Net of returns", icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Avg Unit Price", value: `Rs. ${totalQty > 0 ? (totalAmt / totalQty).toFixed(0) : "0"}`, subtitle: "Weighted average", icon: TrendingUp, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</label>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax Filter</label>
          <select 
            value={taxFilter}
            onChange={(e) => setTaxFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">Both (Tax + Non-Tax)</option>
            <option value="tax">Tax Only</option>
            <option value="non-tax">Non-Tax Only</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Product</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by code, product name, or category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 shrink-0">
        <button 
          onClick={handleGenerate}
          className="px-3 py-1.5 bg-maroon-800 text-white rounded-lg text-xs font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
        >
          <Play size={14} /> Generate Report
        </button>
        <button 
          onClick={handleReset}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );

  const top10 = data.slice(0, 10).map((d) => ({
    name: d.itemName.length > 15 ? d.itemName.substring(0, 15) + "..." : d.itemName,
    value: d.totalRevenue,
  }));

  const COLORS = ['#881337', '#be123c', '#e11d48', '#fb7185', '#fda4af', '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#6366f1'];

  return (
    <ERPReportLayout
      title="Item Sale Analysis"
      description="In-depth analysis of sales performance by product, quantity sold, returns, and sales revenue."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "ItemSaleAnalysis.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Top Selling Products by Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={90} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Revenue (Rs)" fill="#881337" barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Product Revenue Share (%)</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top10}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {top10.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Product Sales Summary</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty Sold</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty Returned</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Net Qty</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Rate (Rs)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Net (Rs)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400">Loading item sale records...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400">No product sales found matching the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.itemCode}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-slate-100">{row.itemName}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500">{row.category}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-center text-slate-600 dark:text-slate-300">{row.unit}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-center text-slate-800 dark:text-slate-100">{row.qtySold}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-center text-rose-600">{row.qtyReturned}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-center text-emerald-600">{row.netQty}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-right text-slate-600 dark:text-slate-300">{row.avgPrice}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-right text-slate-900 dark:text-slate-100">{row.displayTotal}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-right text-rose-800 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">{row.percent}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={5} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} products)</td>
                    <td className="px-4 py-3 text-[11px] text-center">{data.reduce((s, r) => s + r.qtySold, 0)}</td>
                    <td className="px-4 py-3 text-[11px] text-center text-rose-600">{data.reduce((s, r) => s + r.qtyReturned, 0)}</td>
                    <td className="px-4 py-3 text-[11px] text-center text-emerald-600">{totalQty}</td>
                    <td></td>
                    <td className="px-4 py-3 text-[11px] text-right text-slate-900 dark:text-slate-100">Rs. {totalAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
