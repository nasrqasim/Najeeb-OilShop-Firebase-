"use client";

import React, { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, ShoppingBag, RotateCcw as RotateLeft, TrendingUp, Percent, Scissors, Calculator, FileSpreadsheet, Play } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function PurchaseSummaryReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedTaxFilter, setSelectedTaxFilter] = useState("Both");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [purRes, vRes, empRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/parties?type=vendor'),
        fetch('/api/employees')
      ]);
      const [purJson, vJson, empJson] = await Promise.all([
        purRes.json(),
        vRes.json(),
        empRes.json()
      ]);

      if (vJson.ok && Array.isArray(vJson.data)) setVendors(vJson.data);
      if (empJson.ok && Array.isArray(empJson.data)) setEmployees(empJson.data);

      if (purJson.ok && purJson.data) {
        const transformed = purJson.data.map((p: any) => ({
          id: p._id,
          date: new Date(p.date || p.createdAt).toLocaleDateString(),
          rawDate: new Date(p.date || p.createdAt),
          docNo: p.invoiceNo || p.docNo || "N/A",
          badge: p.type === 'purchase_return' ? 'PR' : p.type === 'purchase_order' ? 'PO' : 'PI',
          vendorInv: p.reference || "-",
          vendor: p.partyId?.name || p.partyId?.companyName || p.party || "-",
          vendorId: p.partyId?._id || p.partyId || p.party,
          emp: p.employeeId?.name || "-",
          empId: p.employeeId?._id || p.employeeId,
          gross: p.subTotal || 0,
          discount: p.discountAmount || 0,
          gst: p.taxAmount || 0,
          wht: p.whtAmount || 0,
          net: p.totalAmount || 0,
          isTax: Boolean(p.taxAmount && p.taxAmount > 0) || p.type === 'purchase_invoice',
          status: p.status || "Posted",
          statusColor: "text-emerald-600 bg-emerald-50",
          badgeColor: p.type === 'purchase_return' ? "text-rose-600 bg-rose-50 border-rose-200" : "text-blue-600 bg-blue-50 border-blue-200"
        }));
        setData(transformed);
      }
    } catch (error) {
      console.error("Error fetching purchase summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Infinity;

    return data.filter(d => {
      if (!d.rawDate) return true;
      const txTime = d.rawDate.getTime();
      if (txTime < fromTime || txTime > toTime) return false;
      if (selectedVendor !== "All" && d.vendorId !== selectedVendor && d.vendor !== selectedVendor) return false;
      if (selectedEmployee !== "All" && d.empId !== selectedEmployee && d.emp !== selectedEmployee) return false;
      if (selectedStatus !== "All" && d.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (selectedTaxFilter === "Tax Only" && !d.isTax) return false;
      if (selectedTaxFilter === "Non-Tax Only" && d.isTax) return false;
      return true;
    });
  }, [data, fromDate, toDate, selectedVendor, selectedEmployee, selectedStatus, selectedTaxFilter]);

  const totalPurchases = filteredData.filter(d => d.badge !== 'PR').reduce((acc, curr) => acc + curr.net, 0);
  const totalReturns = filteredData.filter(d => d.badge === 'PR').reduce((acc, curr) => acc + curr.net, 0);
  const totalGst = filteredData.reduce((acc, curr) => acc + curr.gst, 0);
  const totalWht = filteredData.reduce((acc, curr) => acc + curr.wht, 0);

  const stats = [
    { title: "TOTAL PURCHASES", value: `Rs. ${totalPurchases.toLocaleString()}`, subtitle: `${filteredData.filter(d => d.badge !== 'PR').length} invoices`, icon: ShoppingBag, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "TOTAL RETURNS", value: `Rs. ${totalReturns.toLocaleString()}`, subtitle: `${filteredData.filter(d => d.badge === 'PR').length} returns`, icon: RotateLeft, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "NET PURCHASES", value: `Rs. ${(totalPurchases - totalReturns).toLocaleString()}`, subtitle: "PI - PR", icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: "text-emerald-600" },
    { title: "TOTAL GST", value: `Rs. ${totalGst.toLocaleString()}`, subtitle: "Input tax", icon: Percent, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "TOTAL WHT DEDUCTED", value: `Rs. ${totalWht.toLocaleString()}`, subtitle: "Withholding tax", icon: Scissors, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
    { title: "AVG PURCHASE VALUE", value: `Rs. ${filteredData.length > 0 ? (totalPurchases / filteredData.length).toFixed(0) : 0}`, subtitle: "Per invoice", icon: Calculator, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
  ];

  const handleReset = () => {
    setFromDate(getStartOfMonthStr());
    setToDate(getCurrentDateStr());
    setSelectedVendor("All");
    setSelectedEmployee("All");
    setSelectedStatus("All");
    setSelectedTaxFilter("Both");
  };

  const Filters = (
    <div className="flex flex-col md:flex-row justify-between items-end gap-4 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</label>
          <select 
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v._id || v.id} value={v._id || v.id}>{v.name || v.companyName}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employee</label>
          <select 
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Employees</option>
            {employees.map((emp: any) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select 
            value={selectedTaxFilter}
            onChange={(e) => setSelectedTaxFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="Both">Both (Tax + Non-Tax)</option>
            <option value="Tax Only">Tax Only</option>
            <option value="Non-Tax Only">Non-Tax Only</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={handleReset}
          title="Reset Filters"
          className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
        >
          <RotateCcw size={14} />
        </button>
        <button 
          onClick={fetchData}
          className="px-3 py-1.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm shadow-maroon-900/20"
        >
          <Play size={12} /> Generate
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Purchase Summary"
      description="Consolidated overview of all purchase invoices, returns, GST input taxes, and net procurement values."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Summary", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "PurchaseSummary.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc No</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Inv#</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employee</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Gross</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Disc</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">GST</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Net Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    Loading purchase summary...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    No purchase records found matching the selected dates and filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.docNo}</td>
                    <td className="px-4 py-3 text-[11px]">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${row.badgeColor}`}>
                        {row.badge}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-500">{row.vendorInv}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-900 dark:text-white">{row.vendor}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">{row.emp}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-slate-600 dark:text-slate-400">Rs. {row.gross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-slate-500">{row.discount > 0 ? `Rs. ${row.discount.toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-slate-500">{row.gst > 0 ? `Rs. ${row.gst.toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-900 dark:text-white text-right">Rs. {row.net.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              {filteredData.length > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                  <td colSpan={7} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">
                    Grand Total ({filteredData.length} records)
                  </td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {filteredData.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {filteredData.reduce((s, r) => s + r.discount, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {totalGst.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-maroon-800 dark:text-rose-400">Rs. {filteredData.reduce((s, r) => s + (r.badge === 'PR' ? -r.net : r.net), 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ERPReportLayout>
  );
}
