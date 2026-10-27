"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import React, { useState, useEffect } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Package, Hash, ShoppingCart, DollarSign, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ItemPurchaseAnalysisReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/purchases');
        const json = await res.json();
        if (json.ok && json.data) {
          const itemMap = new Map();
          json.data.forEach((p: any) => {
            const isReturn = p.type === 'purchase_return';
            (p.lines || []).forEach((line: any) => {
              const itemId = line.itemId?._id || "unknown";
              if (!itemMap.has(itemId)) {
                itemMap.set(itemId, {
                  id: itemId,
                  itemCode: line.itemId?.code || "-",
                  itemName: line.itemId?.name || "Unknown Item",
                  category: line.itemId?.categoryId?.name || "-",
                  unit: line.itemId?.unitId?.name || "Pcs",
                  qtyPurchased: 0,
                  qtyReturned: 0,
                  totalAmount: 0
                });
              }
              const item = itemMap.get(itemId);
              if (isReturn) {
                item.qtyReturned += line.quantity || 0;
                item.totalAmount -= line.total || 0;
              } else {
                item.qtyPurchased += line.quantity || 0;
                item.totalAmount += line.total || 0;
              }
            });
          });

          const list = Array.from(itemMap.values());
          const totalNetAmt = list.reduce((s, r) => s + r.totalAmount, 0);
          setData(list.map(r => ({
            ...r,
            netQty: r.qtyPurchased - r.qtyReturned,
            avgCost: r.qtyPurchased > 0 ? (r.totalAmount / (r.qtyPurchased - r.qtyReturned || 1)).toFixed(2) : 0,
            percent: totalNetAmt > 0 ? ((r.totalAmount / totalNetAmt) * 100).toFixed(1) + "%" : "0%"
          })));
        }
      } catch (error) {
        console.error("Error fetching item analysis:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalItems = data.length;
  const totalQty = data.reduce((s, r) => s + r.netQty, 0);
  const totalAmt = data.reduce((s, r) => s + r.totalAmount, 0);

  const stats = [
    { title: "Items Purchased", value: totalItems.toString(), icon: Package, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Net Qty", value: totalQty.toString(), icon: Hash, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Purchase Amount", value: `Rs. ${totalAmt.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Avg Unit Cost", value: `Rs. ${totalQty > 0 ? (totalAmt / totalQty).toFixed(2) : 0}`, icon: DollarSign, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-3">
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
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Categories</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sub Category</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Sub Categories</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Items</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Vendors</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>All Statuses</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Both (Tax + Non-Tax)</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20">
          <Play size={14} /> Generate Report
        </button>
      </div>
    </div>
  );


  const barData = data.map(d => ({ name: d.itemName, value: d.totalAmount })).sort((a, b) => b.value - a.value).slice(0, 15);

  const pieData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.category]) acc[curr.category] = 0;
    acc[curr.category] += curr.totalAmount;
    return acc;
  }, {})).map(([name, value], idx) => ({
    name: `${name}`,
    value,
    color: ['#881337', '#be123c', '#e11d48', '#fb7185', '#fda4af'][idx % 5]
  }));

  return (
    <ERPReportLayout
      title="Item Purchase Analysis"
      description="Reports / Purchase Reports / Item Purchase Analysis"
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Analysis", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "ItemPurchaseAnalysis.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Code</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unit</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Qty Purchased</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Qty Returned</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Net Qty</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Avg Cost</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Total Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors">
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50/50">{row.itemCode}</td>
                  <td className="px-4 py-3 text-[11px] font-bold text-blue-600 cursor-pointer hover:underline">{row.itemName}</td>
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.category}</td>
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.unit}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.qtyPurchased}</td>
                  <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.qtyReturned}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">{row.netQty}</td>
                  <td className="px-4 py-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-right">{row.avgCost}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-rose-800 text-right bg-rose-50/30">{row.percent}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">Totals ({data.length} items)</td>
                <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.qtyPurchased, 0)}</td>
                <td className="px-4 py-3 text-[11px] text-right text-rose-600">{data.reduce((s, r) => s + r.qtyReturned, 0)}</td>
                <td className="px-4 py-3 text-[11px] text-right text-emerald-600">{totalQty}</td>
                <td className="px-4 py-3 text-[11px] text-right">-</td>
                <td className="px-4 py-3 text-[11px] text-right">{totalAmt.toLocaleString()}</td>
                <td className="px-4 py-3 text-[11px] text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Top 15 Items by Purchase Amount</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Purchase Amount" fill="#881337" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Purchase by Category</h3>
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
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
