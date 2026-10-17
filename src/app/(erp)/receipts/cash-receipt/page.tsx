"use client";

import { useState, useEffect } from "react";
import CashReceiptForm from "@/components/receipts/CashReceiptForm";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { Plus, Search, Eye, Edit, Trash2, Printer, FileSpreadsheet, MessageCircle } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import PrintTemplate from "@/components/print/PrintTemplate";
import WhatsAppShareModal from "@/components/erp/whatsapp/WhatsAppShareModal";

export default function CashReceiptPage() {
  const [showForm, setShowForm] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [editReceipt, setEditReceipt] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [printReceipt, setPrintReceipt] = useState<any>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waParty, setWaParty] = useState<any>(null);
  const [waDocData, setWaDocData] = useState<any>(null);
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [rangeType, setRangeType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [receiptFilter, setReceiptFilter] = useState("all");

  useEffect(() => {
    if (printReceipt) {
      setTimeout(() => {
        window.print();
        setPrintReceipt(null);
      }, 500);
    }
  }, [printReceipt]);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      let url = `/api/cash-receipts?search=${encodeURIComponent(searchQuery)}`;
      if (rangeType !== "all") {
        url += `&rangeType=${rangeType}`;
        if (rangeType === "custom" && fromDate && toDate) {
          url += `&fromDate=${fromDate}&toDate=${toDate}`;
        }
      }
      const res = await fetch(url);
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
    fetchShopProfile();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [searchQuery, rangeType, fromDate, toDate, showForm]);

  const deleteReceipt = async (id: string) => {
    if (confirm("Are you sure you want to delete this cash receipt?")) {
      try {
        const res = await fetch(`/api/cash-receipts/${id}`, { method: "DELETE" });
        if (res.ok) {
          alert("Cash Receipt deleted successfully.");
          fetchReceipts();
        } else {
          alert("Failed to delete cash receipt.");
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (showForm) {
    return (
      <CashReceiptForm
        initialData={editReceipt}
        onClose={() => {
          setShowForm(false);
          setEditReceipt(null);
        }}
      />
    );
  }

  const filteredReceipts = receipts.filter(p => {
    const num = p.receiptNumber || "";
    const partyName = p.receiptType === "party"
      ? (p.partyId?.companyName || p.partyId?.name || p.party || "")
      : p.receiptType === "multi"
        ? "Multi-Party"
        : "Petty Contra";
    const ref = p.reference || "";
    const narr = p.narration || "";
    
    const matchesSearch = num.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          narr.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (receiptFilter === "customer") {
      return p.receiptType === "party" && p.partyId?.type === "Customer";
    }
    if (receiptFilter === "vendor") {
      return p.receiptType === "party" && p.partyId?.type === "Vendor";
    }
    if (receiptFilter === "advance") {
      return ["Advance", "Deposit", "Extra Cash"].includes(p.partyReceiptType);
    }
    if (receiptFilter === "petty") {
      return p.receiptType === "petty";
    }
    if (receiptFilter === "multi") {
      return p.receiptType === "multi";
    }
    
    return true;
  });

  return (
    <div className={`space-y-6 ${printReceipt ? 'print:hidden' : ''}`}>
      <ERPPageHeader
        title="Cash Receipt"
        description="Record and manage cash received from customers or other sources."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(receipts, "CashReceipts.xlsx"), icon: FileSpreadsheet },
        ]}
      />
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
        >
          <Plus size={18} />
          New Cash Receipt
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search receipts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-800/10 transition-all font-medium"
              />
            </div>
            
            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
                <select
                  value={receiptFilter}
                  onChange={(e) => setReceiptFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none"
                >
                  <option value="all">All Receipts</option>
                  <option value="customer">Customer Receipts</option>
                  <option value="vendor">Vendor Receipts</option>
                  <option value="advance">Advances & Deposits</option>
                  <option value="petty">Petty Receipts</option>
                  <option value="multi">Multi-Party</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Period:</span>
                <select
                  value={rangeType}
                  onChange={(e) => setRangeType(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>
            </div>
          </div>

          {rangeType === "custom" && (
            <div className="flex flex-wrap gap-4 items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Party / Account / Contra</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cash Account</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">Loading...</td></tr>
              ) : filteredReceipts.length > 0 ? (
                filteredReceipts.map((p) => {
                  const rType = p.receiptType || "party";
                  const displayParty = rType === "party"
                    ? (p.partyId?.companyName || p.partyId?.name || p.partyName || p.party || "N/A")
                    : rType === "petty"
                      ? (p.partyId ? (p.partyId?.companyName || p.partyId?.name || p.partyName || p.party || "N/A") : `Petty Contra (${p.contraLines?.length || 0} line(s))`)
                      : `Multi-Party (${p.partyLines?.length || 0} line(s))`;

                  const displayCashAcc = p.cashAccountId?.title || p.cashAccountTitle || p.cashAccount || "N/A";

                  // Category badge text
                  let categoryLabel = "Party Receipt";
                  let categoryClass = "bg-blue-100 text-blue-800";
                  if (rType === "party") {
                    const type = p.partyId?.type || "Customer";
                    categoryLabel = type === "Vendor" ? "Vendor Receipt" : "Customer Receipt";
                    categoryClass = type === "Vendor" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
                  } else if (rType === "petty") {
                    if (p.partyId) {
                      const type = p.partyId?.type || "Customer";
                      categoryLabel = type === "Vendor" ? "Petty Vendor" : "Petty Customer";
                      categoryClass = type === "Vendor" ? "bg-rose-100 text-rose-800" : "bg-indigo-100 text-indigo-800";
                    } else {
                      categoryLabel = "Petty Contra";
                      categoryClass = "bg-purple-100 text-purple-800";
                    }
                  } else if (rType === "multi") {
                    categoryLabel = "Multi-Party";
                    categoryClass = "bg-teal-100 text-teal-800";
                  }

                  return (
                    <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4"><span className="text-sm font-bold text-slate-900 dark:text-white">{p.receiptNumber}</span></td>
                      <td className="px-6 py-4"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{p.date}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${categoryClass}`}>
                          {categoryLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayParty}</span></td>
                      <td className="px-6 py-4"><span className="text-sm font-medium text-slate-600 dark:text-slate-300">{displayCashAcc}</span></td>
                      <td className="px-6 py-4 text-right"><span className="text-sm font-black text-emerald-600">PKR {(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === "Posted" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setPrintReceipt(p)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Print">
                            <Printer size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              const pName = p.receiptType === "party" ? (p.partyId?.name || p.party) : "Multiple";
                              setWaParty({ name: pName });
                              setWaDocData({
                                type: "Cash Receipt",
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
                          <button
                            onClick={() => {
                              setEditReceipt(p);
                              setShowForm(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button onClick={() => deleteReceipt(p._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-all" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-medium">No cash receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {printReceipt && (
        <PrintTemplate
          formatName="Cash Receipt"
          data={{
            receiptNo: printReceipt.receiptNumber,
            date: printReceipt.date,
            paidTo: (printReceipt.receiptType || "party") === "party" || ((printReceipt.receiptType || "party") === "petty" && printReceipt.partyId)
              ? (printReceipt.partyId?.companyName || printReceipt.partyId?.name || printReceipt.party || "Party")
              : (printReceipt.receiptType === "multi" ? "Multi-Party" : "Petty Contra"),
            total: printReceipt.amount,
            subtotal: printReceipt.amount,
            taxAmount: 0,
            discountAmount: 0
          }}
          items={
            (printReceipt.receiptType || "party") === "party"
              ? [{ description: printReceipt.narration || "Cash Received", qty: 1, unitPrice: printReceipt.amount, total: printReceipt.amount }]
              : printReceipt.receiptType === "petty"
                ? (printReceipt.partyId
                    ? [{ description: printReceipt.narration || "Petty Cash Received", qty: 1, unitPrice: printReceipt.amount, total: printReceipt.amount }]
                    : (printReceipt.contraLines || []).map((l: any) => ({ description: `${l.accountTitle}: ${l.description || 'Contra'}`, qty: 1, unitPrice: l.amount, total: l.amount }))
                  )
                : (printReceipt.partyLines || []).map((l: any) => ({ description: `${l.partyName} (Ref: ${l.invoiceRef || 'N/A'})`, qty: 1, unitPrice: l.amount, total: l.amount }))
          }
        />
      )}

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
