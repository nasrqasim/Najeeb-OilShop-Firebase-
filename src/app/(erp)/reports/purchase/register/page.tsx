"use client";

import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import React, { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, FileText, ShoppingCart, DollarSign, Percent, Search, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

export default function PurchaseRegisterReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedDocType, setSelectedDocType] = useState("All");
  const [selectedTaxFilter, setSelectedTaxFilter] = useState("Both");
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

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
        const transformed = purJson.data.map((p: any) => {
          const rawDate = new Date(p.date || p.createdAt);
          return {
            id: p._id,
            rawDate,
            date: rawDate.toLocaleDateString(),
            docNo: p.invoiceNo || p.docNo || "N/A",
            vendorInv: p.reference || "-",
            type: p.type?.toUpperCase().replace('_', ' ') || "PURCHASE",
            rawType: p.type,
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
            statusColor: "text-emerald-600 bg-emerald-50"
          };
        });
        setData(transformed);
      }
    } catch (error) {
      console.error("Error fetching purchase register:", error);
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
    const q = searchTerm.toLowerCase().trim();

    return data.filter(row => {
      const txTime = row.rawDate.getTime();
      if (txTime < fromTime || txTime > toTime) return false;
      if (selectedDocType !== "All" && row.type !== selectedDocType && row.rawType !== selectedDocType) return false;
      if (selectedTaxFilter === "Tax Only" && !row.isTax) return false;
      if (selectedTaxFilter === "Non-Tax Only" && row.isTax) return false;
      if (selectedVendor !== "All" && row.vendorId !== selectedVendor && row.vendor !== selectedVendor) return false;
      if (selectedEmployee !== "All" && row.empId !== selectedEmployee && row.emp !== selectedEmployee) return false;
      if (selectedStatus !== "All" && row.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (q && !(
        (row.docNo || "").toLowerCase().includes(q) ||
        (row.vendor || "").toLowerCase().includes(q) ||
        (row.vendorInv || "").toLowerCase().includes(q) ||
        (row.type || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [data, fromDate, toDate, selectedDocType, selectedTaxFilter, selectedVendor, selectedEmployee, selectedStatus, searchTerm]);

  const stats = [
    { title: "Total Documents", value: filteredData.length.toString(), icon: FileText, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Gross Amount", value: `Rs. ${filteredData.reduce((s, r) => s + r.gross, 0).toLocaleString()}`, icon: ShoppingCart, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "Total Net Amount", value: `Rs. ${filteredData.reduce((s, r) => s + r.net, 0).toLocaleString()}`, icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "Total GST", value: `Rs. ${filteredData.reduce((s, r) => s + r.gst, 0).toLocaleString()}`, icon: Percent, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const handleReset = () => {
    setFromDate(getStartOfMonthStr());
    setToDate(getCurrentDateStr());
    setSelectedDocType("All");
    setSelectedTaxFilter("Both");
    setSelectedVendor("All");
    setSelectedEmployee("All");
    setSelectedStatus("All");
    setSearchTerm("");
  };

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc Type</label>
          <select 
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Types</option>
            <option value="PURCHASE INVOICE">Purchase Invoice</option>
            <option value="NON TAX PURCHASE INVOICE">Non-Tax Purchase</option>
            <option value="PURCHASE RETURN">Purchase Return</option>
            <option value="PURCHASE ORDER">Purchase Order</option>
          </select>
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
      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by doc number, vendor invoice number, or vendor name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" 
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleReset}
            title="Reset Filters"
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <RotateCcw size={14} />
          </button>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-maroon-800 text-white rounded-lg text-xs font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
          >
            <Play size={14} /> Generate
          </button>
        </div>
      </div>
    </div>
  );

  const getTypeColor = (type: string) => {
    if (type.includes("RETURN")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (type.includes("ORDER")) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  return (
    <ERPReportLayout
      title="Purchase Register"
      description="Detailed log of all vendor purchase transactions, goods received notes, and return documents."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Register", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "PurchaseRegister.xlsx"), icon: FileSpreadsheet },
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
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Gross</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Discount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">GST</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Net Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    Loading purchase register...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-xs font-bold text-slate-400">
                    No purchase register entries found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.docNo}</td>
                    <td className="px-4 py-3 text-[11px]">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getTypeColor(row.type)}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-900 dark:text-white">{row.vendor}</td>
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
                  <td colSpan={5} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">
                    Grand Total ({filteredData.length} records)
                  </td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {filteredData.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {filteredData.reduce((s, r) => s + r.discount, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right">Rs. {filteredData.reduce((s, r) => s + r.gst, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[11px] text-right text-maroon-800 dark:text-rose-400">Rs. {filteredData.reduce((s, r) => s + (r.rawType === 'purchase_return' ? -r.net : r.net), 0).toLocaleString()}</td>
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
