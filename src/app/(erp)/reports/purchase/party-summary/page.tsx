"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import React, { useState, useEffect } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, Users, ShoppingCart, RotateCcw as RotateLeft, TrendingUp, FileSpreadsheet, Play, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PartyPurchaseSummaryReportPage() {
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [purchasesRes, vendorsRes] = await Promise.all([
          fetch('/api/purchases'),
          fetch('/api/parties?type=vendor')
        ]);
        const [purchasesJson, vendorsJson] = await Promise.all([
          purchasesRes.json(),
          vendorsRes.json()
        ]);

        if (vendorsJson.ok && vendorsJson.data) {
          setVendors(vendorsJson.data);
        }

        if (purchasesJson.ok && purchasesJson.data) {
          setRawPurchases(purchasesJson.data);
          processAndFilterData(purchasesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            selectedVendor: "All",
            selectedStatus: "All",
            taxFilter: "All",
            minAmount: "",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching party summary:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  function processAndFilterData(items: any[], filters: any) {
    let filtered = items.filter((p: any) => {
      if (p.date) {
        const d = p.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }
      if (filters.selectedVendor !== "All") {
        const vId = p.partyId?._id || p.partyId?.id || p.partyId;
        if (vId !== filters.selectedVendor) return false;
      }
      if (filters.selectedStatus !== "All") {
        const s = (p.status || "posted").toLowerCase();
        if (s !== filters.selectedStatus.toLowerCase()) return false;
      }
      if (filters.taxFilter === "tax") {
        if (!p.isTaxInvoice && (p.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (p.isTaxInvoice || (p.taxAmount || 0) > 0) return false;
      }
      return true;
    });

    const grouped = filtered.reduce((acc: any, p: any) => {
      const vendorId = p.partyId?._id || p.partyId?.id || p.partyId || "unknown";
      const vName = p.partyId?.name || p.partyId?.companyName || "Unknown Vendor";
      const vCode = p.partyId?.code || "V-???";
      
      if (!acc[vendorId]) {
        acc[vendorId] = {
          id: vendorId,
          vendorCode: vCode,
          vendorName: vName,
          invoices: 0,
          gross: 0,
          returns: 0,
          discount: 0,
          gst: 0,
          wht: 0,
          net: 0
        };
      }
      const isReturn = p.type === 'purchase_return';
      acc[vendorId].invoices += 1;
      acc[vendorId].gross += p.subTotal || p.totalAmount || 0;
      if (isReturn) acc[vendorId].returns += p.totalAmount || 0;
      acc[vendorId].discount += p.discountAmount || 0;
      acc[vendorId].gst += p.taxAmount || 0;
      acc[vendorId].wht += p.whtAmount || 0;
      acc[vendorId].net += (isReturn ? -(p.totalAmount || 0) : (p.totalAmount || 0));
      return acc;
    }, {});

    let list: any[] = Object.values(grouped);

    if (filters.minAmount) {
      const min = Number(filters.minAmount) || 0;
      list = list.filter((r: any) => r.net >= min || r.gross >= min);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((r: any) => 
        (r.vendorName && r.vendorName.toLowerCase().includes(q)) ||
        (r.vendorCode && r.vendorCode.toLowerCase().includes(q))
      );
    }

    const totalNet: number = list.reduce((s: number, r: any) => s + r.net, 0);
    setData(list.map((r: any) => ({
      ...r,
      percent: totalNet > 0 ? ((r.net / totalNet) * 100).toFixed(1) + "%" : "0%"
    })));
  }

  const handleGenerate = () => {
    processAndFilterData(rawPurchases, {
      dateFrom,
      dateTo,
      selectedVendor,
      selectedStatus,
      taxFilter,
      minAmount,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedVendor("All");
    setSelectedStatus("All");
    setTaxFilter("All");
    setMinAmount("");
    setSearchQuery("");
    processAndFilterData(rawPurchases, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedVendor: "All",
      selectedStatus: "All",
      taxFilter: "All",
      minAmount: "",
      searchQuery: ""
    });
  };

  const stats = [
    { title: "TOTAL VENDORS", value: data.length.toString(), subtitle: "Active vendors in period", icon: Users, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "TOTAL PURCHASES", value: `Rs. ${data.reduce((s, r) => s + r.gross, 0).toLocaleString()}`, subtitle: `${data.reduce((s, r) => s + r.invoices, 0)} transactions`, icon: ShoppingCart, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "TOTAL RETURNS", value: `Rs. ${data.reduce((s, r) => s + r.returns, 0).toLocaleString()}`, subtitle: "Returns deducted", icon: RotateLeft, iconColor: "text-amber-600", iconBg: "bg-amber-50", valueColor: "text-amber-600" },
    { title: "NET PURCHASES", value: `Rs. ${data.reduce((s, r) => s + r.net, 0).toLocaleString()}`, subtitle: "Purchases - Returns", icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: "text-emerald-600" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor</label>
          <select 
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v._id || v.id} value={v._id || v.id}>
                {v.name || v.companyName} {v.code ? `(${v.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Statuses</option>
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
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
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Net Amount</label>
          <input 
            type="number" 
            placeholder="0" 
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Party</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Vendor Name / Code..." 
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

  const barData = data.map(d => ({ name: d.vendorName, value: d.net })).sort((a, b) => b.value - a.value).slice(0, 15);

  const pieData = barData.map((d, idx) => ({
    name: `${d.name} (${((d.value / (data.reduce((s, r) => s + r.net, 0) || 1)) * 100).toFixed(1)}%)`,
    value: d.value,
    color: ['#881337', '#be123c', '#e11d48', '#fb7185', '#fda4af'][idx % 5]
  }));

  return (
    <ERPReportLayout
      title="Party Purchase Summary"
      description="Reports / Purchase Reports / Party Purchase Summary"
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "PartyPurchaseSummary.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vendor Purchase Summary</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} {data.length === 1 ? 'vendor' : 'vendors'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Invoices</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Purchases</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Returns</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Discount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GST</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">WHT</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right flex items-center justify-end gap-1">Net Purchases <TrendingUp size={10} className="text-slate-400"/></th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400">Loading report data...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-xs text-slate-400">No vendor purchase records match the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.vendorCode}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.vendorName}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">{row.invoices}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.gross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.returns.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.discount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.gst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.wht.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">{row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-rose-800 dark:text-rose-400 text-right bg-rose-50/30 dark:bg-rose-950/20">{row.percent}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} vendors)</td>
                    <td className="px-4 py-3 text-[11px] text-center">{data.reduce((s, r) => s + r.invoices, 0)}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600">{data.reduce((s, r) => s + r.returns, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.discount, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gst, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.wht, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">{data.reduce((s, r) => s + r.net, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top 15 Vendors by Net Purchases</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Net Purchases" fill="#881337" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Purchase Distribution by Vendor</h3>
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
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
