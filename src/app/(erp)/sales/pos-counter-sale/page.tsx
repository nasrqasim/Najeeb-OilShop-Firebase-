"use client";

import { useState, useEffect } from "react";
import POSCounterSaleForm from "@/components/sales/POSCounterSaleForm";
import POSViewModal from "@/components/sales/POSViewModal";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  Wallet,
  User,
  LayoutGrid,
  Printer,
  FileSpreadsheet
} from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

interface POSSale {
  id: string;
  receiptNo: string;
  date: string;
  customer: string;
  total: number;
  paymentMethod: string;
  status: "Completed" | "Draft" | "Returned";
}


export default function POSCounterSalePage() {
  const [showPOS, setShowPOS] = useState(false);
  const [viewSale, setViewSale] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/invoices?type=sale", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setSales(json.data);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const deleteSale = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete? (Yes / No)")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSales(prev => prev.filter(s => s._id !== id));
      } else {
        window.alert("Failed to delete record");
      }
    } catch (e) { console.error(e); }
  };

  if (showPOS) {
    return <POSCounterSaleForm onClose={() => { setShowPOS(false); fetchSales(); }} />;
  }

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="POS Counter Sale"
        description="Fast retail checkout for walk-in customers."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(sales, "POSSales.xlsx"), icon: FileSpreadsheet },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded-xl flex items-center justify-center">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Today&apos;s Sales</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{sales.length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Cash</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              Rs.{sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0).toLocaleString('en-US')}
            </h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Completed</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{sales.filter(s => s.status === "posted").length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <LayoutGrid size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Drafts</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">0</h4>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters & Search Row */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by receipt#, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPOS(true)}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Plus size={18} />
              New Sale
            </button>
            <button className="p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Receipt #</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Total (PKR)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{sale.invoiceNo}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">
                      {sale.date ? sale.date.split('T')[0] : "-"}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
                      {sale.partyId?.companyName || sale.partyId?.name || "Walk-in"}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{sale.paymentMethod || "Credit"}</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white">{(sale.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        sale.status === "posted" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {sale.status === "posted" ? "Completed" : "Draft"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={printPage}
                          className="p-1.5 text-slate-300 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all" title="Print"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => setViewSale(sale)}
                          className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => deleteSale(sale._id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">No POS sales found today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <POSViewModal 
        isOpen={!!viewSale} 
        onClose={() => setViewSale(null)} 
        sale={viewSale} 
      />
    </div>
  );
}
