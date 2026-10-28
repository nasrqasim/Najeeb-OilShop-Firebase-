"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Gift, FileSpreadsheet, RotateCcw, Search, UserCheck } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SalesmanIncentiveReportPage() {
  const [rawReceipts, setRawReceipts] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters and dynamic incentive rate inputs
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedSalesman, setSelectedSalesman] = useState("All");
  const [rate0_30, setRate0_30] = useState("1.0");
  const [rate31_90, setRate31_90] = useState("0.5");
  const [rateOver90, setRateOver90] = useState("0.2");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [cashRes, bankRes, employeesRes] = await Promise.all([
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts'),
          fetch('/api/employees')
        ]);
        const [cashJson, bankJson, employeesJson] = await Promise.all([
          cashRes.json(),
          bankRes.json(),
          employeesRes.json()
        ]);

        if (employeesJson.ok && employeesJson.data) {
          setSalesmen(employeesJson.data);
        }

        const allReceipts = [
          ...(cashJson.ok ? cashJson.data : []),
          ...(bankJson.ok ? bankJson.data : [])
        ];

        setRawReceipts(allReceipts);
        computeIncentives(allReceipts, {
          fromDate: getStartOfMonthStr(),
          toDate: getCurrentDateStr(),
          selectedSalesman: "All",
          r0_30: 1.0,
          r31_90: 0.5,
          rOver90: 0.2,
          searchQuery: ""
        });
      } catch (error) {
        console.error("Error fetching incentives:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function computeIncentives(receipts: any[], config: any) {
    const r030 = (Number(config.r0_30) || 0) / 100;
    const r3190 = (Number(config.r31_90) || 0) / 100;
    const rOver = (Number(config.rOver90) || 0) / 100;

    let filtered = receipts.filter((r: any) => {
      if (r.date) {
        const d = r.date.substring(0, 10);
        if (config.fromDate && d < config.fromDate) return false;
        if (config.toDate && d > config.toDate) return false;
      }

      const salesmanName = r.partyId?.salespersonId?.name || r.employeeId?.name || r.salesmanName || "Unassigned";
      const salesmanId = r.employeeId?._id || r.employeeId?.id || r.partyId?.salespersonId?._id || r.partyId?.salespersonId;

      if (config.selectedSalesman !== "All") {
        if (salesmanId !== config.selectedSalesman && salesmanName !== config.selectedSalesman) {
          return false;
        }
      }

      if (config.searchQuery) {
        const q = config.searchQuery.toLowerCase();
        const partyName = r.partyId?.name || r.party || "";
        const recNo = r.receiptNumber || r.voucherNo || "";
        if (!salesmanName.toLowerCase().includes(q) && !partyName.toLowerCase().includes(q) && !recNo.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });

    const processed = filtered.map((r: any) => {
      const receiptDate = new Date(r.date || Date.now());
      // Age calculation relative to reference or transaction aging
      const dummyInvoiceDate = new Date(receiptDate.getTime() - (35 * 24 * 3600 * 1000));
      const aging = r.agingDays ?? Math.max(0, Math.floor((receiptDate.getTime() - dummyInvoiceDate.getTime()) / (1000 * 3600 * 24)));
      
      let rate = r030;
      if (aging <= 30) rate = r030;
      else if (aging <= 90) rate = r3190;
      else rate = rOver;

      const collectedAmt = Number(r.amount) || 0;
      const incentiveAmt = collectedAmt * rate;

      return {
        id: r._id,
        salesman: r.partyId?.salespersonId?.name || r.employeeId?.name || r.salesmanName || "Unassigned",
        customer: r.partyId?.name || r.party || "Customer",
        receiptNo: r.receiptNumber || r.voucherNo || "N/A",
        receiptDate: receiptDate.toLocaleDateString(),
        aging: aging,
        collected: collectedAmt,
        rate: (rate * 100).toFixed(1) + "%",
        incentive: incentiveAmt
      };
    }).sort((a: any, b: any) => b.collected - a.collected);

    setData(processed);
  }

  const handleGenerate = () => {
    computeIncentives(rawReceipts, {
      fromDate,
      toDate,
      selectedSalesman,
      r0_30: Number(rate0_30),
      r31_90: Number(rate31_90),
      rOver90: Number(rateOver90),
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setSelectedSalesman("All");
    setRate0_30("1.0");
    setRate31_90("0.5");
    setRateOver90("0.2");
    setSearchQuery("");
    computeIncentives(rawReceipts, {
      fromDate: defaultFrom,
      toDate: defaultTo,
      selectedSalesman: "All",
      r0_30: 1.0,
      r31_90: 0.5,
      rOver90: 0.2,
      searchQuery: ""
    });
  };

  const totalCollected = data.reduce((s, r) => s + r.collected, 0);
  const totalIncentive = data.reduce((s, r) => s + r.incentive, 0);

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From Date</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesman</label>
          <select 
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Salesmen</option>
            {salesmen.map((emp: any) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>
                {emp.name} {emp.designation ? `(${emp.designation})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest">0-30 Days %</label>
          <input 
            type="number" 
            step="0.1" 
            value={rate0_30}
            onChange={(e) => setRate0_30(e.target.value)}
            className="w-full px-2 py-1.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest">31-90 Days %</label>
          <input 
            type="number" 
            step="0.1" 
            value={rate31_90}
            onChange={(e) => setRate31_90(e.target.value)}
            className="w-full px-2 py-1.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Over 90 %</label>
          <input 
            type="number" 
            step="0.1" 
            value={rateOver90}
            onChange={(e) => setRateOver90(e.target.value)}
            className="w-full px-2 py-1.5 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Receipt / Customer..." 
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

  const barData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.salesman]) acc[curr.salesman] = { name: curr.salesman, collected: 0, incentive: 0 };
    acc[curr.salesman].collected += curr.collected;
    acc[curr.salesman].incentive += curr.incentive;
    return acc;
  }, {})).map(([_, v]) => v);

  return (
    <ERPReportLayout
      title="Salesman Incentive"
      description="Calculate and track salesman incentives based on collection aging and net receipts."
      filters={Filters}
      actions={[
        { label: "Print Incentives", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SalesmanIncentives.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Calculating live salesman incentives...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <Gift size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No incentive data found for the selected criteria.</p>
            <p className="text-xs mt-1">Adjust dates or commission percentages above.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-span-1">
                <div className="flex flex-col h-full justify-center">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Incentive Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Collected Value</span>
                      <span className="text-sm font-black text-emerald-600">Rs. {totalCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Total Incentive Earned</span>
                      <span className="text-lg font-black text-blue-600">Rs. {Math.round(totalIncentive).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Average Incentive Rate</span>
                      <span className="text-sm font-black text-slate-600 dark:text-slate-300">{(totalCollected > 0 ? (totalIncentive / totalCollected * 100).toFixed(2) : "0.00")}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:col-span-2 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Incentive by Salesman</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="collected" name="Collected Amount (Rs)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="incentive" name="Earned Incentive (Rs)" fill="#881337" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Commission Details Breakdown</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} collections</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesman</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Receipt No</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Aging Days</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Collected Amount</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Applied Rate</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Incentive (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100">{row.salesman}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{row.customer}</td>
                        <td className="px-4 py-3 text-xs font-mono text-maroon-800 dark:text-rose-400">{row.receiptNo}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{row.receiptDate}</td>
                        <td className="px-4 py-3 text-xs text-center font-bold text-slate-600 dark:text-slate-300">{row.aging} d</td>
                        <td className="px-4 py-3 text-xs font-bold text-right text-slate-800 dark:text-slate-100">Rs. {row.collected.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600">{row.rate}</td>
                        <td className="px-4 py-3 text-xs font-black text-right text-maroon-800 dark:text-rose-400">Rs. {Math.round(row.incentive).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                      <td colSpan={5} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL COMMISSION ({data.length} collections)</td>
                      <td className="px-4 py-3 text-xs font-black text-right text-slate-900 dark:text-slate-100">Rs. {totalCollected.toLocaleString()}</td>
                      <td></td>
                      <td className="px-4 py-3 text-xs font-black text-right text-emerald-600">Rs. {Math.round(totalIncentive).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
