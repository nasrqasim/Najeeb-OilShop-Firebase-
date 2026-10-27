"use client";

import { getStartOfMonthStr, getCurrentDateStr, getDefaultDateRange } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, TrendingUp, TrendingDown, DollarSign, Percent, FileText, RotateCcw, RefreshCw, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart, Line } from 'recharts';

export default function InvoiceProfitLossReportPage() {
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [selectedCustomerCategory, setSelectedCustomerCategory] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState("All");

  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, partiesRes, itemsRes, catsRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/parties?type=Customer'),
          fetch('/api/items'),
          fetch('/api/categories')
        ]);
        const [salesJson, partiesJson, itemsJson, catsJson] = await Promise.all([
          salesRes.json(),
          partiesRes.json(),
          itemsRes.json(),
          catsRes.json()
        ]);

        if (salesJson.ok && salesJson.data) setRawSales(salesJson.data);
        if (partiesJson.ok && partiesJson.data) setCustomers(partiesJson.data);
        if (itemsJson.ok && itemsJson.data) setItemsList(itemsJson.data);
        if (catsJson.ok && catsJson.data) setCategoriesList(catsJson.data);
      } catch (error) {
        console.error("Error fetching invoice P&L data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const customerMap = useMemo(() => new Map(customers.map(c => [String(c._id || c.id), c])), [customers]);
  const itemMapMaster = useMemo(() => new Map(itemsList.map(i => [String(i._id || i.id), i])), [itemsList]);

  // Extract unique customer categories
  const customerCategories = useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => {
      if (c.category) set.add(c.category);
      if (c.customerCategory) set.add(c.customerCategory);
      if (c.group) set.add(c.group);
    });
    return Array.from(set).filter(Boolean);
  }, [customers]);

  // Dependent / Cascading Customer filter based on selected customer category
  const filteredCustomers = useMemo(() => {
    if (selectedCustomerCategory === "All") return customers;
    return customers.filter(c => {
      const cat = c.category || c.customerCategory || c.group || "";
      return String(cat).toLowerCase() === String(selectedCustomerCategory).toLowerCase();
    });
  }, [customers, selectedCustomerCategory]);

  // Find all category IDs matching selectedCategory (including any subcategories under this main category)
  const matchingCategoryIds = useMemo(() => {
    if (selectedCategory === "All") return null;
    const ids = new Set<string>([selectedCategory]);
    categoriesList.forEach((c: any) => {
      if (String(c.parentId) === selectedCategory) {
        ids.add(String(c._id));
      }
    });
    return ids;
  }, [categoriesList, selectedCategory]);

  // Dependent / Cascading Items filter based on selected item category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return itemsList;
    return itemsList.filter(i => {
      const mainCat = String(i.mainCategoryId || i.category || "");
      const subCat = String(i.subCategoryId || "");
      return matchingCategoryIds?.has(mainCat) || matchingCategoryIds?.has(subCat);
    });
  }, [itemsList, selectedCategory, matchingCategoryIds]);

  // Filtered Invoices P&L calculation
  const data: any[] = useMemo(() => {
    const fromTime = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : 0;
    const toTime = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;

    const list: any[] = [];
    rawSales
      .filter((s: any) => s.type !== 'quotation' && s.type !== 'sale_order' && s.status !== 'cancelled' && s.status !== 'Cancelled')
      .forEach((s: any) => {
        // Date filter
        const invDate = new Date(s.date || s.createdAt || 0).getTime();
        if (invDate < fromTime || invDate > toTime) return;

        // Customer filter
        const partyId = String(s.partyId?._id || s.partyId || s.customer || "");
        if (selectedCustomer !== "All" && partyId !== selectedCustomer) return;

        // Customer Category filter
        const custObj = customerMap.get(partyId) || s.partyId;
        const custCat = custObj?.category || custObj?.customerCategory || custObj?.group || "";
        if (selectedCustomerCategory !== "All" && String(custCat).toLowerCase() !== String(selectedCustomerCategory).toLowerCase()) return;

        const isReturn = (s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return');
        const factor = isReturn ? -1 : 1;

        // Lines check for Item & Item Category filter
        let linesToScore = s.lines || [];
        if (selectedCategory !== "All" || selectedItem !== "All") {
          linesToScore = linesToScore.filter((line: any) => {
            const rawItemId = line.itemId?._id || line.itemId || "";
            const itemIdStr = String(rawItemId);
            const masterItem = itemMapMaster.get(itemIdStr) || line.itemId;
            const code = masterItem?.code || line.itemCode || line.code || "";
            const mainCat = String(masterItem?.mainCategoryId || masterItem?.category || line.mainCategoryId || "");
            const subCat = String(masterItem?.subCategoryId || line.subCategoryId || "");

            if (selectedItem !== "All" && itemIdStr !== selectedItem && code !== selectedItem) return false;
            if (matchingCategoryIds && !matchingCategoryIds.has(mainCat) && !matchingCategoryIds.has(subCat)) return false;
            return true;
          });

          if (linesToScore.length === 0) return; // No matching items in this invoice
        }

        let cost = 0;
        let revenue = 0;

        linesToScore.forEach((line: any) => {
          const rawItemId = line.itemId?._id || line.itemId || "";
          const masterItem = itemMapMaster.get(String(rawItemId)) || line.itemId;
          const pRate = Number(masterItem?.purchaseRate ?? line.purchaseRate ?? line.cost ?? 0);
          const qty = Number(line.cartons) || Number(line.qty) || 0;
          const lineRev = Number(line.netAmount) || (Number(line.qty || 0) * Number(line.rate || 0)) || 0;

          cost += pRate * qty;
          revenue += lineRev;
        });

        // If no specific item/category filter is active, use the invoice's official total amount for total accuracy
        if (selectedCategory === "All" && selectedItem === "All") {
          revenue = Number(s.totalAmount || 0);
        }

        const returns = isReturn ? revenue : 0;
        const grossProfit = isReturn ? -cost : (revenue - cost);

        list.push({
          id: s._id,
          date: new Date(s.date || s.createdAt).toLocaleDateString(),
          rawDate: invDate,
          invoiceNo: s.invoiceNo || s.docNo || "N/A",
          customer: custObj?.name || custObj?.companyName || s.customerName || "Cash Customer",
          revenue: isReturn ? 0 : revenue,
          cost,
          grossProfit,
          returns,
          netProfit: grossProfit,
          margin: revenue > 0 ? (grossProfit / revenue * 100).toFixed(2) + "%" : "0.00%"
        });
      });

    return list.sort((a: any, b: any) => b.rawDate - a.rawDate);
  }, [rawSales, fromDate, toDate, selectedCustomer, selectedCustomerCategory, selectedItem, selectedCategory, customerMap, itemMapMaster, matchingCategoryIds]);

  const totalRev = data.reduce((s, i) => s + i.revenue, 0);
  const totalCost = data.reduce((s, i) => s + i.cost, 0);
  const totalGross = data.reduce((s, i) => s + i.grossProfit, 0);
  const totalReturns = data.reduce((s, i) => s + i.returns, 0);
  const totalNet = totalGross;

  const stats = [
    { title: "Total Revenue", value: `Rs. ${totalRev.toLocaleString()}`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Cost", value: `Rs. ${totalCost.toLocaleString()}`, icon: TrendingDown, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Gross Profit", value: `Rs. ${totalGross.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Returns", value: `Rs. ${totalReturns.toLocaleString()}`, icon: RotateCcw, iconColor: "text-orange-600", iconBg: "bg-orange-50" },
    { title: "Net Profit", value: `Rs. ${totalNet.toLocaleString()}`, icon: DollarSign, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Avg Margin", value: `${(totalRev > 0 ? (totalNet / totalRev * 100).toFixed(2) : "0.00")}%`, icon: Percent, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">👥 Customer Category</label>
          <select 
            value={selectedCustomerCategory} 
            onChange={(e) => {
              setSelectedCustomerCategory(e.target.value);
              setSelectedCustomer("All");
            }}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Customer Categories</option>
            {customerCategories.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">👤 Customer</label>
          <select 
            value={selectedCustomer} 
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Customers {selectedCustomerCategory !== "All" ? `(${filteredCustomers.length})` : ""}</option>
            {filteredCustomers.map((c: any) => (
              <option key={c._id} value={c._id}>{c.name || c.companyName}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">🏷️ Item Category</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedItem("All");
            }}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Categories</option>
            {categoriesList.map((c: any) => (
              <option key={c._id} value={c._id}>{c.name} {c.type === "main" ? "★" : ""}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">📦 Product / Item</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Items {selectedCategory !== "All" ? `(${filteredItems.length})` : ""}</option>
            {filteredItems.map((i: any) => (
              <option key={i._id} value={i._id}>{i.name} ({i.code})</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={() => {
            const range = getDefaultDateRange();
            setFromDate(range.fromDate);
            setToDate(range.toDate);
            setSelectedCustomer("All");
            setSelectedCustomerCategory("All");
            setSelectedCategory("All");
            setSelectedItem("All");
          }}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          <RotateCcw size={14} /> Reset Filters
        </button>
        <button 
          onClick={printPage}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <Printer size={14} /> Print
        </button>
        <button 
          onClick={() => exportToExcel(data, "InvoiceProfitLoss.xlsx")}
          className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-800 flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-800/20"
        >
          <FileSpreadsheet size={14} /> Export Excel
        </button>
      </div>
    </div>
  );

  const trendData = Object.entries(data.reduce((acc: any, curr: any) => {
    const d = curr.date;
    if (!acc[d]) acc[d] = { name: d, revenue: 0, cost: 0, profit: 0, returns: 0, net: 0 };
    acc[d].revenue += curr.revenue;
    acc[d].cost += curr.cost;
    acc[d].profit += curr.grossProfit;
    acc[d].returns += curr.returns;
    acc[d].net += curr.netProfit;
    return acc;
  }, {})).map(([_, v]) => v).slice(-10);

  const barData = data.slice(0, 10).map((i: any) => ({
    name: i.invoiceNo,
    revenue: i.revenue,
    cost: i.cost,
    profit: i.grossProfit
  }));

  return (
    <ERPReportLayout
      title="Invoice-wise Profit & Loss"
      description="Profitability tracking for each sale invoice, considering revenue, cost, and any returns."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print P&L", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "InvoiceProfitLoss.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live invoice P&L...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No invoices found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Invoice Profitability</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} invoices</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice No</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Revenue</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Cost</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Gross Profit</th>
                      <th className="px-4 py-3 text-[9px] font-black text-orange-600 uppercase tracking-widest text-right">Returns</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Net Profit</th>
                      <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.invoiceNo}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200">{row.customer}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-emerald-700 text-right bg-emerald-50/30">{row.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-rose-700 text-right bg-rose-50/30">{row.cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-blue-700 text-right bg-blue-50/30">{row.grossProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-orange-700 text-right bg-orange-50/30">{row.returns.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.netProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-amber-700 text-right bg-amber-50/30">{row.margin}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalRev.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{totalCost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{totalGross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-orange-700">{totalReturns.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-800 dark:text-slate-100">{totalNet.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-amber-700">{(totalRev > 0 ? (totalNet / totalRev * 100).toFixed(2) : "0.00")}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Profitability Trend Over Time</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" barSize={30} />
                      <Bar dataKey="cost" name="Cost" fill="#e11d48" barSize={30} />
                      <Line type="monotone" dataKey="profit" name="Gross Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top Invoices by Gross Profit</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 10}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" barSize={15} />
                      <Bar dataKey="profit" name="Gross Profit" fill="#3b82f6" barSize={15} />
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
