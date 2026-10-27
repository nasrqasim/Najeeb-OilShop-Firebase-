"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import React, { useState, useEffect } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, DollarSign, Clock, AlertTriangle, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

export default function APAgingReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/purchases');
        const json = await res.json();
        if (json.ok && json.data) {
          const today = new Date();
          const vendorMap = new Map();
          
          json.data.forEach((p: any) => {
            if (p.type === 'purchase_order' || p.type === 'purchase_return') return;
            
            const vendorId = p.partyId?._id || "unknown";
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
            const invDate = new Date(p.date);
            const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
            const amt = p.totalAmount || 0;
            
            if (diffDays <= 30) vendor.current += amt;
            else if (diffDays <= 60) vendor.d30 += amt;
            else if (diffDays <= 90) vendor.d60 += amt;
            else vendor.d90 += amt;
            
            vendor.total += amt;
          });

          setData(Array.from(vendorMap.values()).filter(v => v.total > 0));
        }
      } catch (error) {
        console.error("Error fetching AP aging:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

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
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 w-full">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">As Of Date</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Vendors</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Min. Balance</label>
          <input type="number" placeholder="0" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center">
          <RotateCcw size={14} />
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
          
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50">
              <Clock size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No outstanding payables match the selected filters</p>
              <p className="text-xs mt-1">Try adjusting your filters or selecting a different financial year</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Current (0-30)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">31-60 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">61-90 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-rose-400 uppercase tracking-widest text-right">90+ Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Total Balance</th>
                </tr>
              </thead>
               <tbody className="divide-y divide-slate-100">
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.vendorCode}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-blue-600 cursor-pointer hover:underline">{row.vendorName}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.current.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.d30.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-amber-600 text-right">{row.d60.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-rose-600 text-right bg-rose-50/30">{row.d90.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                  <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} vendors)</td>
                  <td className="px-4 py-3 text-[11px] text-right">{totalCurrent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">{totalD30.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-amber-600">{totalD60.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-rose-600">{totalD90.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">{totalPayable.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ERPReportLayout>
  );
}
