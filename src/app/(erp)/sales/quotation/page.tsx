"use client";

import { useState, useEffect } from "react";
import QuotationForm from "@/components/sales/QuotationForm";
import QuotationDetails from "@/components/sales/QuotationDetails";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText, Send, CheckCircle2, Clock, Printer, FileSpreadsheet, MessageCircle } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import WhatsAppShareModal from "@/components/erp/whatsapp/WhatsAppShareModal";

export default function QuotationPage() {
  const [showForm, setShowForm] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<any | null>(null);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waParty, setWaParty] = useState<any>(null);
  const [waDocData, setWaDocData] = useState<any>(null);
  const [shopProfile, setShopProfile] = useState<any>(null);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/invoices?type=quotation", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setQuotations(json.data);
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
    fetchQuotations();
    fetchShopProfile();
  }, [showForm]);

  const deleteQuotation = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQuotations(prev => prev.filter(q => q._id !== id));
      } else {
        window.alert("Failed to delete");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (showForm) {
    return <QuotationForm 
      onClose={() => {
        setShowForm(false);
        setEditOrder(null);
      }} 
      initialData={editOrder}
    />;
  }

  if (viewQuotation) {
    return (
      <QuotationDetails 
        record={viewQuotation} 
        onClose={() => setViewQuotation(null)} 
        onEdit={() => {
          setEditOrder(viewQuotation);
          setShowForm(true);
          setViewQuotation(null);
        }} 
      />
    );
  }

  const filteredQuotations = quotations.filter(q => 
    (q.invoiceNo?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (q.partyId?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (q.partyId?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Quotation"
        description="Manage customer estimates and proposals."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(quotations, "Quotations.xlsx"), icon: FileSpreadsheet },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-maroon-50 text-maroon-800 rounded-xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Quotes</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{quotations.length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Accepted</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{quotations.filter(q => q.status === "accepted").length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Send size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sent</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{quotations.filter(q => q.status === "sent" || q.status === "posted").length}</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Drafts</p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{quotations.filter(q => q.status === "draft").length}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filters & Search Row */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by quotation#, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditOrder(null); setShowForm(true); }}
              className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
            >
              <Plus size={18} />
              New Quote
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
              <tr className="bg-slate-50 dark:bg-slate-800/50/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quotation #</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valid Until</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount (PKR)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">Loading...</td></tr>
              ) : filteredQuotations.length > 0 ? (
                filteredQuotations.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-maroon-800 transition-colors">{q.invoiceNo}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">{q.date ? q.date.split('T')[0] : "-"}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 dark:text-slate-300">{q.validUntil ? q.validUntil.split('T')[0] : "-"}</td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">{q.partyId?.companyName || q.partyId?.name || "N/A"}</td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 dark:text-white">{q.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>

                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        q.status === "accepted" ? "bg-emerald-100 text-emerald-700" : 
                        q.status === "sent" || q.status === "posted" ? "bg-blue-100 text-blue-700" : 
                        "bg-orange-100 text-orange-700"
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewQuotation(q)} className="p-1.5 text-slate-300 hover:text-maroon-800 hover:bg-maroon-50 rounded-lg transition-all" title="View">
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setWaParty(q.partyId || { name: q.customerName, phone: q.customerPhone, address: q.customerAddress });
                            setWaDocData({ ...q, rows: q.lines || q.items, lines: q.lines || q.items });
                            setIsWhatsAppModalOpen(true);
                          }}
                          className="p-1.5 text-slate-300 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-all" title="WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditOrder(q); setShowForm(true); }}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => deleteQuotation(q._id)}
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
                  <td colSpan={7} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">No quotations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WhatsAppShareModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={waParty}
        type="Invoice"
        documentData={waDocData}
        shopProfile={shopProfile}
      />
    </div>
  );
}
