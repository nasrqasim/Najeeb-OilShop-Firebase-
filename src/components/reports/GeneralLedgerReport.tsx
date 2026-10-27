"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ReportLayout from "./ReportLayout";
import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";

export default function GeneralLedgerReport() {
  const [expanded, setExpanded] = useState<string[]>(["101"]);

  const toggle = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const data = [
    { 
      id: "101", 
      account: "1001 - Cash in Hand", 
      type: "Group",
      debit: 500000, 
      credit: 250000, 
      balance: 250000,
      lines: [
        { date: "2026-04-01", voucher: "JV-001", narration: "Opening Balance", debit: 500000, credit: 0, balance: 500000 },
        { date: "2026-04-05", voucher: "CP-012", narration: "Office Stationary Purchase", debit: 0, credit: 15000, balance: 485000 },
        { date: "2026-04-10", voucher: "CR-008", narration: "Cash Sale - Inv 55", debit: 50000, credit: 0, balance: 535000 },
      ]
    },
    { 
      id: "102", 
      account: "1002 - Bank Al Habib", 
      type: "Ledger",
      debit: 1200000, 
      credit: 450000, 
      balance: 750000,
      lines: []
    }
  ];

  const filters = (
    <>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={14} /> From Date
        </label>
        <input type="date" className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold w-48" defaultValue={getStartOfMonthStr()} />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={14} /> To Date
        </label>
        <input type="date" className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold w-48" defaultValue={getStartOfMonthStr()} />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cost Center</label>
        <select className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold w-48">
          <option>All Centers</option>
          <option>Main Office</option>
          <option>Factory</option>
        </select>
      </div>
    </>
  );

  return (
    <ReportLayout 
      title="General Ledger" 
      subtitle="Detailed history of transactions for each account over a specific period."
      filters={filters}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50/80 border-b border-slate-200 dark:border-slate-800">
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Account / Transaction</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Debit</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Credit</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <>
                <tr 
                  key={row.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 cursor-pointer transition-colors"
                  onClick={() => toggle(row.id)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      {row.lines.length > 0 && (
                        expanded.includes(row.id) ? <ChevronUp size={16} className="text-maroon-800" /> : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
                      )}
                      <span className="text-sm font-black text-slate-900 dark:text-white">{row.account}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right text-sm font-bold text-slate-700 dark:text-slate-200">{row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-6 text-right text-sm font-bold text-slate-700 dark:text-slate-200">{row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-8 py-6 text-right text-sm font-black text-maroon-800">{row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                
                {expanded.includes(row.id) && row.lines.map((line, idx) => (
                  <tr key={`${row.id}-${idx}`} className="bg-slate-50 dark:bg-slate-800/50/30 border-l-4 border-l-maroon-100 animate-in fade-in slide-in-from-top-1">
                    <td className="px-16 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{line.date}</span>
                          <span className="text-[10px] font-black text-maroon-800 bg-maroon-50 px-2 py-0.5 rounded">{line.voucher}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{line.narration}</p>
                      </div>
                    </td>
                    <td className="px-8 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">{line.debit > 0 ? line.debit.toLocaleString() : "-"}</td>
                    <td className="px-8 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">{line.credit > 0 ? line.credit.toLocaleString() : "-"}</td>
                    <td className="px-8 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">{line.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </ReportLayout>
  );
}
