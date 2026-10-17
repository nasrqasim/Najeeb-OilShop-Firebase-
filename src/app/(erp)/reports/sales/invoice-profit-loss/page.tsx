"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, TrendingUp, TrendingDown, DollarSign, Percent, FileText, RotateCcw, RefreshCw, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ComposedChart, Line } from 'recharts';

export default function InvoiceProfitLossReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/sales');
        const json = await res.json();
        if (json.ok && json.data) {
          const invoices = json.data
            .filter((s: any) => s.type !== 'quotation' && s.type !== 'sale_order')
            .map((s: any) => {
              const isReturn = (s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return');
              let cost = 0;
              s.lines?.forEach((line: any) => {
                const rate = Number(line.itemId?.purchaseRate ?? line.purchaseRate ?? line.cost ?? 0);
                cost += rate * (Number(line.qty) || 0);
              });
              const revenue = isReturn ? 0 : (s.totalAmount || 0);
              const returns = isReturn ? (s.totalAmount || 0) : 0;
              const grossProfit = isReturn ? -cost : (revenue - cost);
            
            return {
              id: s._id,
              date: new Date(s.date).toLocaleDateString(),
              invoiceNo: s.invoiceNo || s.docNo || "N/A",
              customer: s.partyId?.name || "Cash Customer",
              revenue,
              cost,
              grossProfit,
              returns,
              netProfit: grossProfit,
              margin: revenue > 0 ? (grossProfit / revenue * 100).toFixed(2) + "%" : "0.00%"
            };
          }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setData(invoices);
        }
      } catch (error) {
        console.error("Error fetching invoice P&L:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalRev = data.reduce((s, i) => s + i.revenue, 0);
  const totalCost = data.reduce((s, i) => s + i.cost, 0);
  const totalGross = data.reduce((s, i) => s + i.grossProfit, 0);
  const totalReturns = data.reduce((s, i) => s + i.returns, 0);
  const totalNet = totalGross;

  const stats = [
    { title: "Total Revenue", value: `Rs. ${totalRev.toLocaleString()}`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Cost", value: `Rs. ${totalCost.toLocaleString()}`, icon: TrendingDown, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Gross Profit", value: `Rs. ${totalGross.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Returns", value: `Rs. ${totalReturns.toLocaleString()}`, icon: RotateCcw, iconColor: "text-orange-600", iconBg: "bg-orange-50" },
    { title: "Net Profit", value: `Rs. ${totalNet.toLocaleString()}`, icon: DollarSign, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Avg Margin", value: `${(totalRev > 0 ? (totalNet / totalRev * 100).toFixed(2) : "0.00")}%`, icon: Percent, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-3">
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue="2026-03-31" />
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue="2026-04-29" />
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Customers</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Region</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Regions</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Area</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Areas</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salesperson</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Salespersons</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Job</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Jobs</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Location</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Locations</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Include Returns</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Yes</option>
            <option>No</option>
          </select>
        </div>
        
        {/* Next Row */}
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trend Group By</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Monthly</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-100 flex items-center justify-center gap-1.5">
          <RefreshCw size={14} /> Update Cost Prices
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> Export CSV
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={() => setHasSearched(!hasSearched)}
        >
          <Play size={14} /> Generate Report
        </button>
      </div>
    </div>
  );

  const trendData = Object.entries(data.reduce((acc: any, curr) => {
    const d = curr.date;
    if (!acc[d]) acc[d] = { name: d, revenue: 0, cost: 0, profit: 0, returns: 0, net: 0 };
    acc[d].revenue += curr.revenue;
    acc[d].cost += curr.cost;
    acc[d].profit += curr.grossProfit;
    acc[d].returns += curr.returns;
    acc[d].net += curr.netProfit;
    return acc;
  }, {})).map(([_, v]) => v).slice(-10);

  const barData = data.slice(0, 10).map(i => ({
    name: i.invoiceNo,
    revenue: i.revenue,
    cost: i.cost,
    profit: i.grossProfit
  }));

  return (
    <ERPReportLayout
      title="Invoice-wise Profit & Loss"
      description="Profitability tracking for each sale invoice, considering revenue, cost, and any returns."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print P&L", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "InvoiceProfitLoss.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live invoice P&L...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No invoices found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Invoice Profitability</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} invoices</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice No</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Revenue</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Cost</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Gross Profit</th>
                      <th className="px-4 py-3 text-[9px] font-black text-orange-600 uppercase tracking-widest text-right">Returns</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Net Profit</th>
                      <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.invoiceNo}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200">{row.customer}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-emerald-700 text-right bg-emerald-50/30">{row.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-rose-700 text-right bg-rose-50/30">{row.cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-blue-700 text-right bg-blue-50/30">{row.grossProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-orange-700 text-right bg-orange-50/30">{row.returns.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.netProfit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-amber-700 text-right bg-amber-50/30">{row.margin}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalRev.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{totalCost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{totalGross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-orange-700">{totalReturns.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-800 dark:text-slate-100">{totalNet.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-amber-700">{(totalRev > 0 ? (totalNet / totalRev * 100).toFixed(2) : "0.00")}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Profitability Trend Over Time</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" barSize={30} />
                      <Bar dataKey="cost" name="Cost" fill="#e11d48" barSize={30} />
                      <Line type="monotone" dataKey="profit" name="Gross Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top Invoices by Gross Profit</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 10}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" barSize={15} />
                      <Bar dataKey="profit" name="Gross Profit" fill="#3b82f6" barSize={15} />
                    </BarChart>
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
