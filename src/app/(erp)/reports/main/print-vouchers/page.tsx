"use client";

import { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Search, Download, FileText, ArrowDownLeft, ArrowUpRight, DollarSign, Eye, Printer, FileSpreadsheet, X, CheckSquare, Square, RefreshCw, CheckCircle2 } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

export default function VouchersReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [fromDate, setFromDate] = useState(getStartOfMonthStr());
  const [toDate, setToDate] = useState(getCurrentDateStr());
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal view state
  const [viewingVoucher, setViewingVoucher] = useState<any | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cpRes, crRes, bpRes, brRes] = await Promise.all([
        fetch('/api/cash-payments', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/cash-receipts', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/bank-payments', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/bank-receipts', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const cp = cpRes?.data || [];
      const cr = crRes?.data || [];
      const bp = bpRes?.data || [];
      const br = brRes?.data || [];

      const combined: any[] = [
        ...cp.map((v: any) => ({ ...v, type: v.type || "Cash Payment", isPayment: true })),
        ...cr.map((v: any) => ({ ...v, type: v.type || "Cash Receipt", isReceipt: true })),
        ...bp.map((v: any) => ({ ...v, type: v.type || "Bank Payment", isPayment: true })),
        ...br.map((v: any) => ({ ...v, type: v.type || "Bank Receipt", isReceipt: true })),
      ].map((v: any, index: number) => {
        const id = v._id || v.id || `v-${index}`;
        const rawDate = v.date ? v.date.substring(0, 10) : (v.createdAt ? v.createdAt.substring(0, 10) : "");
        const formattedDate = rawDate || new Date(v.createdAt || Date.now()).toLocaleDateString();
        const partyName = v.partyId?.name || v.partyId?.companyName || v.partyName || v.party || v.vendor || v.customer || "-";
        const employeeName = v.employeeId?.name || v.employeeName || v.employee || "-";
        const rawAmount = Number(v.amount) || Number(v.totalAmount) || 0;
        const status = v.status || (v.isPosted === false ? "Draft" : "Posted");

        return {
          id: String(id),
          _id: id,
          rawDate,
          date: formattedDate,
          docNo: v.voucherNo || v.docNo || v.invoiceNo || `VCH-${index + 1}`,
          type: v.type,
          isPayment: Boolean(v.isPayment || (v.type && v.type.toLowerCase().includes("payment"))),
          isReceipt: Boolean(v.isReceipt || (v.type && v.type.toLowerCase().includes("receipt"))),
          party: partyName,
          employee: employeeName,
          rawAmount,
          amount: `Rs. ${rawAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          status,
          narration: v.narration || v.remarks || v.description || "-",
          bankName: v.bankName || v.bank || "-",
          chequeNo: v.chequeNo || "-",
          isTax: Boolean(v.isTaxInvoice || v.taxAmount > 0),
          lines: v.lines || [],
          raw: v
        };
      });

      // Sort newest date first
      combined.sort((a, b) => (b.rawDate || "").localeCompare(a.rawDate || ""));
      setData(combined);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      // Date Filter
      if (v.rawDate) {
        if (fromDate && v.rawDate < fromDate) return false;
        if (toDate && v.rawDate > toDate) return false;
      }

      // Voucher Type Filter
      if (selectedType !== "All") {
        if (v.type.toLowerCase() !== selectedType.toLowerCase()) return false;
      }

      // Status Filter
      if (selectedStatus !== "All") {
        if (v.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      // Tax Filter
      if (taxFilter === "tax" && !v.isTax) return false;
      if (taxFilter === "non-tax" && v.isTax) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDoc = v.docNo.toLowerCase().includes(q);
        const matchParty = v.party.toLowerCase().includes(q);
        const matchEmp = v.employee.toLowerCase().includes(q);
        const matchNarr = v.narration.toLowerCase().includes(q);
        if (!matchDoc && !matchParty && !matchEmp && !matchNarr) return false;
      }

      return true;
    });
  }, [data, fromDate, toDate, selectedType, selectedStatus, taxFilter, searchQuery]);

  // Checkbox handlers
  const allFilteredSelected = filteredData.length > 0 && filteredData.every((r) => selectedIds.has(r.id));
  
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredData.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Print voucher handler
  const handlePrintSingle = (voucher: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher - ${voucher.docNo}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #881337; padding-bottom: 12px; margin-bottom: 24px; }
          .header h1 { margin: 0; color: #881337; font-size: 24px; text-transform: uppercase; }
          .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
          .badge { display: inline-block; padding: 4px 12px; background: #f1f5f9; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-top: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; }
          .box span { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .box strong { font-size: 15px; color: #0f172a; }
          .amount-box { text-align: right; background: #fdf2f8; border: 1px solid #fbcfe8; }
          .amount-box strong { color: #881337; font-size: 22px; }
          .remarks { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 40px; font-size: 13px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 60px; font-size: 12px; }
          .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Al Hadeed Traders</h1>
          <p>Official Transaction Voucher</p>
          <div class="badge">${voucher.type} &bull; ${voucher.status}</div>
        </div>
        <div class="grid">
          <div class="box">
            <span>Voucher / Document Number</span>
            <strong>${voucher.docNo}</strong>
          </div>
          <div class="box">
            <span>Date</span>
            <strong>${voucher.date}</strong>
          </div>
          <div class="box">
            <span>Party / Account</span>
            <strong>${voucher.party}</strong>
          </div>
          <div class="box">
            <span>Employee / Cashier</span>
            <strong>${voucher.employee}</strong>
          </div>
          ${voucher.bankName !== "-" ? `
          <div class="box">
            <span>Bank & Cheque</span>
            <strong>${voucher.bankName} (Chq #${voucher.chequeNo})</strong>
          </div>
          ` : ''}
          <div class="box amount-box">
            <span>Voucher Amount</span>
            <strong>${voucher.amount}</strong>
          </div>
        </div>
        <div class="remarks">
          <strong style="display:block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Narration / Remarks:</strong>
          ${voucher.narration}
        </div>
        <div class="signatures">
          <div class="sig-line">Prepared By</div>
          <div class="sig-line">Verified By</div>
          <div class="sig-line">Receiver Signature</div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleBatchPrint = () => {
    if (selectedIds.size === 0) {
      printPage();
      return;
    }
    // Print selected vouchers in bulk
    const selectedList = data.filter(r => selectedIds.has(r.id));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const htmlContent = selectedList.map(voucher => `
      <div style="page-break-after: always; padding: 25px; font-family: sans-serif; border: 1px solid #ccc; margin-bottom: 20px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #881337; padding-bottom: 8px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; color: #881337;">AL HADEED TRADERS</h2>
            <span style="font-size: 12px; color: #555;">VOUCHER - ${voucher.type}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: bold;">${voucher.docNo}</div>
            <div style="font-size: 12px; color: #555;">${voucher.date}</div>
          </div>
        </div>
        <table style="width: 100%; font-size: 13px; margin-bottom: 16px;">
          <tr>
            <td style="width: 25%; font-weight: bold; color: #555;">Party:</td>
            <td style="width: 75%;">${voucher.party}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #555;">Handled By:</td>
            <td>${voucher.employee}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #555;">Narration:</td>
            <td>${voucher.narration}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #881337; font-size: 15px;">Amount:</td>
            <td style="font-weight: bold; color: #881337; font-size: 16px;">${voucher.amount}</td>
          </tr>
        </table>
        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; text-align: center;">
          <div style="width: 30%; border-top: 1px solid #aaa; padding-top: 4px;">Prepared By</div>
          <div style="width: 30%; border-top: 1px solid #aaa; padding-top: 4px;">Verified By</div>
          <div style="width: 30%; border-top: 1px solid #aaa; padding-top: 4px;">Receiver's Signature</div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Batch Vouchers Print (${selectedList.length})</title></head>
      <body>
        ${htmlContent}
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalAmount = filteredData.reduce((acc, curr) => acc + (curr.rawAmount || 0), 0);
  const totalPayments = filteredData.filter(v => v.isPayment).reduce((acc, curr) => acc + (curr.rawAmount || 0), 0);
  const totalReceipts = filteredData.filter(v => v.isReceipt).reduce((acc, curr) => acc + (curr.rawAmount || 0), 0);

  const stats = [
    { title: "Total Vouchers", value: filteredData.length.toString(), icon: FileText, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Payments", value: `Rs. ${totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: ArrowUpRight, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "Total Receipts", value: `Rs. ${totalReceipts.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: ArrowDownLeft, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Net Amount", value: `Rs. ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
  ];

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Financial Year</label>
          <select className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20">
            <option>Financial Year 2025-26 (Active)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">From Date</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Voucher Type</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 font-bold"
          >
            <option value="All">All Voucher Types</option>
            <option value="Cash Payment">Cash Payment</option>
            <option value="Cash Receipt">Cash Receipt</option>
            <option value="Bank Payment">Bank Payment</option>
            <option value="Bank Receipt">Bank Receipt</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Status</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax Filter</label>
          <select 
            value={taxFilter}
            onChange={(e) => setTaxFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">Both (Tax + Non-Tax)</option>
            <option value="tax">Tax Only</option>
            <option value="non-tax">Non-Tax Only</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 w-full items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doc number, party name, employee, narration..." 
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" 
          />
        </div>
        <button 
          onClick={fetchData}
          disabled={isLoading}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          title="Refresh live data"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
        <button 
          onClick={() => exportToExcel(filteredData, "Vouchers.csv")} 
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 shrink-0"
        >
          <Download size={13} /> CSV
        </button>
        {selectedIds.size > 0 && (
          <button 
            onClick={handleBatchPrint}
            className="px-3.5 py-1.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 shrink-0 cursor-pointer animate-pulse"
          >
            <Printer size={13} /> Print Selected ({selectedIds.size})
          </button>
        )}
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (String(status || "").toLowerCase()) {
      case 'posted': return 'bg-emerald-50 text-emerald-600';
      case 'completed': return 'bg-emerald-50 text-emerald-600';
      case 'received': return 'bg-blue-50 text-blue-600';
      case 'paid': return 'bg-emerald-50 text-emerald-600';
      case 'draft': return 'bg-amber-50 text-amber-600';
      case 'cancelled': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cash Payment': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Cash Receipt': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Bank Payment': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Bank Receipt': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Journal Voucher': return 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    }
  };

  return (
    <ERPReportLayout
      title="Print Vouchers"
      description="List, filter, view, and batch print financial vouchers with complete verification."
      stats={stats}
      filters={Filters}
      actions={[
        { label: selectedIds.size > 0 ? `Print Selected (${selectedIds.size})` : "Print All", onClick: handleBatchPrint, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "Vouchers.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="p-0">
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 font-bold">
          <span>Showing {filteredData.length} voucher(s)</span>
          {selectedIds.size > 0 && (
            <span className="text-maroon-800 dark:text-rose-400 font-black">
              {selectedIds.size} selected for printing
            </span>
          )}
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-3 py-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={allFilteredSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-maroon-800 focus:ring-maroon-800 cursor-pointer" 
                  title="Select / Deselect All"
                />
              </th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc #</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Party / Account</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Handled By</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="px-3 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-slate-400">Loading vouchers...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-slate-400">No vouchers found matching the selected filters.</td>
              </tr>
            ) : (
              filteredData.map((row) => {
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-maroon-50/20 dark:bg-rose-950/20' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleRow(row.id)}
                        className="rounded border-slate-300 text-maroon-800 focus:ring-maroon-800 cursor-pointer" 
                      />
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">{row.date}</td>
                    <td 
                      onClick={() => setViewingVoucher(row)}
                      className="px-3 py-3 text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                    >
                      {row.docNo}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeColor(row.type)}`}>{row.type}</span>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.party}</td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.employee}</td>
                    <td className="px-3 py-3 text-xs font-black text-slate-800 dark:text-slate-100 text-right">{row.amount}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setViewingVoucher(row)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="View Voucher Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button 
                          onClick={() => handlePrintSingle(row)}
                          className="p-1.5 text-white bg-maroon-800 hover:bg-maroon-900 rounded-md transition-colors shadow-sm shadow-maroon-900/20 cursor-pointer"
                          title="Print Voucher"
                        >
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Voucher Modal */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getTypeColor(viewingVoucher.type)}`}>
                  {viewingVoucher.type}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${getStatusColor(viewingVoucher.status)}`}>
                  {viewingVoucher.status}
                </span>
              </div>
              <button 
                onClick={() => setViewingVoucher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Document No</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{viewingVoucher.docNo}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Date</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{viewingVoucher.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Party / Account:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingVoucher.party}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Handled By:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingVoucher.employee}</span>
                </div>
                {viewingVoucher.bankName !== "-" && (
                  <>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Bank:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{viewingVoucher.bankName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block mb-0.5">Cheque #:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{viewingVoucher.chequeNo}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">Total Voucher Amount:</span>
                <span className="text-xl font-black text-maroon-800 dark:text-rose-300">{viewingVoucher.amount}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Narration / Remarks</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {viewingVoucher.narration}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => handlePrintSingle(viewingVoucher)}
                className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-maroon-900/20 cursor-pointer"
              >
                <Printer size={14} /> Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </ERPReportLayout>
  );
}
