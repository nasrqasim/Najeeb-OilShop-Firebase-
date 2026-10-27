"use client";

import { useState, useEffect } from "react";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import ERPDataTable from "@/components/erp/ui/ERPDataTable";
import CustomerModal from "@/components/erp/maintain/CustomerModal";
import QuickReceiptModal from "@/components/erp/maintain/QuickReceiptModal";
import WhatsAppShareModal from "@/components/erp/whatsapp/WhatsAppShareModal";
import CustomerProfileHistory from "@/components/erp/maintain/CustomerProfileHistory";
import { Plus, FileText, Download, Printer, UserCheck, UserX, Wallet, Search, Edit2, Trash2, MapPin, FileSpreadsheet, ArrowLeft, Play, Calendar, MessageCircle } from "lucide-react";
import ERPStatCard from "@/components/erp/ui/ERPStatCard";
import { exportToExcel, downloadTemplate, printPage, triggerFileInput, importFromExcel } from "@/lib/excel";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

export default function CustomersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waParty, setWaParty] = useState<any>(null);
  const [waDocData, setWaDocData] = useState<any>(null);
  const [waType, setWaType] = useState<"Statement" | "Reminder">("Reminder");

  // Ledger state variables
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<any>(null);
  const [ledgerFromDate, setLedgerFromDate] = useState(getStartOfMonthStr());
  const [ledgerToDate, setLedgerToDate] = useState(getCurrentDateStr());
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [shopProfile, setShopProfile] = useState<any>(null);

  const formatBalance = (val: number) => {
    if (val === undefined || val === null) return "Rs. 0";
    if (val < 0) {
      return `-Rs. ${Math.abs(val).toLocaleString()}`;
    }
    return `Rs. ${val.toLocaleString()}`;
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/parties?type=customer");
      const json = await res.json();
      if (json.ok) {
        setCustomers(json.data);
      }
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
    fetchCustomers();
    fetchShopProfile();

    // Default dates: start of current month to today/end of month
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setLedgerFromDate(`${year}-${month}-01`);
    setLedgerToDate(`${year}-${month}-${day}`);
  }, []);

  const handleAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleImport = async () => {
    const file = await triggerFileInput();
    if (file) {
      const data = await importFromExcel(file);
      console.log("Imported data:", data);
      alert("Bulk import completed successfully.");
      fetchCustomers();
    }
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        const res = await fetch(`/api/parties/${id}`, { method: "DELETE" });
        if (res.ok) {
          fetchCustomers();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSave = async (data: any) => {
    const payload = {
      ...data,
      companyName: data.name, 
      name: data.name || "Unknown",
      code: data.code || `CUST-${Date.now()}`,
      type: "Customer"
    };

    try {
      if (selectedCustomer?._id) {
        const res = await fetch(`/api/parties/${selectedCustomer._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) fetchCustomers();
      } else {
        const res = await fetch("/api/parties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    }
    setIsModalOpen(false);
  };

  // Dynamic Ledger Fetching and Calculation
  const handleOpenLedger = async (customer: any) => {
    setSelectedLedgerCustomer(customer);
    setIsLedgerLoading(true);
    try {
      const [salesRes, cashRes, bankRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/cash-receipts"),
        fetch("/api/bank-receipts")
      ]);
      const [salesJson, cashJson, bankJson] = await Promise.all([
        salesRes.json(),
        cashRes.json(),
        bankRes.json()
      ]);

      const txs: any[] = [];

      // 1. Process Sales & Returns
      if (salesJson.ok && salesJson.data) {
        salesJson.data.forEach((s: any) => {
          const match = s.partyId?._id === customer._id || s.customerName === customer.name || s.customerName === customer.companyName;
          if (match) {
            const isReturn = s.type === "sale_return" || s.type === "non_tax_sale_return";
            txs.push({
              date: new Date(s.date || s.createdAt),
              voucherNo: s.invoiceNo,
              type: isReturn ? "Sale Return" : "Sale Invoice",
              remarks: s.notes || (isReturn ? "Goods Returned" : `Sales invoice posted (${s.paymentMethod || 'Credit'})`),
              debit: isReturn ? 0 : s.totalAmount || 0,
              credit: isReturn ? s.totalAmount || 0 : 0
            });
          }
        });
      }

      // 2. Process Cash Receipts
      if (cashJson.ok && cashJson.data) {
        cashJson.data.forEach((r: any) => {
          const match = r.party === customer._id || r.party === customer.name || r.party === customer.companyName;
          if (match) {
            txs.push({
              date: new Date(r.date || r.createdAt),
              voucherNo: r.receiptNumber,
              type: "Cash Receipt",
              remarks: r.remarks || "Payment received via Cash",
              debit: 0,
              credit: r.amount || 0
            });
          }
        });
      }

      // 3. Process Bank Receipts
      if (bankJson.ok && bankJson.data) {
        bankJson.data.forEach((r: any) => {
          const match = r.party === customer._id || r.party === customer.name || r.party === customer.companyName;
          if (match) {
            txs.push({
              date: new Date(r.date || r.createdAt),
              voucherNo: r.receiptNumber,
              type: "Bank Receipt",
              remarks: r.remarks || `Payment received via Bank - Account ${r.bankAccount || ""}`,
              debit: 0,
              credit: r.amount || 0
            });
          }
        });
      }

      // Sort all transactions chronologically
      txs.sort((a, b) => a.date.getTime() - b.date.getTime());
      setLedgerTransactions(txs);
    } catch (err) {
      console.error("Error loading ledger:", err);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // Recalculates transactions ledger when date range is applied
  const getProcessedLedger = () => {
    if (!selectedLedgerCustomer) return { opening: 0, rows: [], totalDr: 0, totalCr: 0, closing: 0 };

    const initialOpening = selectedLedgerCustomer.openingBalance || 0;
    const startRange = new Date(ledgerFromDate);
    const endRange = new Date(ledgerToDate);
    endRange.setHours(23, 59, 59, 999);

    let opening = initialOpening;
    const beforeTxs = ledgerTransactions.filter(t => t.date.getTime() < startRange.getTime());
    const duringTxs = ledgerTransactions.filter(t => t.date.getTime() >= startRange.getTime() && t.date.getTime() <= endRange.getTime());

    // Compute dynamic opening balance up to From Date
    beforeTxs.forEach(t => {
      opening += t.debit - t.credit;
    });

    let runningBalance = opening;
    let totalDr = 0;
    let totalCr = 0;

    const rows = duringTxs.map(t => {
      runningBalance += t.debit - t.credit;
      totalDr += t.debit;
      totalCr += t.credit;
      return {
        ...t,
        runningBalance
      };
    });

    return {
      opening,
      rows,
      totalDr,
      totalCr,
      closing: runningBalance
    };
  };

  const ledgerData = getProcessedLedger();

  const columns = [
    { 
      header: "Customer Name", 
      accessor: "name",
      render: (val: string, row: any) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-900 dark:text-white">{val}</span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">NTN: {row.ntn || "-"}</span>
        </div>
      )
    },
    { header: "Category", accessor: "category" },
    { header: "Contact Person", accessor: "contactPerson" },
    { 
      header: "Phone", 
      accessor: "phone",
      render: (val: string, row: any) => {
        const hasValidPhone = val && val.replace(/[^0-9]/g, "").length >= 10;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{val}</span>
            {hasValidPhone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setWaParty(row);
                  setWaType("Reminder");
                  setIsWhatsAppModalOpen(true);
                }}
                title="Send WhatsApp Reminder"
                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
              >
                <MessageCircle size={14} className="fill-emerald-600/10" />
              </button>
            )}
          </div>
        );
      }
    },
    { 
      header: "Location", 
      accessor: "area",
      render: (val: string) => (
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
          <MapPin size={14} className="text-slate-300" />
          <span>{val || "-"}</span>
        </div>
      )
    },
    { 
      header: "Balance (Dr/Cr)", 
      accessor: "balance", 
      render: (val: number, row: any) => {
        const isDebit = val > 0;
        const formattedVal = isDebit 
          ? `+Rs. ${val.toLocaleString()}` 
          : val < 0 ? `-Rs. ${Math.abs(val).toLocaleString()}` : "Rs. 0";
        const balanceLabel = isDebit ? " (Debit)" : val < 0 ? " (Credit)" : "";
        return (
          <div className="flex flex-col">
            <span className={`text-sm font-black ${val > (row.creditLimit || 0) && row.creditLimit > 0 ? "text-red-600 animate-pulse" : isDebit ? "text-rose-600" : val < 0 ? "text-emerald-600" : "text-slate-500"}`}>
              {formattedVal}{balanceLabel}
            </span>
            {val > (row.creditLimit || 0) && row.creditLimit > 0 && (
              <span className="text-[8px] font-black text-red-600 uppercase tracking-tighter">Over Limit! (Max: {row.creditLimit?.toLocaleString()})</span>
            )}
          </div>
        );
      }
    },
    { 
      header: "Status", 
      accessor: "status", 
      render: (val: string) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          val === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        }`}>
          {val}
        </span>
      )
    },
  ];

  // The 8 specified customer categories
  const categories = [
    "Cash Customer",
    "Credit Customer",
    "Cash Customer (Jama)",
    "Credit Customer (Counter)",
    "Credit Customer Max",
    "Credit Customer (Haji Gul)",
    "Credit Customer (Makkah)",
    "Credit Customer (Radbook)"
  ];

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.contactPerson?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.area?.toLowerCase().includes(term) ||
      c.ntn?.toLowerCase().includes(term)
    );
  });

  // LEDGER / COMPLETE CUSTOMER PROFILE HISTORY VIEW
  if (selectedLedgerCustomer) {
    return (
      <CustomerProfileHistory 
        customer={selectedLedgerCustomer}
        onBack={() => {
          setSelectedLedgerCustomer(null);
          fetchCustomers();
        }}
        shopProfile={shopProfile}
        fetchCustomers={fetchCustomers}
      />
    );
  }

  // STANDARD BALANCES GRID VIEW
  return (
    <div className="space-y-6">
      <ERPPageHeader 
        title="Customer Balances" 
        subtitle="Master Data / Customer Balances"
        actions={[
          { label: "Export Excel", onClick: () => exportToExcel(customers, "CustomerBalances.xlsx"), icon: FileSpreadsheet },
          { label: "Download Template", onClick: () => downloadTemplate(["Company Name", "Contact Person", "Phone", "Email", "NTN", "Location", "Balance", "Status"], "CustomerTemplate.xlsx"), icon: Download },
          { label: "Import Excel", onClick: handleImport, icon: FileText },
        ]}
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ERPStatCard label="Active Accounts" value={customers.filter(c => c.status === "Active").length} icon={UserCheck} variant="green" />
        <ERPStatCard label="Inactive Accounts" value={customers.filter(c => c.status === "Inactive").length} icon={UserX} variant="slate" />
        <ERPStatCard label="Total Outstanding Receivable" value={`Rs. ${(customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0) / 1000000).toFixed(1)}M`} icon={Wallet} variant="maroon" />
      </div>

      {/* Search & Add Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-6 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by customer name, contact, phone, location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleAdd}
              className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
            >
              <Plus size={18} />
              New Customer
            </button>
          </div>
        </div>
      </div>

      {/* Separate Tables for each of the 8 Categories */}
      <div className="space-y-12">
        {categories.map(cat => {
          // Filter customers belonging to this category
          const catCustomers = filteredCustomers.filter(c => (c.category || "Cash Customer") === cat);

          return (
            <div key={cat} className="space-y-4">
              <div className="flex items-center gap-4 px-6">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-maroon-800 bg-maroon-50 dark:bg-maroon-900/30 dark:text-maroon-400 px-6 py-2 rounded-full shadow-sm">
                  {cat}
                </h2>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-maroon-900/5 min-h-[100px]">
                {catCustomers.length > 0 ? (
                  <ERPDataTable 
                    columns={columns} 
                    data={catCustomers} 
                    actions={[
                      { label: "Edit", onClick: handleEdit, icon: Edit2 },
                      { label: "View Ledger", onClick: handleOpenLedger, icon: FileText },
                      { 
                        label: "WhatsApp Reminder", 
                        onClick: (row: any) => { setWaParty(row); setWaType("Reminder"); setIsWhatsAppModalOpen(true); }, 
                        icon: MessageCircle,
                        hide: (row: any) => !row.phone || row.phone.replace(/[^0-9]/g, "").length < 10
                      },
                      { label: "Receive Payment", onClick: (row: any) => { setActiveCustomer(row); setIsReceiptModalOpen(true); }, icon: Wallet },
                      { label: "Delete", onClick: (row: any) => handleDelete(row._id), icon: Trash2, variant: "danger" },
                    ]}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No customers in this category</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customer={selectedCustomer}
        onSave={handleSave}
      />

      {activeCustomer && (
        <QuickReceiptModal 
          isOpen={isReceiptModalOpen} 
          onClose={() => setIsReceiptModalOpen(false)} 
          customer={activeCustomer} 
          onSuccess={fetchCustomers} 
        />
      )}

      <WhatsAppShareModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={waParty}
        type={waType}
        documentData={waDocData}
        shopProfile={shopProfile}
      />
    </div>
  );
}
