"use client";

import { useState, useEffect } from "react";
import BankReceiptForm from "@/components/receipts/BankReceiptForm";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileSpreadsheet, MessageCircle } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import WhatsAppShareModal from "@/components/erp/whatsapp/WhatsAppShareModal";

export default function BankReceiptPage() {
  const [showForm, setShowForm] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waParty, setWaParty] = useState<any>(null);
  const [waDocData, setWaDocData] = useState<any>(null);
  const [shopProfile, setShopProfile] = useState<any>(null);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bank-receipts");
      const json = await res.json();
      if (json.ok) setReceipts(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShopProfile = async () => {
    try {
      const res = await fetch("/api/shop-profile");
      const json = await res.json();
      if (json.ok) setShopProfile(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReceipts();
    fetchShopProfile();
  }, [showForm]);

  const deleteReceipt = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete? (Yes / No)")) return;
    try {
      await fetch(`/api/bank-receipts/${id}`, { method: "DELETE" });
      fetchReceipts();
    } catch (e) { console.error(e); }
  };

  if (showForm) {
    return <BankReceiptForm onClose={() => setShowForm(false)} />;
  }

  const filteredReceipts = receipts.filter(p => p.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || p.party?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Bank Receipt"
        description="Record and manage bank receipts."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(receipts, "BankReceipts.xlsx"), icon: FileSpreadsheet },
        ]}
      />
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
        >
          <Plus size={18} />
          New Bank Receipt
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Party / Account</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Account</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">Loading...</td></tr>
              ) : filteredReceipts.length > 0 ? (
                filteredReceipts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900 dark:text-white">{p.receiptNumber}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{p.date}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.party}</span></td>
                    <td className="px-6 py-4"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">{p.bankAccount}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-black text-emerald-600">PKR {(p.amount||0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === "Posted" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 transition-opacity">
                        <button 
                          onClick={() => {
                            setWaParty({ name: p.party });
                            setWaDocData({
                              type: "Bank Receipt",
                              amount: p.amount,
                              date: p.date,
                              receiptNumber: p.receiptNumber
                            });
                            setIsWhatsAppModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-all" title="WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button onClick={() => deleteReceipt(p._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No bank receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WhatsAppShareModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={waParty}
        type="Receipt"
        documentData={waDocData}
        shopProfile={shopProfile}
      />
    </div>
  );
}
