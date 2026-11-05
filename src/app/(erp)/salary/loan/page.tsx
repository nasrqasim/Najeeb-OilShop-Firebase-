"use client";

import { useState, useEffect } from "react";
import LoanForm from "@/components/salary/LoanRequestForm";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

export default function SalaryLoanPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/salary-loans");
      const json = await res.json();
      if (json.ok) setRecords(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [showForm]);

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete? (Yes / No)")) return;
    setRecords(records.filter(r => r._id !== id));
    try {
      await fetch(`/api/salary-loans/${id}`, { method: "DELETE" });
    } catch (e) { console.error(e); }
  };

  if (showForm) {
    return <LoanForm onClose={() => { setShowForm(false); setSelectedRecord(null); }} initialData={selectedRecord} />;
  }

  const filteredRecords = records.filter(p => p.voucherNo?.toLowerCase().includes(searchQuery.toLowerCase()) || p.employee?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Salary Loan"
        description="Manage long-term employee loans and their monthly deduction schedules."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(records, "SalaryLoans.xlsx"), icon: FileSpreadsheet },
        ]}
      />
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
        >
          <Plus size={18} />
          New Loan
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search loans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-800/10 transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Voucher No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Loan Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Installments</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monthly Ded.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">Loading...</td></tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900 dark:text-white">{p.voucherNo}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{p.date}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.employee}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-black text-maroon-800">PKR {(p.amount||0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4 text-center"><span className="text-sm font-bold text-slate-600">{p.installments}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-medium text-slate-500">{(p.monthlyDeduction||0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === "Active" ? "bg-emerald-100 text-emerald-700" : p.status === "Completed" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedRecord(p); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteRecord(p._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">No salary loans found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
