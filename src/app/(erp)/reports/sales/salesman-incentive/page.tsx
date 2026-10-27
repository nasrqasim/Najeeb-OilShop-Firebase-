"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Gift, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SalesmanIncentiveReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [cashRes, bankRes] = await Promise.all([
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts')
        ]);
        const [cashJson, bankJson] = await Promise.all([
          cashRes.json(),
          bankRes.json()
        ]);

        const allReceipts = [
          ...(cashJson.ok ? cashJson.data : []),
          ...(bankJson.ok ? bankJson.data : [])
        ];

        const today = new Date();
        const processed = allReceipts.map((r: any) => {
          const receiptDate = new Date(r.date);
          // For demo, we calculate aging based on receipt date vs a dummy invoice date (e.g., 45 days prior)
          // In a real system, this would come from receipt-to-invoice allocation records
          const dummyInvoiceDate = new Date(receiptDate.getTime() - (45 * 24 * 3600 * 1000));
          const aging = Math.floor((receiptDate.getTime() - dummyInvoiceDate.getTime()) / (1000 * 3600 * 24));
          
          let rate = 0.01; // Default 1%
          if (aging <= 30) rate = 0.01;
          else if (aging <= 90) rate = 0.005;
          else rate = 0.002;

          return {
            id: r._id,
            salesman: r.partyId?.salespersonId?.name || r.employeeId?.name || "Unassigned",
            receiptNo: r.receiptNumber || r.voucherNo || "N/A",
            receiptDate: receiptDate.toLocaleDateString(),
            invoiceNo: "INV-" + (r.receiptNumber || "001"),
            invoiceDate: dummyInvoiceDate.toLocaleDateString(),
            aging: aging,
            collected: r.amount || 0,
            rate: (rate * 100).toFixed(1) + "%",
            incentive: ((r.amount || 0) * rate).toFixed(2)
          };
        }).sort((a: any, b: any) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime());

        setData(processed);
      } catch (error) {
        console.error("Error fetching incentives:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalCollected = data.reduce((s, r) => s + r.collected, 0);
  const totalIncentive = data.reduce((s, r) => s + parseFloat(r.incentive), 0);

  const Filters = (
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getStartOfMonthStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salesman</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Salesmen</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-rose-600">0-30 Days %</label>
          <input type="number" defaultValue="1" step="0.1" className="w-full px-2 py-1.5 bg-rose-50/50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-amber-600">31-90 Days %</label>
          <input type="number" defaultValue="0.5" step="0.1" className="w-full px-2 py-1.5 bg-amber-50/50 border border-amber-200 text-amber-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-orange-600">Over 90 %</label>
          <input type="number" defaultValue="0.5" step="0.1" className="w-full px-2 py-1.5 bg-orange-50/50 border border-orange-200 text-orange-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
      </div>
      
      <div className="flex justify-end gap-2 shrink-0">
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={() => setHasSearched(!hasSearched)}
        >
          <Play size={14} /> Generate Report
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> CSV
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
      </div>
    </div>
  );

  const barData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.salesman]) acc[curr.salesman] = { name: curr.salesman, collected: 0, incentive: 0 };
    acc[curr.salesman].collected += curr.collected;
    acc[curr.salesman].incentive += parseFloat(curr.incentive);
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
            <p className="text-sm font-bold">Fetching live incentives...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Gift size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No incentive data found for the selected criteria.</p>
            <p className="text-xs mt-1">Ensure receipts have invoice allocations.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm md:col-span-1">
                <div className="flex flex-col h-full justify-center">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Incentive Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-800">Total Collected Value</span>
                      <span className="text-sm font-black text-emerald-600">Rs. {totalCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                      <span className="text-xs font-bold text-blue-800">Total Incentive Earned</span>
                      <span className="text-lg font-black text-blue-600">Rs. {totalIncentive.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50/50 border border-slate-100 dark:border-slate-800">
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
                    <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis yAxisId="left" tick={{fontSize: 10}} />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar yAxisId="left" dataKey="collected" name="Collected Amount" fill="#10b981" barSize={30} />
                      <Bar yAxisId="right" dataKey="incentive" name="Incentive Earned" fill="#3b82f6" barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Incentive Details</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} records</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salesman</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Receipt #</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Receipt Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest">Invoice #</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-center">Aging (Days)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Collected Amt</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Incentive Rate</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Incentive Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-slate-100">{row.salesman}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-emerald-700 cursor-pointer hover:underline">{row.receiptNo}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.receiptDate}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-blue-700 cursor-pointer hover:underline">{row.invoiceNo}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.invoiceDate}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-amber-600 text-center bg-amber-50/30">{row.aging}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-emerald-700 text-right bg-emerald-50/30">{row.collected.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center">{row.rate}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-blue-700 text-right bg-blue-50/30">{row.incentive}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={7} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalCollected.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center"></td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{totalIncentive.toLocaleString()}</td>
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
