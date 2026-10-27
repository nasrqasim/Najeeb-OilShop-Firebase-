"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Award, Users, DollarSign, TrendingUp, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';

export default function SalespersonPerformanceReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

        if (salesJson.ok && salesJson.data) {
          const personMap: any = {};
          
          // Helper to get or create person
          const getPerson = (name: string, region: string = "N/A") => {
            if (!personMap[name]) {
              personMap[name] = { name, region, target: 100000, sales: 0, collections: 0 };
            }
            return personMap[name];
          };

          salesJson.data.forEach((s: any) => {
            const name = s.employeeId?.name || "Unassigned";
            const person = getPerson(name, s.partyId?.region || "N/A");
            const factor = (s.type === 'sale_return' || s.type === 'non_tax_sale_return') ? -1 : 1;
            person.sales += (s.totalAmount || 0) * factor;
          });

          const processCollections = (json: any) => {
            if (json.ok && json.data) {
              json.data.forEach((r: any) => {
                // Try to link collection to salesperson via party's default salesperson if not directly linked
                const name = r.employeeId?.name || r.partyId?.salespersonId?.name || "Unassigned";
                const person = getPerson(name);
                person.collections += (r.amount || 0);
              });
            }
          };

          processCollections(cashJson);
          processCollections(bankJson);

          const performance = Object.values(personMap).map((p: any) => ({
            ...p,
            target: 100000, // Static target for now
            pending: p.sales - p.collections,
            achievement: p.sales > 0 ? (p.sales / 100000 * 100).toFixed(2) + "%" : "0.00%"
          })).sort((a: any, b: any) => b.sales - a.sales);

          setData(performance);
        }
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalSales = data.reduce((s, p) => s + p.sales, 0);
  const totalCollections = data.reduce((s, p) => s + p.collections, 0);

  const stats = [
    { title: "Total Salespersons", value: data.length.toString(), icon: Users, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: "text-emerald-600" },
    { title: "Total Collections", value: `Rs. ${totalCollections.toLocaleString()}`, icon: TrendingUp, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Avg Sale per Person", value: `Rs. ${data.length > 0 ? (totalSales / data.length).toLocaleString() : "0"}`, icon: Award, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
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
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salesperson</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Salespersons</option>
          </select>
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

  const barData = data.map(p => ({
    name: p.name,
    sales: p.sales,
    collections: p.collections
  }));

  const composedData = data.map(p => ({
    name: p.name,
    target: p.target,
    sales: p.sales
  }));

  return (
    <ERPReportLayout
      title="Salesperson Performance"
      description="Comparative analysis of salesperson achievements against targets, sales, and collections."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Performance", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SalespersonPerformance.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live performance data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50/50 mx-4">
            <Award size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No salesperson data found for the selected criteria</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Performance Details</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} salespersons</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salesperson</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Region</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Target</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Total Sales</th>
                      <th className="px-4 py-3 text-[9px] font-black text-blue-600 uppercase tracking-widest text-right">Collections</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Pending Balance</th>
                      <th className="px-4 py-3 text-[9px] font-black text-amber-600 uppercase tracking-widest text-right">Achievement %</th>
                    </tr>
                  </thead>
                   <tbody className="divide-y divide-slate-100">
                    {data.map((row, i) => {
                      const achNum = parseFloat(row.achievement);
                      const achColor = achNum >= 100 ? "text-emerald-600 bg-emerald-50/50" : achNum >= 80 ? "text-amber-600 bg-amber-50/50" : "text-rose-600 bg-rose-50/50";
                      
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-slate-100">{row.name}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.region}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.target.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-emerald-700 text-right bg-emerald-50/30">{row.sales.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[11px] font-black text-blue-700 text-right bg-blue-50/30">{row.collections.toLocaleString()}</td>
                          <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.pending.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-[11px] font-black text-right ${achColor}`}>{row.achievement}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-black">
                      <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-600 dark:text-slate-300">{data.reduce((s, p) => s + p.target, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{totalSales.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-blue-700">{totalCollections.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-rose-700">{data.reduce((s, p) => s + p.pending, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-700">{(totalSales / (data.reduce((s, p) => s + p.target, 0) || 1) * 100).toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Sales vs Target Achievement</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={composedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="sales" name="Actual Sales" fill="#10b981" barSize={30} />
                      <Line type="step" dataKey="target" name="Target" stroke="#881337" strokeWidth={3} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Sales vs Collections by Person</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                      <Bar dataKey="sales" name="Sales" fill="#10b981" barSize={20} />
                      <Bar dataKey="collections" name="Collections" fill="#3b82f6" barSize={20} />
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
