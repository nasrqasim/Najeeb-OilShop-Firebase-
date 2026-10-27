"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, FileText, ShoppingCart, Percent, RotateCcw, Activity, ArrowRight, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from 'recharts';

export default function SaleActivityReportPage() {
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
        console.error("Error fetching sale activity:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const quotations = data.filter(s => s.type === 'quotation');
  const orders = data.filter(s => s.type === 'sale_order');
  const invoices = data.filter(s => s.type === 'sale' || s.type === 'non_tax_sale');
  const returns = data.filter(s => s.type === 'sale_return' || s.type === 'non_tax_sale_return');

  const qtTotal = quotations.reduce((s, r) => s + r.totalAmount, 0);
  const soTotal = orders.reduce((s, r) => s + r.totalAmount, 0);
  const siTotal = invoices.reduce((s, r) => s + r.totalAmount, 0);
  const retTotal = returns.reduce((s, r) => s + r.totalAmount, 0);

  const conversionRate = quotations.length > 0 ? (invoices.length / quotations.length * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Total Quotations", value: quotations.length.toString(), icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Total Invoices", value: invoices.length.toString(), icon: FileText, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Conversion Rate (QT → SI)", value: `${conversionRate}%`, subtitle: `QT → SO: ${(quotations.length > 0 ? (orders.length / quotations.length * 100).toFixed(1) : "0.0")}% | SO → SI: ${(orders.length > 0 ? (invoices.length / orders.length * 100).toFixed(1) : "0.0")}%`, icon: Percent, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-3">
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26...</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getStartOfMonthStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input type="date" className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" defaultValue={getCurrentDateStr()} />
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Document Type</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Types</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-1 xl:col-span-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
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
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Group By</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Monthly</option>
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

  const groupedByPeriod = data.reduce((acc: any, curr) => {
    const period = new Date(curr.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[period]) acc[period] = { period, quotations: 0, orders: 0, invoices: 0, returns: 0, net: 0 };
    if (curr.type === 'quotation') acc[period].quotations++;
    else if (curr.type === 'sale_order') acc[period].orders++;
    else if (curr.type === 'sale' || curr.type === 'non_tax_sale') {
      acc[period].invoices++;
      acc[period].net += curr.totalAmount;
    }
    else if (curr.type === 'sale_return' || curr.type === 'non_tax_sale_return') {
      acc[period].returns++;
      acc[period].net -= curr.totalAmount;
    }
    return acc;
  }, {});

  const periodData = Object.values(groupedByPeriod).map((p: any) => ({
    ...p,
    avgValue: p.invoices > 0 ? (p.net / p.invoices).toFixed(2) : "0.00",
    growth: "-"
  }));

  const lineData = periodData.map((p: any) => ({
    name: p.period,
    invoiceAmt: p.net, // Simplified for trend
    netAmt: p.net
  }));

  const stackedData = periodData.map((p: any) => ({
    name: p.period,
    quotations: p.quotations,
    orders: p.orders,
    invoices: p.invoices,
    returns: p.returns
  }));

  const avgData = periodData.map((p: any) => ({
    name: p.period,
    avgValue: parseFloat(p.avgValue),
    netAmount: p.net
  }));

  const FlowNode = ({ icon: Icon, title, count, amount, colorClass, borderClass }: any) => (
    <div className={`flex flex-col items-center justify-center p-4 w-32 border rounded-xl bg-white dark:bg-slate-900 shadow-sm ${borderClass}`}>
      <div className={`p-2 rounded-lg mb-2 ${colorClass}`}>
        <Icon size={16} />
      </div>
      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">{title}</span>
      <span className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{count}</span>
      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Rs.{amount}</span>
    </div>
  );

  return (
    <ERPReportLayout
      title="Sale Activity"
      description="Conversion tracking from quotations to orders and invoices, with trend analysis."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Activity", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SaleActivity.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live sale activity...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Activity size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No sale activity found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sale Activity by Period</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{periodData.length} periods</span>
              </div>
              <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Period</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Quotations</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Orders</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Invoices</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Returns</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Amount</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Avg Value</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Growth %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodData.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-700 dark:text-slate-200">{row.period}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-amber-600 text-center bg-amber-50/30">{row.quotations}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-blue-600 text-center bg-blue-50/30">{row.orders}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-emerald-600 text-center bg-emerald-50/30">{row.invoices}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-center bg-rose-50/30">{row.returns}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.avgValue}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.growth}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({periodData.length} periods)</td>
                    <td className="px-4 py-3 text-[11px] text-center">{quotations.length}</td>
                    <td className="px-4 py-3 text-[11px] text-center">{orders.length}</td>
                    <td className="px-4 py-3 text-[11px] text-center">{invoices.length}</td>
                    <td className="px-4 py-3 text-[11px] text-center">{returns.length}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{siTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{(siTotal / (invoices.length || 1)).toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Quotation to Order to Invoice Flow</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded text-[9px] uppercase tracking-wider font-bold">Conversion tracking</span>
              </div>
              <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 flex flex-wrap items-center justify-center gap-4 overflow-x-auto">
                <FlowNode icon={FileText} title="QUOTATIONS" count={quotations.length.toString()} amount={qtTotal.toLocaleString()} colorClass="bg-amber-100 text-amber-600" borderClass="border-amber-100" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-blue-600 mb-1">{(quotations.length > 0 ? (orders.length / quotations.length * 100).toFixed(0) : "0")}%</span>
                  <ArrowRight className="text-slate-300" size={20} />
                </div>
                <FlowNode icon={ShoppingCart} title="SALE ORDERS" count={orders.length.toString()} amount={soTotal.toLocaleString()} colorClass="bg-blue-100 text-blue-600" borderClass="border-blue-200" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-emerald-600 mb-1">{(orders.length > 0 ? (invoices.length / orders.length * 100).toFixed(0) : "0")}%</span>
                  <ArrowRight className="text-slate-300" size={20} />
                </div>
                <FlowNode icon={FileText} title="SALE INVOICES" count={invoices.length.toString()} amount={siTotal.toLocaleString()} colorClass="bg-emerald-100 text-emerald-600" borderClass="border-emerald-200" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-rose-600 mb-1">{(invoices.length > 0 ? (returns.length / invoices.length * 100).toFixed(0) : "0")}%</span>
                  <ArrowRight className="text-slate-300" size={20} />
                </div>
                <FlowNode icon={RotateCcw} title="RETURNS" count={returns.length.toString()} amount={retTotal.toLocaleString()} colorClass="bg-rose-100 text-rose-600" borderClass="border-rose-200" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:col-span-2">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Sale Trend Over Time (Monthly)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                      <Line type="monotone" dataKey="invoiceAmt" name="Invoice Amount" stroke="#d6a383" strokeWidth={2} dot={{ fill: '#d6a383', r: 4 }} />
                      <Line type="monotone" dataKey="netAmt" name="Net Amount" stroke="#881337" strokeWidth={2} dot={{ fill: '#881337', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Document Count by Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="quotations" stackId="a" name="Quotations" fill="#d97706" barSize={40} />
                      <Bar dataKey="orders" stackId="a" name="Orders" fill="#2563eb" barSize={40} />
                      <Bar dataKey="invoices" stackId="a" name="Invoices" fill="#059669" barSize={40} />
                      <Bar dataKey="returns" stackId="a" name="Returns" fill="#e11d48" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Average Sale Value</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={avgData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis yAxisId="left" tick={{fontSize: 10}} />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar yAxisId="left" dataKey="avgValue" name="Avg Value" fill="#fecdd3" barSize={20} stroke="#881337" />
                      <Line yAxisId="right" type="monotone" dataKey="netAmount" name="Net Amount" stroke="#d6a383" strokeWidth={2} dot={{ fill: '#d6a383', r: 4 }} />
                    </ComposedChart>
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
