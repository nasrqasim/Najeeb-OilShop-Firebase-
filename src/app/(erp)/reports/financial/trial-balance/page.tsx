"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, ListTree, ArrowUpRight, ArrowDownRight, CheckCircle2, Search, ChevronRight, ChevronDown, Maximize2, Minimize2, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function TrialBalanceReportPage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/trial-balance?fromDate=${fromDate}&toDate=${toDate}`);
      const json = await res.json();
      if (json.ok) {
        setReportData(json.data);
        setHasSearched(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDebit = reportData.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = reportData.reduce((sum, item) => sum + (item.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  const stats = [
    { title: "Total Accounts", value: reportData.length.toString(), icon: ListTree, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "Total Debit Balances", value: `Rs.${totalDebit.toLocaleString()}`, icon: ArrowUpRight, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", iconLabel: "Dr" },
    { title: "Total Credit Balances", value: `Rs.${totalCredit.toLocaleString()}`, icon: ArrowDownRight, iconColor: "text-rose-600", iconBg: "bg-rose-50", iconLabel: "Cr" },
    { title: "Difference", value: diff === 0 ? "Balanced" : `Rs.${diff.toLocaleString()}`, icon: CheckCircle2, iconColor: diff === 0 ? "text-blue-600" : "text-rose-600", iconBg: diff === 0 ? "bg-blue-50" : "bg-rose-50", valueColor: diff === 0 ? "text-blue-600" : "text-rose-600" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-3">
        <div className="space-y-1 col-span-2">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
            Financial Year <span className="text-rose-500">*</span>
          </label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1 col-span-2">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 disabled:opacity-50"
          onClick={fetchReport}
          disabled={isLoading}
        >
          <Play size={14} /> {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );

  const barData = reportData.slice(0, 10).map(item => ({
    name: item.title,
    debit: item.debit,
    credit: item.credit
  }));

  const pieData = [
    { name: 'Debits', value: totalDebit, color: '#059669' },
    { name: 'Credits', value: totalCredit, color: '#e11d48' },
  ];

  return (
    <ERPReportLayout
      title="Trial Balance"
      description="Consolidated report of all ledger balances to verify accounting accuracy."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(reportData, "TrialBalance.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {!hasSearched ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <ListTree size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Please click generate to view the trial balance</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[15%]">ACCOUNT CODE</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ACCOUNT NAME</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-[15%]">DEBIT</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-[15%]">CREDIT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">{item.code}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-800 dark:text-slate-200">{item.title}</td>
                        <td className="px-4 py-3 text-[11px] text-right font-bold text-emerald-600">{(item.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-[11px] text-right font-bold text-rose-600">{(item.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={2} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest">Grand Total</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Debit vs Credit (Top 10 Accounts)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="name" tick={{fontSize: 8}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="debit" name="Debit" fill="#059669" barSize={20} />
                      <Bar dataKey="credit" name="Credit" fill="#e11d48" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Balance Distribution</h3>
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
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
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
