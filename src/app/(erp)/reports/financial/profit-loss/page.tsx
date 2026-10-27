"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, TrendingUp, TrendingDown, DollarSign, Percent, Search, Maximize2, Minimize2, Eye, EyeOff, ChevronDown, ChevronRight, FileSpreadsheet, PlusCircle, MinusCircle, CheckCircle2 } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect, useMemo } from "react";
import { getDefaultDateRange } from "@/lib/dateUtils";

export default function ProfitLossReportPage() {
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "trading": true,
    "expenses": true,
    "otherIncome": true
  });
  const [detailsOn, setDetailsOn] = useState(true);

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/reports/profit-loss?fromDate=${fromDate}&toDate=${toDate}`);
      const json = await res.json();
      if (json.ok) setReport(json.data);
    } catch (e) {
      console.error("Error fetching profit-loss report:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    setExpandedSections({
      "trading": true,
      "expenses": true,
      "otherIncome": true
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      "trading": false,
      "expenses": false,
      "otherIncome": false
    });
  };

  const filteredExpenses = useMemo(() => {
    if (!report?.expenses) return [];
    if (!searchQuery.trim()) return report.expenses;
    const q = searchQuery.toLowerCase();
    return report.expenses.filter((e: any) =>
      String(e.title || "").toLowerCase().includes(q) || String(e.code || "").includes(q)
    );
  }, [report, searchQuery]);

  const filteredOtherIncome = useMemo(() => {
    if (!report?.otherIncome) return [];
    if (!searchQuery.trim()) return report.otherIncome;
    const q = searchQuery.toLowerCase();
    return report.otherIncome.filter((oi: any) =>
      String(oi.title || "").toLowerCase().includes(q) || String(oi.code || "").includes(q)
    );
  }, [report, searchQuery]);

  const salesRev = Number(report?.salesRevenue || 0);
  const grossProfit = Number(report?.grossProfit || 0);
  const totalExpenses = Number(report?.totalExpenses || 0);
  const totalOtherIncome = Number(report?.totalOtherIncome || 0);
  const netProfit = Number(report?.netProfit || 0);

  const grossMargin = salesRev > 0 ? (grossProfit / salesRev * 100) : 0;
  const expenseRatio = salesRev > 0 ? (totalExpenses / salesRev * 100) : 0;
  const netMargin = salesRev > 0 ? (netProfit / salesRev * 100) : 0;

  const stats = [
    { title: "Gross Profit (Sales)", value: `Rs. ${grossProfit.toLocaleString()}`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: grossProfit >= 0 ? "text-emerald-700" : "text-rose-600" },
    { title: "Operating Expenses", value: `Rs. ${totalExpenses.toLocaleString()}`, icon: TrendingDown, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "Other Income", value: `Rs. ${totalOtherIncome.toLocaleString()}`, icon: PlusCircle, iconColor: "text-amber-600", iconBg: "bg-amber-50", valueColor: "text-amber-700" },
    { title: "Net Profit / (Loss)", value: `Rs. ${netProfit.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: netProfit >= 0 ? "text-blue-600" : "text-rose-600" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input 
            type="date" 
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Comparison</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>None</option>
            <option>Previous Period</option>
            <option>Previous Year</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-4 flex items-end">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={12} />
            <input 
              type="text" 
              placeholder="Search expenses or income by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all dark:text-white" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={() => setDetailsOn(!detailsOn)}
          className={`px-3 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
            detailsOn ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          {detailsOn ? <Eye size={14} /> : <EyeOff size={14} />} Details On
        </button>
        <button 
          onClick={expandAll}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <Maximize2 size={14} /> Expand All
        </button>
        <button 
          onClick={collapseAll}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <Minimize2 size={14} /> Collapse All
        </button>
        <button 
          onClick={printPage}
          className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          <Play size={14} /> {isLoading ? "Calculating..." : "Generate Report"}
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Profit & Loss"
      description="Income statement summarizing product/invoice profit, operating expenses, and other income."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Statement", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => {
          if (!report) return alert("Please generate report first");
          const exportData = [
            { Section: "1. TRADING PROFIT (SALES)", Account: "Sales Revenue", Amount: report.salesRevenue },
            { Section: "1. TRADING PROFIT (SALES)", Account: "Less: Cost of Goods Sold (COGS)", Amount: -report.cogs },
            { Section: "1. TRADING PROFIT (SALES)", Account: "Gross Profit Subtotal", Amount: report.grossProfit },
            { Section: "", Account: "", Amount: "" },
            { Section: "2. OPERATING EXPENSES (LESS)", Account: "", Amount: "" },
            ...(report.expenses || []).map((e: any) => ({ Section: "Operating Expenses", Account: e.title, Amount: -e.amount })),
            { Section: "2. OPERATING EXPENSES (LESS)", Account: "Total Operating Expenses", Amount: -report.totalExpenses },
            { Section: "", Account: "", Amount: "" },
            { Section: "3. OTHER INCOME (ADD)", Account: "", Amount: "" },
            ...(report.otherIncome || []).map((oi: any) => ({ Section: "Other Income", Account: oi.title, Amount: oi.amount })),
            { Section: "3. OTHER INCOME (ADD)", Account: "Total Other Income", Amount: report.totalOtherIncome },
            { Section: "", Account: "", Amount: "" },
            { Section: "FINAL NET PROFIT / (LOSS)", Account: "Net Profit / (Loss)", Amount: report.netProfit },
          ];
          exportToExcel(exportData, "ProfitLossStatement.xlsx");
        }, icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Calculating profit & loss...</p>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <div className="flex gap-1 items-end mb-4">
              <div className="w-2 h-8 bg-slate-200 rounded-sm animate-pulse" />
              <div className="w-2 h-12 bg-slate-300 rounded-sm animate-pulse" />
              <div className="w-2 h-6 bg-slate-200 rounded-sm animate-pulse" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Click generate to view the income statement</p>
          </div>
        ) : (
          <div className="px-4">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-black text-maroon-800 uppercase tracking-widest">Income Statement / Profit & Loss</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Al Hadeed Traders | {fromDate} to {toDate}</p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              
              {/* ------------------------------------------------------------- */}
              {/* STEP 1: Product / Invoice Trading Gross Profit                 */}
              {/* ------------------------------------------------------------- */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSection("trading")}
                >
                  <div className="flex items-center gap-2.5">
                    {expandedSections["trading"] ? <ChevronDown size={18} className="text-maroon-800" /> : <ChevronRight size={18} className="text-maroon-800" />}
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        1. Product / Invoice Profit (Gross Profit)
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400">Total Sales Revenue minus Cost of Goods Sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      Rs. {grossProfit.toLocaleString()}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400">Margin: {grossMargin.toFixed(1)}%</span>
                  </div>
                </div>

                {expandedSections["trading"] && (
                  <div className="p-4 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Sales Revenue
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">Rs. {salesRev.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Less: Cost of Goods Sold (COGS)
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">(Rs. {Number(report.cogs || 0).toLocaleString()})</span>
                    </div>

                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-xs font-black">
                      <span className="text-slate-700 dark:text-slate-200 uppercase tracking-wider">Gross Trading Profit Subtotal</span>
                      <span className={`${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        Rs. {grossProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* STEP 2: Less Operating Expenses (Hamare Apnay Expenses)       */}
              {/* ------------------------------------------------------------- */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSection("expenses")}
                >
                  <div className="flex items-center gap-2.5">
                    {expandedSections["expenses"] ? <ChevronDown size={18} className="text-maroon-800" /> : <ChevronRight size={18} className="text-maroon-800" />}
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        2. Operating Expenses (Deduct / Minus)
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400">Salaries, Rent, Utilities, Refreshments & Daily Operating Costs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                      (Rs. {totalExpenses.toLocaleString()})
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400">{filteredExpenses.length} Expense Item(s)</span>
                  </div>
                </div>

                {expandedSections["expenses"] && (
                  <div className="p-4 space-y-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    {filteredExpenses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">No operating expenses recorded for this period.</p>
                    ) : (
                      filteredExpenses.map((e: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 py-0.5">
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            {e.title}
                          </span>
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            (Rs. {Number(e.amount || 0).toLocaleString()})
                          </span>
                        </div>
                      ))
                    )}

                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-xs font-black">
                      <span className="text-slate-700 dark:text-slate-200 uppercase tracking-wider">Total Operating Expenses</span>
                      <span className="text-rose-600 dark:text-rose-400">(Rs. {totalExpenses.toLocaleString()})</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* STEP 3: Add Other Income (Other Income ka Balance)            */}
              {/* ------------------------------------------------------------- */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleSection("otherIncome")}
                >
                  <div className="flex items-center gap-2.5">
                    {expandedSections["otherIncome"] ? <ChevronDown size={18} className="text-maroon-800" /> : <ChevronRight size={18} className="text-maroon-800" />}
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        3. Other Income (Add / Plus)
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400">Scrap, Commissions, Discounts Received & Non-Operating Income</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      + Rs. {totalOtherIncome.toLocaleString()}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400">{filteredOtherIncome.length} Income Item(s)</span>
                  </div>
                </div>

                {expandedSections["otherIncome"] && (
                  <div className="p-4 space-y-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    {filteredOtherIncome.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">No other income recorded for this period.</p>
                    ) : (
                      filteredOtherIncome.map((oi: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 py-0.5">
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            {oi.title}
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            + Rs. {Number(oi.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}

                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-xs font-black">
                      <span className="text-slate-700 dark:text-slate-200 uppercase tracking-wider">Total Other Income</span>
                      <span className="text-amber-600 dark:text-amber-400">+ Rs. {totalOtherIncome.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* STEP 4: Final Net Profit / (Loss) Total Box                   */}
              {/* ------------------------------------------------------------- */}
              <div className="p-6 bg-slate-900 dark:bg-black rounded-xl border border-slate-800 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Calculation Formula: Gross Profit - Expenses + Other Income
                    </span>
                    <div className="text-xs font-bold text-slate-300">
                      Rs. {grossProfit.toLocaleString()} <span className="text-rose-400">- Rs. {totalExpenses.toLocaleString()}</span> <span className="text-emerald-400">+ Rs. {totalOtherIncome.toLocaleString()}</span>
                    </div>
                    <h3 className="text-base font-black uppercase tracking-widest text-white mt-1">
                      Final Net Profit / (Loss)
                    </h3>
                  </div>

                  <div className="text-left md:text-right">
                    <span className={`text-2xl md:text-3xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Rs. {netProfit.toLocaleString()}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                      Net Margin: {netMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-4xl mx-auto">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Gross Profit Margin</span>
                <span className={`text-2xl font-black ${grossMargin >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600'}`}>{grossMargin.toFixed(1)}%</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Operating Expense Ratio</span>
                <span className="text-2xl font-black text-rose-600">{expenseRatio.toFixed(1)}%</span>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Net Margin</span>
                <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ERPReportLayout>
  );
}
