"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, ShoppingCart, RotateCcw as RotateLeft, DollarSign, TrendingUp, CreditCard, Clock, RefreshCw, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from 'recharts';

export default function POSSalesReportPage() {
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
          // Filter for POS-like sales (Cash or Card)
          const posSales = json.data.filter((s: any) => 
            (s.paymentMethod === 'Cash' || s.paymentMethod === 'Card') && s.type === 'sale'
          ).map((s: any) => ({
            id: s._id,
            date: new Date(s.date).toLocaleString(),
            receipt: s.invoiceNo || s.docNo || "N/A",
            terminal: "Term-1", // Placeholder or from metadata if available
            cashier: s.employeeId?.name || "System",
            gross: s.subTotal || 0,
            tax: s.taxAmount || 0,
            net: s.totalAmount || 0,
            payment: s.paymentMethod || "Cash",
            hour: new Date(s.date).getHours() + ":00"
          }));
          setData(posSales);
        }
      } catch (error) {
        console.error("Error fetching POS sales:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalSales = data.reduce((s, r) => s + r.net, 0);
  const cashCollected = data.filter(r => r.payment === 'Cash').reduce((s, r) => s + r.net, 0);
  const cardCollected = data.filter(r => r.payment === 'Card').reduce((s, r) => s + r.net, 0);
  const avgSale = data.length > 0 ? totalSales / data.length : 0;

  const stats = [
    { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, subtitle: `${data.length} transactions`, icon: ShoppingCart, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Returns", value: "Rs. 0", subtitle: "0 transactions", icon: RotateLeft, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Net Sales", value: `Rs. ${totalSales.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Average Sale", value: `Rs. ${avgSale.toLocaleString()}`, icon: TrendingUp, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    
    // Payment Method Breakdown
    { title: "Cash Collected", value: `Rs. ${cashCollected.toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Card Collected", value: `Rs. ${cardCollected.toLocaleString()}`, icon: CreditCard, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "On Credit", value: "Rs. 0", icon: DollarSign, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input type="date" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getStartOfMonthStr()} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input type="date" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Region</label>
          <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Regions</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Area</label>
          <select className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Areas</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> Export CSV
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-4 py-2 bg-maroon-800 text-white rounded-lg text-xs font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={() => setHasSearched(!hasSearched)}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
    </div>
  );

  const pieData = [
    { name: 'Cash', value: cashCollected, color: '#10b981' },
    { name: 'Card', value: cardCollected, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const hourlyData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.hour]) acc[curr.hour] = { hour: curr.hour, sales: 0 };
    acc[curr.hour].sales += curr.net;
    return acc;
  }, {})).map(([_, v]) => v).sort((a: any, b: any) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <ERPReportLayout
      title="POS Sales Report"
      description="Real-time retail sales tracking, payment methods, and terminal activity."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print POS Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "POSSales.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live POS sales...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <ShoppingCart size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No POS transactions found for the selected date range</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Sales by Payment Method</h3>
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
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Hourly Sales Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hour" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="sales" name="Sales Amount" stroke="#881337" strokeWidth={2} dot={{ fill: '#881337', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">POS Receipts</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} records</span>
              </div>
              <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date/Time</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Receipt #</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Terminal</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cashier</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Gross</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Tax</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Amount</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.receipt}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.terminal}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.cashier}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.gross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.tax.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-blue-600 text-right">{row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${row.payment === 'Cash' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>
                          {row.payment}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} records)</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.tax, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-blue-600">{totalSales.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
