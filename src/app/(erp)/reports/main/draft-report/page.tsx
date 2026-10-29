"use client";

import { useState, useEffect, useMemo } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Search, Download, FileText, DollarSign, CalendarPlus, Calendar, CalendarMinus, Clock, RotateCcw, Printer, FileSpreadsheet, RefreshCw, ExternalLink } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import Link from "next/link";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

export default function DraftReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("All");
  const [selectedUser, setSelectedUser] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, purchasesRes, cpRes, crRes, bpRes, brRes] = await Promise.all([
        fetch('/api/sales', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/purchases', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/cash-payments', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/cash-receipts', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/bank-payments', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/bank-receipts', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      const isItemDraft = (item: any) => {
        const s = String(item.status || "").toLowerCase().trim();
        return s === "draft" || s === "pending" || item.isPosted === false;
      };

      const draftsList: any[] = [];

      // Sales drafts
      (salesRes?.data || []).filter(isItemDraft).forEach((s: any) => {
        const docNo = s.invoiceNo || s.soNo || s.docNo || "DRAFT-SALE";
        const isSO = Boolean(s.soNo || s.type === "sale_order");
        const docDate = s.date ? s.date.substring(0, 10) : "";
        const createdAt = s.createdAt || s.date || new Date().toISOString();
        const amt = Number(s.totalAmount || s.netAmount || 0);

        draftsList.push({
          id: s._id || s.id,
          docNo,
          type: isSO ? "Sales Order" : (s.type === "pos" ? "POS Sale Draft" : "Sales Invoice"),
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: s.createdBy?.name || s.createdByName || s.user || "Salesman",
          party: s.partyId?.name || s.partyId?.companyName || s.customerName || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: isSO ? "/sales/sale-order" : "/sales/sale-invoice"
        });
      });

      // Purchases drafts
      (purchasesRes?.data || []).filter(isItemDraft).forEach((p: any) => {
        const docNo = p.invoiceNo || p.poNo || p.docNo || "DRAFT-PUR";
        const isPO = Boolean(p.poNo || p.type === "purchase_order");
        const docDate = p.date ? p.date.substring(0, 10) : "";
        const createdAt = p.createdAt || p.date || new Date().toISOString();
        const amt = Number(p.totalAmount || p.netAmount || 0);

        draftsList.push({
          id: p._id || p.id,
          docNo,
          type: isPO ? "Purchase Order" : "Purchase Invoice",
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: p.createdBy?.name || p.createdByName || p.user || "Admin",
          party: p.vendorId?.name || p.vendorId?.companyName || p.vendorName || p.vendor || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: isPO ? "/purchases/purchase-order" : "/purchases/purchase-invoice"
        });
      });

      // Cash Payments drafts
      (cpRes?.data || []).filter(isItemDraft).forEach((cp: any) => {
        const createdAt = cp.createdAt || cp.date || new Date().toISOString();
        const docDate = cp.date ? cp.date.substring(0, 10) : "";
        const amt = Number(cp.amount || 0);

        draftsList.push({
          id: cp._id || cp.id,
          docNo: cp.voucherNo || cp.docNo || "CP-DRAFT",
          type: "Cash Payment",
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: cp.employeeId?.name || cp.createdByName || "Cashier",
          party: cp.partyId?.name || cp.partyName || cp.vendor || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: "/financial-vouchers/cash-payment-voucher"
        });
      });

      // Cash Receipts drafts
      (crRes?.data || []).filter(isItemDraft).forEach((cr: any) => {
        const createdAt = cr.createdAt || cr.date || new Date().toISOString();
        const docDate = cr.date ? cr.date.substring(0, 10) : "";
        const amt = Number(cr.amount || 0);

        draftsList.push({
          id: cr._id || cr.id,
          docNo: cr.voucherNo || cr.docNo || "CR-DRAFT",
          type: "Cash Receipt",
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: cr.employeeId?.name || cr.createdByName || "Cashier",
          party: cr.partyId?.name || cr.partyName || cr.customer || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: "/financial-vouchers/cash-receipt-voucher"
        });
      });

      // Bank Payments drafts
      (bpRes?.data || []).filter(isItemDraft).forEach((bp: any) => {
        const createdAt = bp.createdAt || bp.date || new Date().toISOString();
        const docDate = bp.date ? bp.date.substring(0, 10) : "";
        const amt = Number(bp.amount || 0);

        draftsList.push({
          id: bp._id || bp.id,
          docNo: bp.voucherNo || bp.docNo || "BP-DRAFT",
          type: "Bank Payment",
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: bp.employeeId?.name || bp.createdByName || "Accountant",
          party: bp.partyId?.name || bp.partyName || bp.vendor || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: "/financial-vouchers/bank-payment-voucher"
        });
      });

      // Bank Receipts drafts
      (brRes?.data || []).filter(isItemDraft).forEach((br: any) => {
        const createdAt = br.createdAt || br.date || new Date().toISOString();
        const docDate = br.date ? br.date.substring(0, 10) : "";
        const amt = Number(br.amount || 0);

        draftsList.push({
          id: br._id || br.id,
          docNo: br.voucherNo || br.docNo || "BR-DRAFT",
          type: "Bank Receipt",
          docDate: docDate || new Date(createdAt).toLocaleDateString(),
          rawDate: docDate,
          created: new Date(createdAt).toLocaleDateString(),
          createdBy: br.employeeId?.name || br.createdByName || "Accountant",
          party: br.partyId?.name || br.partyName || br.customer || "-",
          rawAmount: amt,
          amount: `Rs. ${amt.toLocaleString()}`,
          daysAsDraft: Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))),
          link: "/financial-vouchers/bank-receipt-voucher"
        });
      });

      // Sort newest created first
      draftsList.sort((a, b) => b.daysAsDraft - a.daysAsDraft);
      setData(draftsList);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique document types and users
  const docTypes = useMemo(() => Array.from(new Set(data.map(d => d.type))).filter(Boolean).sort(), [data]);
  const users = useMemo(() => Array.from(new Set(data.map(d => d.createdBy))).filter(Boolean).sort(), [data]);

  // Filtered drafts
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      if (selectedDocType !== "All" && d.type !== selectedDocType) return false;
      if (selectedUser !== "All" && d.createdBy !== selectedUser) return false;
      if (dateFrom && d.rawDate && d.rawDate < dateFrom) return false;
      if (dateTo && d.rawDate && d.rawDate > dateTo) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDoc = d.docNo.toLowerCase().includes(q);
        const matchParty = d.party.toLowerCase().includes(q);
        const matchUser = d.createdBy.toLowerCase().includes(q);
        const matchType = d.type.toLowerCase().includes(q);
        if (!matchDoc && !matchParty && !matchUser && !matchType) return false;
      }
      return true;
    });
  }, [data, selectedDocType, selectedUser, dateFrom, dateTo, searchQuery]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedDocType("All");
    setSelectedUser("All");
    setDateFrom("");
    setDateTo("");
  };

  const totalValue = filteredData.reduce((acc, curr) => acc + (curr.rawAmount || 0), 0);
  const createdToday = filteredData.filter(d => d.daysAsDraft === 0).length;
  const within7Days = filteredData.filter(d => d.daysAsDraft <= 7).length;
  const olderThan7Days = filteredData.filter(d => d.daysAsDraft > 7).length;
  const oldestDays = filteredData.length > 0 ? Math.max(...filteredData.map(d => d.daysAsDraft)) : 0;

  const stats = [
    { title: "TOTAL DRAFTS", value: filteredData.length.toString(), icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "DRAFT VALUE", value: `Rs. ${totalValue.toLocaleString()}`, icon: DollarSign, iconColor: "text-slate-600", iconBg: "bg-slate-100" },
    { title: "CREATED TODAY", value: createdToday.toString(), icon: CalendarPlus, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "WITHIN 7 DAYS", value: within7Days.toString(), icon: Calendar, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "OLDER THAN 7 DAYS", value: olderThan7Days.toString(), icon: CalendarMinus, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "OLDEST (DAYS)", value: oldestDays.toString(), icon: Clock, iconColor: "text-slate-600", iconBg: "bg-slate-100" },
  ];

  const Filters = (
    <div className="flex flex-col md:flex-row gap-3 items-center w-full">
      <div className="relative flex-1 w-full md:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search doc#, party, user..." 
          className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all" 
        />
      </div>
      <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
        <select 
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
        >
          <option value="All">All Document Types ({docTypes.length})</option>
          {docTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
        >
          <option value="All">All Users ({users.length})</option>
          {users.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button 
          onClick={fetchData}
          disabled={isLoading}
          className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Refresh drafts"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
        <button 
          onClick={handleReset}
          className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Reset Filters"
        >
          <RotateCcw size={14} />
        </button>
        <button 
          onClick={() => exportToExcel(filteredData, "DraftReport.csv")}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download size={13} /> Export
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Draft Report"
      description="View all unposted transactions and pending drafts across the system."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "DraftReport.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="p-0">
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{filteredData.length} draft(s) pending review</span>
          <span className="text-xs font-black text-rose-600 dark:text-rose-400">Total Pending: Rs. {totalValue.toLocaleString()}</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc #</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc Date</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Created</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Created By</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Party / Account</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Amount</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Days As Draft</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-slate-400">Loading draft records...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-xs text-slate-400">No unposted drafts found matching the filters. All documents are up to date!</td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-maroon-800 dark:text-rose-400">
                    <Link href={row.link} className="hover:underline flex items-center gap-1">
                      {row.docNo}
                      <ExternalLink size={11} className="opacity-50" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 rounded text-[10px] font-bold">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.docDate}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.created}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.createdBy}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{row.party}</td>
                  <td className="px-4 py-3 text-xs font-black text-slate-800 dark:text-slate-100 text-right">{row.amount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${row.daysAsDraft === 0 ? 'bg-emerald-50 text-emerald-600' : (row.daysAsDraft > 7 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}`}>
                      {row.daysAsDraft}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link 
                      href={row.link}
                      className="px-2.5 py-1 bg-maroon-800 hover:bg-maroon-900 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-sm transition-all"
                    >
                      Open & Post
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ERPReportLayout>
  );
}
