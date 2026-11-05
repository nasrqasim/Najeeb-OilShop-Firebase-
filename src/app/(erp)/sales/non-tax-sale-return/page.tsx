"use client";

import { useState, useEffect } from "react";
import NonTaxSaleReturnForm from "@/components/sales/NonTaxSaleReturnForm";
import NonTaxSaleReturnDetails from "@/components/sales/NonTaxSaleReturnDetails";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { Plus, Search, Filter, Eye, Edit, Trash2, RotateCcw, FileWarning, CheckCircle2, Clock, Wallet, Printer, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

interface NonTaxReturn {
  id: string;
  returnNo: string;
  date: string;
  customer: string;
  invoiceRef: string;
  amount: number;
  status: "Draft" | "Posted" | "Cancelled";
}

const initialReturns: NonTaxReturn[] = [
  {
    id: "1",
    returnNo: "NTR-2026-00001",
    date: "2026-04-28",
    customer: "Walk-in Customer",
    invoiceRef: "NTI-2026-00001",
    amount: 5200.00,
    status: "Posted"
  },
  {
    id: "2",
    returnNo: "NTR-2026-00002",
    date: "2026-04-29",
    customer: "Local Retailer",
    invoiceRef: "NTI-2026-00015",
    amount: 1850.00,
    status: "Posted"
  },
  {
    id: "3",
    returnNo: "NTR-DUMMY",
    date: "2026-04-30",
    customer: "General Transport",
    invoiceRef: "NTI-DUMMY",
    amount: 450.00,
    status: "Draft"
  }
];

export default function NonTaxSaleReturnPage() {
  const [showForm, setShowForm] = useState(false);
  const [viewReturn, setViewReturn] = useState<any | null>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/invoices?type=non_tax_sale_return", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setReturns(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [showForm]);

  const deleteReturn = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete? (Yes / No)")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReturns(prev => prev.filter(r => r._id !== id));
      } else {
        window.alert("Failed to delete");
      }
    } catch (e) { console.error(e); }
  };

  if (showForm) {
    return <NonTaxSaleReturnForm onClose={() => setShowForm(false)} />;
  }

  if (viewReturn) {
    return (
      <NonTaxSaleReturnDetails 
        record={viewReturn} 
        onClose={() => setViewReturn(null)} 
        onEdit={() => {
          setShowForm(true);
          setViewReturn(null);
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Non-Tax Sale Return (Credit Note)"
        description="Process returns from non-registered customers."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(returns, "NonTaxSaleReturns.xlsx"), icon: FileSpreadsheet },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <RotateCcw size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Returns</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{returns.length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Posted</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{returns.filter(r => r.status?.toLowerCase() === "posted").length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded-xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Credit Value</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              Rs.{returns.reduce((acc, r) => acc + (r.totalAmount || r.amount || 0), 0).toLocaleString('en-US')}
            </h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Drafts</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{returns.filter(r => r.status?.toLowerCase() === "draft").length}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters & Search Row */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by return#, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none">
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Posted">Posted</option>
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
            >
              <Plus size={18} />
              New Return
            </button>
            <button className="p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800 dark:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Return #</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice Ref</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (PKR)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">Loading...</td></tr>
              ) : returns.length > 0 ? (
                returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-maroon-800 transition-colors">{ret.invoiceNo || ret.returnNo}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">{ret.date ? ret.date.split('T')[0] : "-"}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">{ret.partyId?.companyName || ret.partyId?.name || ret.customer}</td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">{ret.reference || ret.invoiceRef}</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white">{(ret.totalAmount || ret.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>

                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ret.status?.toLowerCase() === "posted" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewReturn(ret)} className="p-1.5 text-slate-300 hover:text-maroon-800 hover:bg-maroon-50 rounded-lg transition-all" title="View">
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={printPage}
                          className="p-1.5 text-slate-300 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all" title="Print"
                        >
                          <Printer size={16} />
                        </button>
                        <button className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => deleteReturn(ret._id)}
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
                  <td colSpan={7} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">No returns found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
