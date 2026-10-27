"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RefreshCw, Wallet, ArrowUpRight, ArrowDownRight, Activity, ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState } from "react";

export default function CashFlowStatementReportPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/reports/cash-flow?fromDate=${fromDate}&toDate=${toDate}`);
      const json = await res.json();
      if (json.ok) setReport(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "operating": true,
    "investing": false,
    "financing": false
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const stats = [
    { title: "Opening Cash Balance", value: `Rs.${(report?.openingBalance || 0).toLocaleString()}`, icon: Wallet, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "Total Inflows", value: `Rs.${(report?.totalInflow || 0).toLocaleString()}`, icon: ArrowUpRight, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Outflows", value: `Rs.${(report?.totalOutflow || 0).toLocaleString()}`, icon: ArrowDownRight, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Closing Cash Balance", value: `Rs.${(report?.closingBalance || 0).toLocaleString()}`, icon: Activity, iconColor: report?.closingBalance >= 0 ? "text-emerald-600" : "text-rose-800", iconBg: "bg-slate-50", valueColor: report?.closingBalance >= 0 ? "text-emerald-600" : "text-rose-800" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">View</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Summary</option>
            <option>Detailed</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          className="px-3 py-2 bg-maroon-800 text-white border border-maroon-900 rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          <Download size={14} /> {isLoading ? "Generating..." : "Generate Report"}
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Cash Flow Statement"
      description="Detailed analysis of cash inflows and outflows from operating, investing, and financing activities."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Statement", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => {
          const exportData = [
            { Category: "STATISTICS", Metric: "", Value: "" },
            ...stats.map(s => ({ Category: "Metric", Metric: s.title, Value: s.value })),
          ];
          exportToExcel(exportData, "CashFlow.xlsx");
        }, icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
            <div className="mb-8">
                <h2 className="text-xl font-black text-maroon-800 uppercase tracking-widest">Cash Flow Statement</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Al Hadeed Traders | {fromDate} to {toDate} | {report?.details.operating.length || 0} transactions</p>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Calculating cash flow...</p>
                </div>
            ) : !report ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4 mb-4">
                    <Activity size={48} className="mb-4 opacity-30" />
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Click generate to view the cash flow statement</p>
                </div>
            ) : (
              <div className="max-w-5xl mx-auto overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">PARTICULARS</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right w-40">AMOUNT</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right w-40">NET</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr className="bg-rose-50/50 dark:bg-rose-900/10">
                            <td className="px-6 py-3 text-[11px] font-black text-maroon-800 dark:text-maroon-400 uppercase tracking-widest">Opening Cash & Bank Balance</td>
                            <td className="px-6 py-3 text-[11px] font-black text-right"></td>
                            <td className="px-6 py-3 text-[11px] font-black text-right text-rose-800 dark:text-rose-400">Rs.{report.openingBalance.toLocaleString()}</td>
                        </tr>

                        <tr className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50" onClick={() => toggleSection("operating")}>
                            <td className="px-6 py-3 text-[11px] font-black text-maroon-800 flex items-center gap-2 uppercase tracking-widest">
                                {expandedSections["operating"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                OPERATING ACTIVITIES
                            </td>
                            <td className="px-6 py-3"></td>
                            <td className="px-6 py-3"></td>
                        </tr>
                        {expandedSections["operating"] && (
                            <>
                                <tr className="bg-slate-50 dark:bg-slate-800/50/30">
                                    <td className="px-10 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">CASH & BANK TRANSACTIONS</td>
                                    <td className="px-6 py-2"></td>
                                    <td className="px-6 py-2"></td>
                                </tr>
                                {report.details.operating.map((m: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/30">
                                        <td className="px-14 py-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                            {new Date(m.date).toLocaleDateString()} - {m.remarks}
                                        </td>
                                        <td className={`px-6 py-2 text-[11px] text-right ${m.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ({m.amount >= 0 ? '' : '-'}Rs.{Math.abs(m.amount).toLocaleString()})
                                        </td>
                                        <td className="px-6 py-2"></td>
                                    </tr>
                                ))}
                                <tr className="font-bold border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-6 py-3 text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-widest">Net Cash Movement</td>
                                    <td className="px-6 py-3"></td>
                                    <td className={`px-6 py-3 text-[11px] text-right ${report.totalInflow - report.totalOutflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        Rs.{(report.totalInflow - report.totalOutflow).toLocaleString()}
                                    </td>
                                </tr>
                            </>
                        )}

                        <tr className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50" onClick={() => toggleSection("investing")}>
                            <td className="px-6 py-3 text-[11px] font-black text-maroon-800 flex items-center gap-2 uppercase tracking-widest">
                                {expandedSections["investing"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                INVESTING ACTIVITIES
                            </td>
                            <td className="px-6 py-3"></td>
                            <td className="px-6 py-3 text-[11px] text-right text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Rs.0</td>
                        </tr>

                        <tr className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50" onClick={() => toggleSection("financing")}>
                            <td className="px-6 py-3 text-[11px] font-black text-maroon-800 flex items-center gap-2 uppercase tracking-widest">
                                {expandedSections["financing"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                FINANCING ACTIVITIES
                            </td>
                            <td className="px-6 py-3"></td>
                            <td className="px-6 py-3 text-[11px] text-right text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Rs.0</td>
                        </tr>

                        <tr className="bg-slate-900 text-white">
                            <td className="px-6 py-4 text-xs font-black uppercase tracking-widest">Closing Cash & Bank Balance</td>
                            <td className="px-6 py-4"></td>
                            <td className={`px-6 py-4 text-sm font-black text-right ${report.closingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} underline underline-offset-4 decoration-double`}>
                                Rs.{report.closingBalance.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </ERPReportLayout>
  );
}
