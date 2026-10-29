"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Activity, Clock, Package, CheckCircle, RotateCcw, AlertCircle, FileSpreadsheet, RefreshCw } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';

export default function OperationalMetricsReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Error fetching operational data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReset = () => {
    setDateFrom(getStartOfMonthStr());
    setDateTo(getCurrentDateStr());
    setSelectedStatus("All");
    setTaxFilter("All");
    fetchData();
  };

  const filteredOrders = useMemo(() => {
    return data.filter(s => {
      if (s.date) {
        const d = s.date.substring(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      if (selectedStatus !== "All") {
        if (selectedStatus === "Posted" && s.status !== "Posted") return false;
        if (selectedStatus === "Draft" && String(s.status || "").toLowerCase() !== "draft") return false;
        if (selectedStatus === "Returned" && s.type !== "sale_return" && s.type !== "non_tax_sale_return" && s.type !== "pos_return") return false;
        if (selectedStatus === "Cancelled" && s.status !== "Cancelled") return false;
      }
      if (taxFilter === "tax" && !s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      if (taxFilter === "non-tax" && (s.isTaxInvoice || (s.taxAmount || 0) > 0)) return false;
      return true;
    });
  }, [data, dateFrom, dateTo, selectedStatus, taxFilter]);

  const totalOrders = filteredOrders.length;
  const returns = filteredOrders.filter(s => s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return').length;
  const returnRate = totalOrders > 0 ? (returns / totalOrders * 100).toFixed(1) : "0.0";
  const shipped = filteredOrders.filter(s => s.status === 'Posted').length;
  const fulfillmentRate = totalOrders > 0 ? (shipped / totalOrders * 100).toFixed(1) : "0.0";
  const drafts = filteredOrders.filter(s => String(s.status || "").toLowerCase() === 'draft').length;

  const stats = [
    { title: "Order Fulfillment", value: `${fulfillmentRate}%`, subtitle: `Posted: ${shipped}`, icon: CheckCircle, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Transactions", value: totalOrders.toString(), subtitle: "Filtered records", icon: Clock, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Return Rate", value: `${returnRate}%`, subtitle: `Returns: ${returns}`, icon: RotateCcw, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Accuracy Rate", value: totalOrders > 0 ? `${(100 - parseFloat(returnRate)).toFixed(1)}%` : "100%", subtitle: "Target: 100%", icon: AlertCircle, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 font-bold"
          >
            <option value="All">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
            <option value="Returned">Returned</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select 
            value={taxFilter}
            onChange={(e) => setTaxFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">Both (Tax + Non-Tax)</option>
            <option value="tax">Tax Only</option>
            <option value="non-tax">Non-Tax Only</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button 
            className="flex-1 px-3 py-2 bg-maroon-800 text-white rounded-lg text-xs font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 disabled:opacity-50 cursor-pointer"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> {isLoading ? "Fetching..." : "Generate Report"}
          </button>
          <button 
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center cursor-pointer"
            onClick={handleReset}
            title="Reset Filters"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  const fulfillmentData = Object.entries(filteredOrders.reduce((acc: any, curr) => {
    const d = curr.date ? curr.date.substring(0, 10) : new Date(curr.createdAt).toLocaleDateString();
    if (!acc[d]) acc[d] = { name: d, count: 0, posted: 0 };
    acc[d].count += 1;
    if (curr.status === 'Posted') acc[d].posted += 1;
    return acc;
  }, {})).map(([_, v]: any) => ({ name: v.name, rate: (v.count > 0 ? Number((v.posted / v.count * 100).toFixed(1)) : 0) })).slice(-10);

  const leadTimeData = [
    { name: 'Mon', time: 2.1 },
    { name: 'Tue', time: 2.4 },
    { name: 'Wed', time: 1.8 },
    { name: 'Thu', time: 2.2 },
    { name: 'Fri', time: 2.0 },
  ];

  const statusPieData = [
    { name: 'Posted', value: shipped, color: '#10b981' },
    { name: 'Draft', value: drafts, color: '#f59e0b' },
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
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <Activity size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No operational records found for the selected criteria</p>
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
                      <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Area type="monotone" dataKey="rate" name="Fulfillment %" stroke="#10b981" fill="#d1fae5" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Average Processing Time (Days)</h3>
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
                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * Number(fulfillmentRate)) / 100} className="text-maroon-800" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{fulfillmentRate}%</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rate</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full px-6">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Posted Orders</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{shipped}</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Return Ratio</span>
                            <span className="text-sm font-bold text-rose-600">{returnRate}%</span>
                        </div>
                    </div>
                </div>
              </div>
            </div>
            
            <div className="px-4">
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 shrink-0">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">Operational Summary</h4>
                        <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                            Tracking {totalOrders} total operations between {dateFrom} and {dateTo}. Fulfillment efficiency stands at {fulfillmentRate}%, with {returns} return(s) ({returnRate}% return rate) and {drafts} pending draft(s).
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
