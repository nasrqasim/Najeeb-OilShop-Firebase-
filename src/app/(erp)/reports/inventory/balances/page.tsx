"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Box, DollarSign, ArrowUpRight, ArrowDownRight, LayoutGrid, Search, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import { useState, useEffect, useMemo } from "react";
import { lineStockQty, stockToDisplayUnits } from "@/lib/itemUnits";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function InventoryBalancesReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) setCategories(json.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCats();
  }, []);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.filter((r) => {
      const matchesSearch = !q ||
        String(r.code || "").toLowerCase().includes(q) ||
        String(r.name || "").toLowerCase().includes(q);
      const matchesCat = selectedCategory === "All" || r.category === selectedCategory;
      const matchesGrp = selectedGroup === "All" || r.group === selectedGroup || r.category === selectedGroup;
      return matchesSearch && matchesCat && matchesGrp;
    });
  }, [data, searchQuery, selectedCategory, selectedGroup]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, salesRes, purRes, catsRes] = await Promise.all([
        fetch('/api/items'),
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

      const catList = catsJson.ok && Array.isArray(catsJson.data) ? catsJson.data : [];
      if (catList.length > 0) setCategories(catList);

      if (itemsJson.ok && salesJson.ok && purJson.ok) {
        const items = itemsJson.data;
        const sales = salesJson.data;
        const purchases = purJson.data;

        const balancedData = items.map((item: any) => {
          const itemSales = sales.flatMap((s: any) => 
            (s.lines || []).filter((l: any) => (l.itemId?._id || l.itemId) === item._id)
          );
          const qtyOut = itemSales.reduce((sum: number, l: any) => sum + lineStockQty(l), 0);

          const itemPurchases = purchases.flatMap((p: any) => 
            (p.lines || []).filter((l: any) => (l.itemId?._id || l.itemId) === item._id)
          );
          const qtyIn = itemPurchases.reduce((sum: number, l: any) => sum + lineStockQty(l), 0);

          const closing = item.stockQtyCartons || 0;
          const opening = closing - qtyIn + qtyOut;

          const mainCat = catList.find((c: any) => String(c._id || c.id) === String(item.mainCategoryId));
          const subCat = catList.find((c: any) => String(c._id || c.id) === String(item.subCategoryId));
          const groupName = mainCat?.name || item.category || "General";
          const catName = subCat?.name || mainCat?.name || item.category || "General";

          return {
            id: item._id,
            code: item.code,
            name: item.name,
            group: groupName,
            category: catName,
            opening,
            in: qtyIn,
            out: qtyOut,
            closing,
            rate: item.purchaseRate || 0,
            value: closing * (item.purchaseRate || 0)
          };
        });

        setData(balancedData);
      }
    } catch (e) {
      console.error("Error fetching balance data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalOpeningValue = filteredData.reduce((s, r) => s + (r.opening * r.rate), 0);
  const totalClosingValue = filteredData.reduce((s, r) => s + r.value, 0);
  const totalQtyIn = filteredData.reduce((s, r) => s + r.in, 0);
  const totalQtyOut = filteredData.reduce((s, r) => s + r.out, 0);

  const stats = [
    { title: "Total Items", value: filteredData.length.toString(), icon: Box, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Opening Value", value: `Rs.${totalOpeningValue.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Total Qty In", value: totalQtyIn.toLocaleString(), icon: ArrowUpRight, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Qty Out", value: totalQtyOut.toLocaleString(), icon: ArrowDownRight, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Closing Value", value: `Rs.${totalClosingValue.toLocaleString()}`, icon: LayoutGrid, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Product Group</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Groups</option>
            {Array.from(new Set(data.map((d) => d.group).filter(Boolean))).map((grp: any) => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
          </select>
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
        <div className="space-y-1 flex items-end">
           <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" size={12} />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by item code or name..." className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> Export
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={loadData}
        >
          <Play size={14} /> Generate
        </button>
      </div>
    </div>
  );

  const pieData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.category]) acc[curr.category] = { name: curr.category, value: 0, color: '#881337' };
    acc[curr.category].value += curr.value;
    return acc;
  }, {})).map(([_, v]) => v);

  return (
    <ERPReportLayout
      title="Inventory Balances"
      description="Stock position summary with opening, inward, outward, and closing values."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Balances", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "InventoryBalances.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Calculating inventory balances...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Box size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No inventory data found</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Stock Balances Summary</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{filteredData.length} items</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Code</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Name</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Opening (C/G/L)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Qty In (C/G/L)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Qty Out (C/G/L)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Closing (C/G/L)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Rate</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Closing Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row: any, i: number) => {
                      // Get item conversion values
                      const item = items.find((it: any) => it._id === row.id);
                      const conversionItem = item || { gallonsInCtn: 4, litersInCtn: 16 };
                      
                      const openingDisplay = stockToDisplayUnits(row.opening, conversionItem);
                      const inDisplay = stockToDisplayUnits(row.in, conversionItem);
                      const outDisplay = stockToDisplayUnits(row.out, conversionItem);
                      const closingDisplay = stockToDisplayUnits(row.closing, conversionItem);
                      
                      const formatQty = (c: number, g: number, l: number) => 
                        `${c.toFixed(2)} / ${g.toFixed(2)} / ${l.toFixed(2)}`;
                      
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50/50">{row.code}</td>
                          <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.name}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.category}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{formatQty(openingDisplay.cartons, openingDisplay.gallons, openingDisplay.liters)}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-emerald-700 text-right">{formatQty(inDisplay.cartons, inDisplay.gallons, inDisplay.liters)}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-rose-700 text-right">{formatQty(outDisplay.cartons, outDisplay.gallons, outDisplay.liters)}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-blue-700 text-right bg-blue-50/30">{formatQty(closingDisplay.cartons, closingDisplay.gallons, closingDisplay.liters)}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.rate.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.value.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">Grand Total</td>
                      <td className="px-4 py-3 text-[11px] text-right">{filteredData.reduce((s, r) => s + r.opening, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalQtyIn.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{totalQtyOut.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{filteredData.reduce((s, r) => s + r.closing, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right">-</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-800 dark:text-slate-100">{totalClosingValue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
               <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Inventory Value by Category</h3>
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
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Top 5 Items by Closing Value</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.sort((a, b) => b.value - a.value).slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 10}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Bar dataKey="value" name="Closing Value" fill="#881337" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
