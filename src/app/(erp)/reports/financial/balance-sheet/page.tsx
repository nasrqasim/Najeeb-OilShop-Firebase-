"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Landmark, ArrowUpRight, ArrowDownRight, Scale, Search, Maximize2, Minimize2, Eye, EyeOff, ChevronDown, ChevronRight, TrendingUp, CheckCircle2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function BalanceSheetReportPage() {
  const [asOfDate, setAsOfDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "assets": true,
    "liabilities": true,
    "equity": true
  });
  const [showDetails, setShowDetails] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/reports/balance-sheet?date=${asOfDate}`);
      const json = await res.json();
      if (json.ok) setReport(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const diff = report ? Math.abs(report.totalAssets - (report.totalLiabilities + report.totalEquity)) : 0;

  const stats = [
    { title: "Total Assets", value: `Rs. ${(report?.totalAssets || 0).toLocaleString()}`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Liabilities", value: `Rs. ${(report?.totalLiabilities || 0).toLocaleString()}`, icon: ArrowDownRight, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Equity", value: `Rs. ${(report?.totalEquity || 0).toLocaleString()}`, icon: Landmark, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Difference", value: diff < 1 ? "Balanced" : `Rs. ${diff.toLocaleString()}`, icon: Scale, iconColor: diff < 1 ? "text-slate-600" : "text-rose-600", iconBg: "bg-slate-50", valueColor: diff < 1 ? "text-slate-600" : "text-rose-600" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-3">
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">As of Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Comparison</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>None</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-4 xl:col-span-3 flex items-end">
           <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" size={12} />
            <input type="text" placeholder="Search accounts by code or name..." className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" />
          </div>
        </div>
        <div className="space-y-1 lg:col-span-1 flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${showDetails ? 'bg-maroon-800' : 'bg-slate-200'}`} onClick={() => setShowDetails(!showDetails)}>
                    <div className={`w-3 h-3 bg-white dark:bg-slate-900 rounded-full transition-transform ${showDetails ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Show Details</span>
            </label>
        </div>
        <div className="space-y-1 lg:col-span-1 flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 border-slate-300 rounded text-maroon-800 focus:ring-maroon-800/20" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Zero Balances</span>
            </label>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Maximize2 size={14} /> Expand All
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Minimize2 size={14} /> Collapse All
        </button>
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

  const barData = [
    { name: 'Assets', current: report?.totalAssets || 0 },
    { name: 'Liabilities', current: report?.totalLiabilities || 0 },
    { name: 'Equity', current: report?.totalEquity || 0 },
  ];

  const assetData = report ? report.assets.map((a: any, i: number) => ({
    name: a.title,
    value: a.balance,
    color: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b'][i % 5]
  })) : [];

  const liabilityEquityData = report ? [
    ...report.liabilities.map((l: any, i: number) => ({
      name: l.title,
      value: l.balance,
      color: ['#881337', '#9f1239', '#be123c', '#e11d48', '#fb7185'][i % 5]
    })),
    { name: 'Equity', value: report.totalEquity, color: '#1e3a8a' }
  ] : [];

  return (
    <ERPReportLayout
      title="Balance Sheet"
      description="Statement of financial position showing assets, liabilities, and equity."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Statement", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => {
          if (!report) return alert("Please generate report first");
          const exportData = [
            { Category: "ASSETS", Account: "", Balance: "" },
            ...report.assets.map((a: any) => ({ Category: "Assets", Account: a.title, Balance: a.balance })),
            { Category: "Total Assets", Account: "", Balance: report.totalAssets },
            { Category: "", Account: "", Balance: "" },
            { Category: "LIABILITIES", Account: "", Balance: "" },
            ...report.liabilities.map((l: any) => ({ Category: "Liabilities", Account: l.title, Balance: l.balance })),
            { Category: "Total Liabilities", Account: "", Balance: report.totalLiabilities },
            { Category: "", Account: "", Balance: "" },
            { Category: "EQUITY", Account: "", Balance: "" },
            ...report.equity.map((e: any) => ({ Category: "Equity", Account: e.title, Balance: e.balance })),
            { Category: "Retained Earnings", Account: "Net Profit", Balance: report.netProfit },
            { Category: "Total Equity", Account: "", Balance: report.totalEquity },
            { Category: "", Account: "", Balance: "" },
            { Category: "TOTAL LIABILITIES & EQUITY", Account: "", Balance: report.totalLiabilities + report.totalEquity },
          ];
          exportToExcel(exportData, "BalanceSheet.xlsx");
        }, icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Calculating balance sheet...</p>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Landmark size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Please click generate to view the balance sheet statement</p>
          </div>
        ) : (
          <div className="px-4">
            <div className="mb-8 text-center">
                <h2 className="text-xl font-black text-maroon-800 uppercase tracking-widest">Balance Sheet Statement</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">As of {asOfDate} | Al Hadeed Traders</p>
            </div>

            <div className="max-w-5xl mx-auto overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">ACCOUNT</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right w-40">BALANCE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* ASSETS Section */}
                        <tr className="bg-maroon-800 text-white cursor-pointer" onClick={() => toggleSection("assets")}>
                            <td className="px-6 py-2 text-[11px] font-black flex items-center gap-2">
                                {expandedSections["assets"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                ASSETS
                            </td>
                            <td className="px-6 py-2 text-[11px] font-black text-right"></td>
                        </tr>
                        {expandedSections["assets"] && (
                            report.assets.map((a: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/30">
                                    <td className="px-10 py-3 text-[11px] text-slate-700 dark:text-slate-200">{a.title}</td>
                                    <td className="px-6 py-3 text-[11px] text-right text-slate-700 dark:text-slate-200">{a.balance.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                        <tr className="bg-maroon-900 text-white">
                            <td className="px-6 py-3 text-[11px] font-black uppercase tracking-widest">TOTAL ASSETS</td>
                            <td className="px-6 py-3 text-[11px] font-black text-right underline underline-offset-4 decoration-double">{report.totalAssets.toLocaleString()}</td>
                        </tr>

                        {/* LIABILITIES Section */}
                        <tr className="bg-maroon-800 text-white cursor-pointer mt-4" onClick={() => toggleSection("liabilities")}>
                            <td className="px-6 py-2 text-[11px] font-black flex items-center gap-2">
                                {expandedSections["liabilities"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                LIABILITIES
                            </td>
                            <td className="px-6 py-2 text-[11px] font-black text-right"></td>
                        </tr>
                        {expandedSections["liabilities"] && (
                            report.liabilities.map((l: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/30">
                                    <td className="px-10 py-3 text-[11px] text-slate-700 dark:text-slate-200 font-bold">{l.title}</td>
                                    <td className="px-6 py-3 text-[11px] text-right text-slate-700 dark:text-slate-200">{l.balance.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                        <tr className="bg-maroon-900 text-white">
                            <td className="px-6 py-3 text-[11px] font-black uppercase tracking-widest">TOTAL LIABILITIES</td>
                            <td className="px-6 py-3 text-[11px] font-black text-right">{report.totalLiabilities.toLocaleString()}</td>
                        </tr>

                        {/* EQUITY Section */}
                        <tr className="bg-maroon-800 text-white cursor-pointer" onClick={() => toggleSection("equity")}>
                            <td className="px-6 py-2 text-[11px] font-black flex items-center gap-2">
                                {expandedSections["equity"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                EQUITY
                            </td>
                            <td className="px-6 py-2 text-[11px] font-black text-right"></td>
                        </tr>
                        {expandedSections["equity"] && (
                            <>
                                {report.equity.map((e: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/30">
                                        <td className="px-10 py-3 text-[11px] text-slate-700 dark:text-slate-200 font-bold">{e.title}</td>
                                        <td className="px-6 py-3 text-[11px] text-right text-slate-700 dark:text-slate-200">{e.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/30">
                                    <td className="px-10 py-3 text-[11px] text-slate-700 dark:text-slate-200 font-bold italic">Retained Earnings (Net Profit)</td>
                                    <td className="px-6 py-3 text-[11px] text-right text-slate-700 dark:text-slate-200">{report.netProfit.toLocaleString()}</td>
                                </tr>
                            </>
                        )}
                        <tr className="bg-maroon-900 text-white">
                            <td className="px-6 py-3 text-[11px] font-black uppercase tracking-widest">TOTAL EQUITY</td>
                            <td className="px-6 py-3 text-[11px] font-black text-right">{report.totalEquity.toLocaleString()}</td>
                        </tr>

                        <tr className="bg-slate-900 text-white">
                            <td className="px-6 py-4 text-xs font-black uppercase tracking-widest">TOTAL LIABILITIES & EQUITY</td>
                            <td className="px-6 py-4 text-xs font-black text-right underline underline-offset-4 decoration-double">{(report.totalLiabilities + report.totalEquity).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                <div className={`p-4 ${diff < 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'} text-[10px] font-bold flex items-center gap-2`}>
                    {diff < 1 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {diff < 1 ? "Balance Sheet is balanced: Assets = Liabilities + Equity" : `Balance Sheet is out of balance by ${diff.toLocaleString()}`}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Assets vs Liabilities vs Equity</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{fontSize: 10}} />
                            <YAxis dataKey="name" type="category" tick={{fontSize: 10}} />
                            <RechartsTooltip formatter={(value) => `Rs. ${value}`} />
                            <Bar dataKey="current" name="Current Period" fill="#881337" barSize={30} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Asset Composition</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={assetData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {assetData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Liabilities & Equity</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={liabilityEquityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {liabilityEquityData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ERPReportLayout>
  );
}
