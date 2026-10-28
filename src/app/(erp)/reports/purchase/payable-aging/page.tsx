"use client";
import { getCurrentDateStr } from "@/lib/dateUtils";
import React, { useState, useEffect } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, DollarSign, Clock, AlertTriangle, CheckCircle, AlertCircle, FileSpreadsheet, Play, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

export default function APAgingReportPage() {
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [asOfDate, setAsOfDate] = useState(getCurrentDateStr());
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [minBalance, setMinBalance] = useState("");
  const [taxFilter, setTaxFilter] = useState("All");
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
          processAging(purchasesJson.data, {
            asOfDate: getCurrentDateStr(),
            selectedVendor: "All",
            minBalance: "",
            taxFilter: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching AP aging:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  function processAging(items: any[], filters: any) {
    const asOf = new Date(filters.asOfDate || Date.now());
    const vendorMap = new Map();

    items.forEach((p: any) => {
      if (p.type === 'purchase_order' || p.type === 'purchase_return') return;

      if (filters.taxFilter === "tax") {
        if (!p.isTaxInvoice && (p.taxAmount || 0) <= 0) return;
      } else if (filters.taxFilter === "non-tax") {
        if (p.isTaxInvoice || (p.taxAmount || 0) > 0) return;
      }

      const invDate = new Date(p.date || Date.now());
      if (invDate > asOf) return; // ignore invoices created after asOfDate

      const vendorId = p.partyId?._id || p.partyId?.id || p.partyId || "unknown";
      if (filters.selectedVendor !== "All" && vendorId !== filters.selectedVendor) return;

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          id: vendorId,
          vendorCode: p.partyId?.code || "V-???",
          vendorName: p.partyId?.name || p.partyId?.companyName || "Unknown Vendor",
          current: 0,
          d30: 0,
          d60: 0,
          d90: 0,
          total: 0
        });
      }

      const vendor = vendorMap.get(vendorId);
      const diffDays = Math.floor((asOf.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
      const amt = p.totalAmount || 0;

      if (diffDays <= 30) vendor.current += amt;
      else if (diffDays <= 60) vendor.d30 += amt;
      else if (diffDays <= 90) vendor.d60 += amt;
      else vendor.d90 += amt;

      vendor.total += amt;
    });

    let list = Array.from(vendorMap.values()).filter(v => v.total > 0);

    if (filters.minBalance) {
      const min = Number(filters.minBalance) || 0;
      list = list.filter(v => v.total >= min);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(v => 
        (v.vendorName && v.vendorName.toLowerCase().includes(q)) ||
        (v.vendorCode && v.vendorCode.toLowerCase().includes(q))
      );
    }

    setData(list);
  }

  const handleGenerate = () => {
    processAging(rawPurchases, {
      asOfDate,
      selectedVendor,
      minBalance,
      taxFilter,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultDate = getCurrentDateStr();
    setAsOfDate(defaultDate);
    setSelectedVendor("All");
    setMinBalance("");
    setTaxFilter("All");
    setSearchQuery("");
    processAging(rawPurchases, {
      asOfDate: defaultDate,
      selectedVendor: "All",
      minBalance: "",
      taxFilter: "All",
      searchQuery: ""
    });
  };

  const totalPayable = data.reduce((s, r) => s + r.total, 0);
  const totalCurrent = data.reduce((s, r) => s + r.current, 0);
  const totalD30 = data.reduce((s, r) => s + r.d30, 0);
  const totalD60 = data.reduce((s, r) => s + r.d60, 0);
  const totalD90 = data.reduce((s, r) => s + r.d90, 0);

  const stats = [
    { title: "TOTAL PAYABLE", value: `Rs. ${totalPayable.toLocaleString()}`, subtitle: `${data.length} vendors`, icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "CURRENT (0-30)", value: `Rs. ${totalCurrent.toLocaleString()}`, subtitle: `${totalPayable > 0 ? ((totalCurrent / totalPayable) * 100).toFixed(1) : 0}% of total`, icon: CheckCircle, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "31-60 DAYS", value: `Rs. ${totalD30.toLocaleString()}`, subtitle: `${totalPayable > 0 ? ((totalD30 / totalPayable) * 100).toFixed(1) : 0}% of total`, icon: Clock, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "61-90 DAYS", value: `Rs. ${totalD60.toLocaleString()}`, subtitle: `${totalPayable > 0 ? ((totalD60 / totalPayable) * 100).toFixed(1) : 0}% of total`, icon: AlertCircle, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "90+ DAYS", value: `Rs. ${totalD90.toLocaleString()}`, subtitle: `${totalPayable > 0 ? ((totalD90 / totalPayable) * 100).toFixed(1) : 0}% of total`, icon: AlertTriangle, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">As Of Date</label>
          <input 
            type="date" 
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min. Balance</label>
          <input 
            type="number" 
            placeholder="0" 
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
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

  return (
    <ERPReportLayout
      title="AP Aging"
      description="Reports / Purchase Reports / AP Aging"
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Aging", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "APAging.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vendor Aging Details</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} vendors</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Current (0-30)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">31-60 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">61-90 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-rose-400 uppercase tracking-widest text-right">90+ Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">Loading aging records...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">No outstanding payables match the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.vendorCode}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.vendorName}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.current.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.d30.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-amber-600 text-right">{row.d60.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-rose-600 text-right bg-rose-50/30 dark:bg-rose-950/20">{row.d90.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} vendors)</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalCurrent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalD30.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-amber-600">{totalD60.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600">{totalD90.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalPayable.toLocaleString()}</td>
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
