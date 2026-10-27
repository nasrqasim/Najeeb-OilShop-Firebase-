"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ReportLayout from "./ReportLayout";
import { User, ShieldAlert } from "lucide-react";

export default function CustomerAgingReport() {
  const data = [
    { customer: "Ahmad & Sons", total: 150000, current: 80000, p30: 40000, p60: 30000, p90: 0, over90: 0 },
    { customer: "Blue Sky Logistics", total: 450000, current: 150000, p30: 200000, p60: 100000, p90: 0, over90: 0 },
    { customer: "Capital Oils", total: 850000, current: 0, p30: 0, p60: 250000, p90: 300000, over90: 300000 },
    { customer: "Defense Auto Care", total: 75000, current: 75000, p30: 0, p60: 0, p90: 0, over90: 0 },
  ];

  const filters = (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aging Date</label>
      <input type="date" className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold w-48" defaultValue={getStartOfMonthStr()} />
    </div>
  );

  return (
    <ReportLayout 
      title="Customer Aging Report" 
      subtitle="Track outstanding receivables and analyze the age of unpaid customer invoices."
      filters={filters}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50/80 border-b border-slate-200 dark:border-slate-800">
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Customer Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">0 - 30 Days</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">31 - 60 Days</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">61 - 90 Days</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">91+ Days</th>
              <th className="px-8 py-4 text-[10px] font-black text-maroon-800 bg-maroon-50/50 uppercase tracking-[0.2em] text-right">Total Owed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-maroon-800 group-hover:text-white transition-all">
                      <User size={20} />
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{row.customer}</span>
                  </div>
                </td>
                <td className="px-6 py-6 text-right text-sm font-bold text-slate-600 dark:text-slate-300">{row.current.toLocaleString()}</td>
                <td className="px-6 py-6 text-right text-sm font-bold text-slate-600 dark:text-slate-300">{row.p30.toLocaleString()}</td>
                <td className="px-6 py-6 text-right text-sm font-bold text-amber-600">{row.p60.toLocaleString()}</td>
                <td className="px-6 py-6 text-right text-sm font-black text-rose-500">{row.p90.toLocaleString()}</td>
                <td className="px-8 py-6 text-right text-base font-black text-maroon-800 bg-maroon-50/20">
                  <div className="flex items-center justify-end gap-2">
                    {row.over90 > 0 && <ShieldAlert size={14} className="text-rose-500 animate-pulse" />}
                    {row.total.toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-black text-sm uppercase tracking-widest">
            <tr>
              <td className="px-8 py-6">Grand Total</td>
              <td className="px-6 py-6 text-right text-slate-400 dark:text-slate-500">{data.reduce((s, r) => s + r.current, 0).toLocaleString()}</td>
              <td className="px-6 py-6 text-right text-slate-400 dark:text-slate-500">{data.reduce((s, r) => s + r.p30, 0).toLocaleString()}</td>
              <td className="px-6 py-6 text-right text-amber-400">{data.reduce((s, r) => s + r.p60, 0).toLocaleString()}</td>
              <td className="px-6 py-6 text-right text-rose-400">{data.reduce((s, r) => s + r.p90 + r.over90, 0).toLocaleString()}</td>
              <td className="px-8 py-6 text-right text-maroon-400 text-lg tracking-tighter">Rs. {data.reduce((s, r) => s + r.total, 0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportLayout>
  );
}
