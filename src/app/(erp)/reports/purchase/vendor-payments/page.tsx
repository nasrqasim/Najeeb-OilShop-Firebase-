"use client";

import React, { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, DollarSign, Banknote, CreditCard, Hash, FileSpreadsheet, Play, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function VendorPaymentsReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [selectedPaymentType, setSelectedPaymentType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cpRes, bpRes, vendorsRes] = await Promise.all([
        fetch('/api/cash-payments').then(r => r.json()),
        fetch('/api/bank-payments').then(r => r.json()),
        fetch('/api/parties?type=vendor').then(r => r.json())
      ]);

      const vendorList = vendorsRes.ok && Array.isArray(vendorsRes.data) ? vendorsRes.data : [];
      setVendors(vendorList);

      const vendorIdSet = new Set(vendorList.map((v: any) => String(v._id || v.id)));
      const vendorNameSet = new Set(vendorList.map((v: any) => String(v.name || v.companyName || "").toLowerCase().trim()).filter(Boolean));

      const isVendorOnly = (item: any) => {
        // Exclude Owner drawings, customer refunds, or general expenses
        const cat = String(item.category || "").toLowerCase();
        const partyType = String(item.partyType || "").toLowerCase();
        if (cat.includes("owner") || cat.includes("drawing") || cat.includes("expense") || partyType === "customer") {
          return false;
        }

        const partyId = String(item.partyId?._id || item.partyId || item.party || item.vendor || "");
        const partyName = String(item.partyId?.name || item.partyId?.companyName || item.party || item.vendorName || "").toLowerCase().trim();

        if (partyType === "vendor" || partyType === "supplier") return true;
        if (vendorIdSet.has(partyId)) return true;
        if (partyName && vendorNameSet.has(partyName)) return true;
        return false;
      };

      const combined = [
        ...(cpRes.data || []).filter(isVendorOnly).map((v: any) => ({ ...v, mode: 'Cash Payment', badge: 'CP' })),
        ...(bpRes.data || []).filter(isVendorOnly).map((v: any) => ({ ...v, mode: 'Bank Payment', badge: 'BP' }))
      ].map(v => {
        const rawDate = new Date(v.date || v.createdAt);
        const vName = v.partyId?.name || v.partyId?.companyName || v.party || v.vendorName || "Unknown Vendor";
        return {
          id: v._id || v.id,
          rawDate,
          date: rawDate.toLocaleDateString(),
          docNo: v.voucherNo || v.docNo || "N/A",
          type: v.badge,
          vendor: vName,
          vendorId: v.partyId?._id || v.partyId || v.party,
          amount: Number(v.amount) || 0,
          mode: v.mode,
          status: v.status || "Posted"
        };
      });

      setData(combined);
    } catch (error) {
      console.error("Error fetching vendor payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Infinity;
    const q = searchQuery.toLowerCase().trim();

    return data.filter(d => {
      const txTime = d.rawDate.getTime();
      if (txTime < fromTime || txTime > toTime) return false;
      if (selectedVendor !== "All" && d.vendorId !== selectedVendor && d.vendor !== selectedVendor) return false;
      if (selectedPaymentType === "Cash" && d.type !== "CP") return false;
      if (selectedPaymentType === "Bank" && d.type !== "BP") return false;
      if (selectedStatus !== "All" && d.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (q && !d.vendor.toLowerCase().includes(q) && !d.docNo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, fromDate, toDate, selectedVendor, selectedPaymentType, selectedStatus, searchQuery]);

  const totalPaid = filteredData.reduce((s, r) => s + r.amount, 0);
  const cashPaid = filteredData.filter(d => d.type === 'CP').reduce((s, r) => s + r.amount, 0);
  const bankPaid = filteredData.filter(d => d.type === 'BP').reduce((s, r) => s + r.amount, 0);

  const stats = [
    { title: "TOTAL PAID TO VENDORS", value: `Rs. ${totalPaid.toLocaleString()}`, subtitle: `${filteredData.length} payments`, icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "CASH PAYMENTS (CP)", value: `Rs. ${cashPaid.toLocaleString()}`, subtitle: `${filteredData.filter(d => d.type === 'CP').length} transactions`, icon: Banknote, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "BANK PAYMENTS (BP)", value: `Rs. ${bankPaid.toLocaleString()}`, subtitle: `${filteredData.filter(d => d.type === 'BP').length} transactions`, icon: CreditCard, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "PAYMENT COUNT", value: filteredData.length.toString(), subtitle: `CP: ${filteredData.filter(d => d.type === 'CP').length} | BP: ${filteredData.filter(d => d.type === 'BP').length}`, icon: Hash, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const handleReset = () => {
    setFromDate(getStartOfMonthStr());
    setToDate(getCurrentDateStr());
    setSelectedVendor("All");
    setSelectedPaymentType("All");
    setSelectedStatus("All");
    setSearchQuery("");
  };

  const Filters = (
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 w-full">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 w-full">
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
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</label>
          <select 
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v._id || v.id} value={v._id || v.id}>
                {v.name || v.companyName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Type</label>
          <select 
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Payments</option>
            <option value="Cash">Cash Payments (CP)</option>
            <option value="Bank">Bank Payments (BP)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div className="space-y-1 flex items-end">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor / doc..." 
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={handleReset}
          title="Reset Filters"
          className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
        >
          <RotateCcw size={14} />
        </button>
        <button 
          onClick={fetchData}
          className="px-3 py-1.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm shadow-maroon-900/20"
        >
          <Play size={12} /> Generate
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Vendor Payments"
      description="Purchase payment transactions excluding personal owner drawings and non-vendor expenses."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Payments", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "VendorPayments.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vendor Payment Transactions</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">
              {filteredData.length} records
            </span>
          </div>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc No</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mode</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                      Loading vendor payments...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                      No vendor payments found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.docNo}</td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${row.type === 'CP' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-900 dark:text-white">{row.vendor}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400">{row.mode}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-900 dark:text-white text-right">
                        Rs. {row.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                {filteredData.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={6} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">
                      Total Paid
                    </td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600 dark:text-rose-400 font-black">
                      Rs. {totalPaid.toLocaleString()}
                    </td>
                    <td></td>
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
