"use client";
import { getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Users, DollarSign, Clock, AlertTriangle, AlertOctagon, TrendingUp, Search, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function ARAgingReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawCash, setRawCash] = useState<any[]>([]);
  const [rawBank, setRawBank] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [asOfDate, setAsOfDate] = useState(getCurrentDateStr());
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [minBalance, setMinBalance] = useState("");
  const [taxFilter, setTaxFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, cashRes, bankRes, customersRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts'),
          fetch('/api/parties?type=customer')
        ]);
        const [salesJson, cashJson, bankJson, customersJson] = await Promise.all([
          salesRes.json(),
          cashRes.json(),
          bankRes.json()
        , customersRes.json()]);

        if (customersJson.ok && customersJson.data) setCustomers(customersJson.data);

        const salesList = salesJson.ok && Array.isArray(salesJson.data) ? salesJson.data : [];
        const cashList = cashJson.ok && Array.isArray(cashJson.data) ? cashJson.data : [];
        const bankList = bankJson.ok && Array.isArray(bankJson.data) ? bankJson.data : [];

        setRawSales(salesList);
        setRawCash(cashList);
        setRawBank(bankList);

        processARAging(salesList, cashList, bankList, {
          asOfDate: getCurrentDateStr(),
          selectedCustomer: "All",
          minBalance: "",
          taxFilter: "All",
          searchQuery: ""
        });
      } catch (error) {
        console.error("Error fetching AR aging:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processARAging(sales: any[], cash: any[], bank: any[], filters: any) {
    const asOf = new Date(filters.asOfDate || Date.now());
    const customerMap: Record<string, any> = {};

    sales.forEach((s: any) => {
      const invDate = new Date(s.date || Date.now());
      if (invDate > asOf) return;

      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return;
      }

      const key = s.partyId?._id || s.partyId?.id || s.partyId || "walk-in";
      if (filters.selectedCustomer !== "All" && key !== filters.selectedCustomer) return;

      const isReturn = (s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return');
      if (!customerMap[key]) {
        customerMap[key] = {
          id: key,
          customerCode: s.partyId?.code || "CUST-001",
          customerName: s.partyId?.name || s.partyId?.companyName || s.customerName || "Customer",
          current: 0,
          day30: 0,
          day60: 0,
          day90: 0,
          total: 0
        };
      }

      const amount = (Number(s.totalAmount) || 0) * (isReturn ? -1 : 1);
      const diffDays = Math.max(0, Math.floor((asOf.getTime() - invDate.getTime()) / (1000 * 3600 * 24)));

      if (diffDays <= 30) customerMap[key].current += amount;
      else if (diffDays <= 60) customerMap[key].day30 += amount;
      else if (diffDays <= 90) customerMap[key].day60 += amount;
      else customerMap[key].day90 += amount;

      customerMap[key].total += amount;
    });

    const processReceipts = (receipts: any[]) => {
      receipts?.forEach((r: any) => {
        const rDate = new Date(r.date || Date.now());
        if (rDate > asOf) return;

        const key = r.partyId?._id || r.partyId?.id || r.partyId;
        if (!key || !customerMap[key]) return;

        let payment = Number(r.amount) || 0;
        const buckets = ['day90', 'day60', 'day30', 'current'];
        for (const b of buckets) {
          if (payment <= 0) break;
          if (customerMap[key][b] > 0) {
            const deduction = Math.min(payment, customerMap[key][b]);
            customerMap[key][b] -= deduction;
            payment -= deduction;
          }
        }
        customerMap[key].total -= (Number(r.amount) || 0);
      });
    };

    processReceipts(cash);
    processReceipts(bank);

    let list = Object.values(customerMap).filter((c: any) => c.total > 0);

    if (filters.minBalance) {
      const min = Number(filters.minBalance) || 0;
      list = list.filter((c: any) => c.total >= min);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((c: any) => 
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.customerCode && c.customerCode.toLowerCase().includes(q))
      );
    }

    setData(list.sort((a: any, b: any) => b.total - a.total));
  }

  const handleGenerate = () => {
    processARAging(rawSales, rawCash, rawBank, {
      asOfDate,
      selectedCustomer,
      minBalance,
      taxFilter,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultDate = getCurrentDateStr();
    setAsOfDate(defaultDate);
    setSelectedCustomer("All");
    setMinBalance("");
    setTaxFilter("All");
    setSearchQuery("");
    processARAging(rawSales, rawCash, rawBank, {
      asOfDate: defaultDate,
      selectedCustomer: "All",
      minBalance: "",
      taxFilter: "All",
      searchQuery: ""
    });
  };

  const totalReceivable = data.reduce((s, r) => s + r.total, 0);
  const totalCurrent = data.reduce((s, r) => s + r.current, 0);
  const total30 = data.reduce((s, r) => s + r.day30, 0);
  const total60 = data.reduce((s, r) => s + r.day60, 0);
  const total90 = data.reduce((s, r) => s + r.day90, 0);

  const stats = [
    { title: "Total Receivable", value: `Rs. ${totalReceivable.toLocaleString()}`, subtitle: `${data.length} customers`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Current (0-30 Days)", value: `Rs. ${totalCurrent.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((totalCurrent / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Overdue 31-60 Days", value: `Rs. ${total30.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total30 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: Clock, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Overdue 61-90 Days", value: `Rs. ${total60.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total60 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: AlertTriangle, iconColor: "text-orange-600", iconBg: "bg-orange-50" },
    { title: "Overdue 90+ Days", value: `Rs. ${total90.toLocaleString()}`, subtitle: `${totalReceivable > 0 ? ((total90 / totalReceivable) * 100).toFixed(1) : 0}% of total`, icon: AlertOctagon, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">As Of Date</label>
          <input 
            type="date" 
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Balance</label>
          <input 
            type="number" 
            placeholder="0" 
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax Filter</label>
          <select 
            value={taxFilter}
            onChange={(e) => setTaxFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">Both (Tax + Non-Tax)</option>
            <option value="tax">Tax Only</option>
            <option value="non-tax">Non-Tax Only</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Customer Name / Code..." 
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
      title="Accounts Receivable Aging"
      description="Detailed tracking of customer outstanding balances grouped by 30-day aging intervals."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Aging", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "ARAging.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Customer Overdue Ledger</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} customers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Current (0-30)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">31-60 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">61-90 Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-rose-400 uppercase tracking-widest text-right">90+ Days</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Receivable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">Calculating AR aging...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">No overdue receivables found matching the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.customerCode}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.customerName}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.current.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.day30.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-amber-600 text-right">{row.day60.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-rose-600 text-right bg-rose-50/30 dark:bg-rose-950/20">{row.day90.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-900 dark:text-slate-100 text-right">Rs. {row.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} customers)</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalCurrent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{total30.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-amber-600">{total60.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600">{total90.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {totalReceivable.toLocaleString()}</td>
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
