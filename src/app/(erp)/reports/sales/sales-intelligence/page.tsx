"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, ShoppingCart, Percent, DollarSign, MapPin, Users, BarChart3, TrendingUp, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';

export default function SalesIntelligenceReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const salesRes = await fetch('/api/sales');
        const salesJson = await salesRes.json();

        if (salesJson.ok && salesJson.data) {
          setData(salesJson.data);
          const qts = salesJson.data.filter((s: any) => s.type === 'quotation');
          setQuotations(qts);
        }
      } catch (error) {
        console.error("Error fetching intelligence data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const siOnly = data.filter(s => s.type === 'sale' || s.type === 'sale_invoice' || s.type === 'non_tax_sale' || s.type === 'non_tax_sale_invoice' || s.type === 'pos_counter_sale');
  const totalRevenue = siOnly.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const uniqueCustomers = new Set(siOnly.map(s => s.partyId?._id)).size;
  const avgOrderValue = siOnly.length > 0 ? totalRevenue / siOnly.length : 0;
  const totalQtValue = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const conversionRate = quotations.length > 0 ? (siOnly.length / quotations.length * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Total Quotations", value: quotations.length.toString(), subtitle: `Rs. ${totalQtValue.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Conversion Rate", value: `${conversionRate}%`, subtitle: "SI count / total QT", icon: Percent, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, subtitle: "Posted invoices", icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "Top Customer", value: "Multiple", subtitle: "Based on volume", icon: MapPin, iconColor: "text-orange-600", iconBg: "bg-orange-50" },
    { title: "Unique Customers", value: uniqueCustomers.toString(), subtitle: "With posted invoices", icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
    { title: "Avg Order Value", value: `Rs. ${avgOrderValue.toLocaleString()}`, subtitle: "Total SI / Count SI", icon: BarChart3, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getStartOfMonthStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Customers</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Region</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Regions</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Area</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Areas</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Group By</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Monthly</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1">
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

  const revenueData = Object.entries(siOnly.reduce((acc: any, curr) => {
    const d = new Date(curr.date).toLocaleString('default', { month: 'short' });
    if (!acc[d]) acc[d] = { name: d, revenue: 0, target: totalRevenue / 12 };
    acc[d].revenue += curr.totalAmount || 0;
    return acc;
  }, {})).map(([_, v]) => v);

  const conversionData = [
    { name: 'Current Period', quotations: quotations.length, orders: siOnly.length, invoices: siOnly.length, rate: parseFloat(conversionRate) },
  ];

  const regionData = Object.entries(siOnly.reduce((acc: any, curr) => {
    const reg = curr.partyId?.region || "Unassigned";
    if (!acc[reg]) acc[reg] = { name: reg, value: 0 };
    acc[reg].value += curr.totalAmount || 0;
    return acc;
  }, {})).map(([_, v]) => v).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

  const customerRetentionData = Object.entries(siOnly.reduce((acc: any, curr) => {
    const d = new Date(curr.date).toLocaleString('default', { month: 'short' });
    if (!acc[d]) acc[d] = { name: d, new: 0, returning: 0 };
    acc[d].returning += 1;
    return acc;
  }, {})).map(([_, v]) => v);

  return (
    <ERPReportLayout
      title="Sales Intelligence Report"
      description="Comprehensive sales data analysis including conversion rates, customer retention, and regional performance."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(revenueData, "SalesIntelligence.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Analyzing live intelligence data...</p>
          </div>
        ) : siOnly.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <TrendingUp size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No sales data found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Revenue vs Target Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="revenue" name="Actual Revenue" fill="#10b981" barSize={30} radius={[4, 4, 0, 0]} />
                      <Line type="step" dataKey="target" name="Target Revenue" stroke="#e11d48" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Customer Acquisition & Retention</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={customerRetentionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Area type="monotone" dataKey="returning" name="Returning Customers" stackId="1" stroke="#3b82f6" fill="#bfdbfe" />
                      <Area type="monotone" dataKey="new" name="New Customers" stackId="1" stroke="#f59e0b" fill="#fde68a" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Conversion Funnel (Quotations → Invoices)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={conversionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis yAxisId="left" tick={{fontSize: 10}} />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar yAxisId="left" dataKey="quotations" name="Quotations" fill="#94a3b8" barSize={15} />
                      <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#3b82f6" barSize={15} />
                      <Bar yAxisId="left" dataKey="invoices" name="Invoices" fill="#10b981" barSize={15} />
                      <Line yAxisId="right" type="monotone" dataKey="rate" name="Conversion %" stroke="#e11d48" strokeWidth={2} dot={{r: 4}} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Sales by Region</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{fontSize: 10}} />
                      <YAxis dataKey="name" type="category" tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Bar dataKey="value" name="Revenue" fill="#881337" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="px-4 mt-2">
               <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-4">
                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                    <BarChart3 size={20} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">Live Intelligence Insights</h4>
                    <p className="text-xs text-blue-800/80 leading-relaxed">
                        Total revenue of Rs. {totalRevenue.toLocaleString()} across {siOnly.length} invoices. Conversion rate from quotations is {conversionRate}%. The average order value stands at Rs. {avgOrderValue.toLocaleString()}.
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
