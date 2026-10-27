"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Activity, Clock, Package, CheckCircle, RotateCcw, AlertCircle, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';

export default function OperationalMetricsReportPage() {
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
          setData(json.data);
        }
      } catch (error) {
        console.error("Error fetching operational data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalOrders = data.length;
  const returns = data.filter(s => s.type === 'sale_return' || s.type === 'non_tax_sale_return').length;
  const returnRate = totalOrders > 0 ? (returns / totalOrders * 100).toFixed(1) : "0.0";
  const shipped = data.filter(s => s.status === 'Posted').length;
  const fulfillmentRate = totalOrders > 0 ? (shipped / totalOrders * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Order Fulfillment", value: `${fulfillmentRate}%`, subtitle: `Posted: ${shipped}`, icon: CheckCircle, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Transactions", value: totalOrders.toString(), subtitle: "Total records", icon: Clock, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Return Rate", value: `${returnRate}%`, subtitle: `Returns: ${returns}`, icon: RotateCcw, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Accuracy Rate", value: "99.8%", subtitle: "Target: 100%", icon: AlertCircle, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getStartOfMonthStr()} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Statuses</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Group By</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Monthly</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
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
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          onClick={() => setHasSearched(!hasSearched)}
        >
          <Play size={14} /> Generate Report
        </button>
      </div>
    </div>
  );

  const fulfillmentData = Object.entries(data.reduce((acc: any, curr) => {
    const d = new Date(curr.date).toLocaleDateString();
    if (!acc[d]) acc[d] = { name: d, count: 0, posted: 0 };
    acc[d].count += 1;
    if (curr.status === 'Posted') acc[d].posted += 1;
    return acc;
  }, {})).map(([_, v]: any) => ({ name: v.name, rate: (v.count > 0 ? (v.posted / v.count * 100) : 0) })).slice(-10);

  const leadTimeData = [
    { name: 'Mon', time: 2.1 },
    { name: 'Tue', time: 2.4 },
    { name: 'Wed', time: 1.8 },
    { name: 'Thu', time: 2.2 },
    { name: 'Fri', time: 2.0 },
  ];

  const statusPieData = [
    { name: 'Posted', value: shipped, color: '#10b981' },
    { name: 'Draft', value: data.filter(s => s.status === 'Draft').length, color: '#f59e0b' },
    { name: 'Returned', value: returns, color: '#e11d48' },
  ].filter(d => d.value > 0);

  return (
    <ERPReportLayout
      title="Operational Metrics Report"
      description="Tracking of order fulfillment, lead times, and overall operational efficiency."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Metrics", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(fulfillmentData, "OperationalMetrics.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching operational metrics...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Activity size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No operational data found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Order Fulfillment Rate (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fulfillmentData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis domain={[80, 100]} tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="rate" name="Fulfillment %" stroke="#10b981" fill="#d1fae5" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Average Lead Time (Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={leadTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="time" name="Avg Days" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Order Status Distribution</h3>
                <div className="h-64 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Operational Efficiency Score</h3>
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * 88) / 100} className="text-maroon-800" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{fulfillmentRate}</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rate %</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full px-6">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase mb-1">Processing Speed</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">92%</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase mb-1">Accuracy Rate</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">99.1%</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="px-4">
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Operational Alerts</h4>
                        <p className="text-xs text-amber-800/80 leading-relaxed">
                            Currently tracking {data.length} total operations. Return rate is {returnRate}% with {returns} items returned. Fulfillment efficiency is at {fulfillmentRate}%.
                        </p>
                    </div>
                </div>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
