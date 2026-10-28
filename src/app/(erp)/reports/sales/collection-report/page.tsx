"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, DollarSign, Banknote, CreditCard, Hash, Search, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function CollectionReportPage() {
  const [rawCash, setRawCash] = useState<any[]>([]);
  const [rawBank, setRawBank] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [mode, setMode] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [cashRes, bankRes, customersRes] = await Promise.all([
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts'),
          fetch('/api/parties?type=customer')
        ]);
        const [cashJson, bankJson, customersJson] = await Promise.all([
          cashRes.json(),
          bankRes.json(),
          customersRes.json()
        ]);

        if (customersJson.ok && customersJson.data) setCustomers(customersJson.data);

        const cashList = cashJson.ok && Array.isArray(cashJson.data) ? cashJson.data : [];
        const bankList = bankJson.ok && Array.isArray(bankJson.data) ? bankJson.data : [];

        setRawCash(cashList);
        setRawBank(bankList);

        processCollections(cashList, bankList, {
          dateFrom: getStartOfMonthStr(),
          dateTo: getCurrentDateStr(),
          mode: "All",
          selectedCustomer: "All",
          searchQuery: ""
        });
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processCollections(cashList: any[], bankList: any[], filters: any) {
    let combined: any[] = [];

    if (filters.mode === "All" || filters.mode === "CR") {
      cashList.forEach((c: any) => {
        combined.push({
          id: c._id,
          rawDate: c.date,
          date: new Date(c.date || Date.now()).toLocaleDateString(),
          docNo: c.receiptNumber || c.voucherNo || "N/A",
          type: "CR",
          customerId: c.partyId?._id || c.partyId?.id || c.partyId,
          customer: c.partyId?.name || c.party || "Customer",
          amount: Number(c.amount) || 0,
          mode: "Cash Receipt",
          status: c.status || "Posted",
          statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
        });
      });
    }

    if (filters.mode === "All" || filters.mode === "BR") {
      bankList.forEach((c: any) => {
        combined.push({
          id: c._id,
          rawDate: c.date,
          date: new Date(c.date || Date.now()).toLocaleDateString(),
          docNo: c.receiptNumber || c.voucherNo || "N/A",
          type: "BR",
          customerId: c.partyId?._id || c.partyId?.id || c.partyId,
          customer: c.partyId?.name || c.party || "Customer",
          amount: Number(c.amount) || 0,
          mode: "Bank Receipt",
          status: c.status || "Posted",
          statusColor: "text-blue-600 bg-blue-50 dark:bg-blue-950/20"
        });
      });
    }

    let filtered = combined.filter((r: any) => {
      if (r.rawDate) {
        const d = r.rawDate.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }

      if (filters.selectedCustomer !== "All") {
        if (r.customerId !== filters.selectedCustomer && r.customer !== filters.selectedCustomer) {
          return false;
        }
      }

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!r.docNo.toLowerCase().includes(q) && !r.customer.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.rawDate || 0).getTime() - new Date(a.rawDate || 0).getTime());

    setData(filtered);
  }

  const handleGenerate = () => {
    processCollections(rawCash, rawBank, {
      dateFrom,
      dateTo,
      mode,
      selectedCustomer,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setMode("All");
    setSelectedCustomer("All");
    setSearchQuery("");
    processCollections(rawCash, rawBank, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      mode: "All",
      selectedCustomer: "All",
      searchQuery: ""
    });
  };

  const totalCollected = data.reduce((s, r) => s + r.amount, 0);
  const cashTotal = data.filter(r => r.type === 'CR').reduce((s, r) => s + r.amount, 0);
  const bankTotal = data.filter(r => r.type === 'BR').reduce((s, r) => s + r.amount, 0);

  const stats = [
    { title: "Total Collected", value: `Rs. ${totalCollected.toLocaleString()}`, subtitle: `${data.length} receipts`, icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Cash Collections (CR)", value: `Rs. ${cashTotal.toLocaleString()}`, subtitle: `${data.filter(r => r.type === 'CR').length} receipts`, icon: Banknote, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Bank Collections (BR)", value: `Rs. ${bankTotal.toLocaleString()}`, subtitle: `${data.filter(r => r.type === 'BR').length} receipts`, icon: CreditCard, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Collection Count", value: data.length.toString(), subtitle: `CR: ${data.filter(r => r.type === 'CR').length} | BR: ${data.filter(r => r.type === 'BR').length}`, icon: Hash, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date From</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date To</label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Collection Mode</label>
          <select 
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Modes (Cash & Bank)</option>
            <option value="CR">Cash Receipts (CR)</option>
            <option value="BR">Bank Receipts (BR)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</label>
          <select 
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Customers</option>
            {customers.map((c: any) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.name || c.companyName} {c.code ? `(${c.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Receipt # / Customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 shrink-0">
        <button 
          onClick={handleGenerate}
          className="px-3 py-1.5 bg-maroon-800 text-white rounded-lg text-xs font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20"
        >
          <Play size={14} /> Generate Report
        </button>
        <button 
          onClick={handleReset}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Collection Report"
      description="Consolidated log of customer collections across cash and bank receipts."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "CollectionReport.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Collection Records</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} receipts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Voucher #</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (Rs)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">Loading collection records...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">No collection records found matching the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.docNo}</td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          row.type === 'CR' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200'
                        }`}>{row.type}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-slate-100">{row.customer}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{row.mode}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">Rs. {row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 rounded text-[10px] font-bold">{row.status}</span>
                      </td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={6} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} collections)</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {totalCollected.toLocaleString()}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
