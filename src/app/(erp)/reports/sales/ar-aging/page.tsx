"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Users, DollarSign, Clock, AlertTriangle, AlertOctagon, TrendingUp, Search, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ARAgingReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, cashRes, bankRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts')
        ]);
        const [salesJson, cashJson, bankJson] = await Promise.all([
          salesRes.json(),
          cashRes.json(),
          bankRes.json()
        ]);

        const customerMap: any = {};
        const today = new Date();

        if (salesJson.ok && salesJson.data) {
          salesJson.data.forEach((s: any) => {
            const isReturn = (s.type === 'sale_return' || s.type === 'non_tax_sale_return');
            const key = s.partyId?._id || "walk-in";
            if (!customerMap[key]) {
              customerMap[key] = {
                id: key,
                customerCode: s.partyId?.code || "WALK-001",
                customerName: s.partyId?.name || s.partyId?.companyName || s.customerName || "Walk-in",
                current: 0, day30: 0, day60: 0, day90: 0, total: 0
              };
            }
            const amount = (s.totalAmount || 0) * (isReturn ? -1 : 1);
            const invDate = new Date(s.date);
            const diffDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

            if (diffDays <= 30) customerMap[key].current += amount;
            else if (diffDays <= 60) customerMap[key].day30 += amount;
            else if (diffDays <= 90) customerMap[key].day60 += amount;
            else customerMap[key].day90 += amount;
            customerMap[key].total += amount;
          });
        }

        const processReceipts = (receipts: any[]) => {
          receipts?.forEach((r: any) => {
            const key = r.partyId?._id;
            if (!key || !customerMap[key]) return;
            // Subtract payments from the oldest buckets first
            let payment = r.amount || 0;
            const buckets = ['day90', 'day60', 'day30', 'current'];
            for (const b of buckets) {
              if (payment <= 0) break;
              if (customerMap[key][b] > 0) {
                const deduction = Math.min(payment, customerMap[key][b]);
                customerMap[key][b] -= deduction;
                payment -= deduction;
              }
            }
            customerMap[key].total -= (r.amount || 0);
          });
        };

        if (cashJson.ok) processReceipts(cashJson.data);
        if (bankJson.ok) processReceipts(bankJson.data);

        setData(Object.values(customerMap).filter((c: any) => c.total > 0));
      } catch (error) {
        console.error("Error fetching AR aging:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalReceivable = data.reduce((s, r) => s + r.total, 0);
  const totalCurrent = data.reduce((s, r) => s + r.current, 0);
  const total30 = data.reduce((s, r) => s + r.day30, 0);
  const total60 = data.reduce((s, r) => s + r.day60, 0);
  const total90 = data.reduce((s, r) => s + r.day90, 0);

  const stats = [
    { title: "Total Receivable", value: `Rs. ${totalReceivable.toLocaleString()}`, subtitle: `${data.length} customers`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Current (0-30 Days)", value: `Rs. ${totalCurrent.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((totalCurrent / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Overdue 31-60 Days", value: `Rs. ${total30.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total30 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: Clock, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Overdue 61-90 Days", value: `Rs. ${total60.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total60 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: AlertTriangle, iconColor: "text-orange-600", iconBg: "bg-orange-50" },
    { title: "Overdue 90+ Days", value: `Rs. ${total90.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total90 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: AlertOctagon, iconColor: "text-rose-600", iconBg: "bg-rose-50", wrapperClass: "border-l-4 border-l-rose-500" },
  ];

  const Filters = (
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 w-full">
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">As Of Date</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Customers</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Area</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Areas</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Region</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Regions</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aging Buckets</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Default (30-day)</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Min Balance</label>
          <input type="number" placeholder="0" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-2">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">&nbsp;</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" size={12} />
            <input type="text" placeholder="Search customer code or name..." className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Download size={14} /> CSV
        </button>
        <button className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={() => setHasSearched(!hasSearched)}
        >
          <Play size={14} /> Generate
        </button>
      </div>
    </div>
  );


  const pieData = [
    { name: 'Current (0-30)', value: totalCurrent, color: '#10b981' },
    { name: '31-60 Days', value: total30, color: '#f59e0b' },
    { name: '61-90 Days', value: total60, color: '#ea580c' },
    { name: '90+ Days', value: total90, color: '#e11d48' },
  ];

  const barData = data.slice(0, 10).map(r => ({
    name: r.customerName,
    current: r.current,
    day30: r.day30,
    day60: r.day60,
    day90: r.day90
  }));

  return (
    <ERPReportLayout
      title="AR Aging"
      description="Accounts receivable aging report categorized by time buckets (0-30, 31-60, 61-90, 90+ days)."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Aging", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "ARAging.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live receivable aging...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Clock size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No outstanding receivables found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Aging Distribution</h3>
                <div className="h-48 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:col-span-2 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top Customer Receivables by Age</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Bar dataKey="current" stackId="a" name="Current" fill="#10b981" barSize={40} />
                      <Bar dataKey="day30" stackId="a" name="31-60 Days" fill="#f59e0b" barSize={40} />
                      <Bar dataKey="day60" stackId="a" name="61-90 Days" fill="#ea580c" barSize={40} />
                      <Bar dataKey="day90" stackId="a" name="90+ Days" fill="#e11d48" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Receivables Aging Details</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} customers</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer Code</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer Name</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Current (0-30)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right">31-60 Days</th>
                      <th className="px-4 py-3 text-[9px] font-black text-orange-600 uppercase tracking-widest text-right">61-90 Days</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">90+ Days</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Total Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((row: any, i: number) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 cursor-pointer hover:underline">{row.customerCode}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-200">{row.customerName}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200 text-right bg-emerald-50/30">{row.current.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-amber-700 text-right bg-amber-50/30">{row.day30.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-orange-700 text-right bg-orange-50/30">{row.day60.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-rose-700 text-right bg-rose-50/30">{row.day90.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-blue-600 text-right bg-blue-50/30">{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalCurrent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-amber-700">{total30.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-orange-700">{total60.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{total90.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{totalReceivable.toLocaleString()}</td>
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
