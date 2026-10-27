"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Wallet, ArrowUpRight, ArrowDownRight, Scale, Search, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";

export default function LedgerReportPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/accounts");
        const json = await res.json();
        if (json.ok) setAccounts(json.data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchAccounts();
  }, []);

  const handleGenerate = async () => {
    if (!selectedAccount) return alert("Please select an account");
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/journal-entries?accountCode=${selectedAccount.code}&fromDate=${fromDate}&toDate=${toDate}`);
      const json = await res.json();
      if (json.ok) {
        let runningBalance = 0; // Ideally fetch opening balance before range
        const balancedData = json.data.map((row: any) => {
          runningBalance += (row.debit || 0) - (row.credit || 0);
          return {
            ...row,
            balance: Math.abs(runningBalance),
            balType: runningBalance >= 0 ? "Dr" : "Cr"
          };
        });
        setData(balancedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDebit = data.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = data.reduce((s, r) => s + (r.credit || 0), 0);
  const closingBalance = data.length > 0 ? data[data.length - 1].balance : 0;
  const closingType = data.length > 0 ? data[data.length - 1].balType : "Dr";

  const stats = [
    { title: "Opening Balance", value: "0.00", icon: Wallet, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50", iconLabel: "Dr" },
    { title: "Total Debit", value: totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2}), icon: ArrowUpRight, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Credit", value: totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2}), icon: ArrowDownRight, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Closing Balance", value: closingBalance.toLocaleString(undefined, {minimumFractionDigits: 2}), icon: Scale, iconColor: "text-blue-600", iconBg: "bg-blue-50", iconLabel: closingType, valueColor: "text-blue-600" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
            Financial Year <span className="text-rose-500">*</span>
          </label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-2">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
            Account <span className="text-rose-500">*</span>
          </label>
          <select 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
            onChange={(e) => {
              const acc = accounts.find(a => a.code === e.target.value);
              setSelectedAccount(acc);
            }}
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc._id} value={acc.code}>{acc.code} - {acc.title || acc.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Transaction Type</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Types</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">View Mode</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Summarized</option>
            <option>Detailed</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> Export CSV
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          <Play size={14} /> {isLoading ? "Generating..." : "Generate Report"}
        </button>
      </div>
    </div>
  );


  return (
    <ERPReportLayout
      title="Ledger Report"
      description="Detailed transaction history and running balances for a specific accounting head."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Ledger", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "FinancialLedger.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Search size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Please select an account and date range to generate the ledger</p>
          </div>
        ) : (
          <div className="px-4">
            <div className="mb-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <h2 className="text-lg font-black text-maroon-800">{selectedAccount?.code} - {selectedAccount?.title}</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">{fromDate} to {toDate} | Type: {selectedAccount?.type || 'N/A'}</p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">DATE</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">DOC NUMBER</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">TYPE</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">DESCRIPTION</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">DEBIT</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">CREDIT</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">BALANCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs italic">No transactions found for this account</td>
                    </tr>
                  ) : (
                    data.map((row, i) => (
                      <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors`}>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-blue-600 cursor-pointer hover:underline">{row.voucherNo || '-'}</td>
                        <td className="px-4 py-3 text-[11px]">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold uppercase tracking-widest">
                              Journal
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.remarks}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200 text-right">{row.debit?.toLocaleString() || "-"}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200 text-right">{row.credit?.toLocaleString() || "-"}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">
                          {row.balance.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[9px] font-black text-blue-600 ml-1">{row.balType}</span>
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">Closing Balance</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalDebit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-700">{totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-blue-700">{closingBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[9px] ml-1">{closingType}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ERPReportLayout>
  );
}
