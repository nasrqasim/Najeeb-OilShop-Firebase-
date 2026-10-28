"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, ShoppingCart, RotateCcw as RotateLeft, DollarSign, TrendingUp, CreditCard, Clock, RefreshCw, FileSpreadsheet, RotateCcw, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function POSSalesReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [paymentMethod, setPaymentMethod] = useState("All");
  const [selectedCashier, setSelectedCashier] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, empRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/employees')
        ]);
        const [salesJson, empJson] = await Promise.all([
          salesRes.json(),
          empRes.json()
        ]);

        if (empJson.ok && empJson.data) setEmployees(empJson.data);

        if (salesJson.ok && salesJson.data) {
          setRawSales(salesJson.data);
          filterAndProcess(salesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            paymentMethod: "All",
            selectedCashier: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching POS sales:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function filterAndProcess(sales: any[], filters: any) {
    let filtered = sales.filter((s: any) => {
      // Must be POS or cash/card direct sale
      const isPos = s.type === 'pos' || s.type === 'pos_counter_sale' || s.paymentMethod === 'Cash' || s.paymentMethod === 'Card';
      if (!isPos) return false;

      if (s.date) {
        const d = s.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }

      if (filters.paymentMethod !== "All") {
        const pm = (s.paymentMethod || "Cash").toLowerCase();
        if (pm !== filters.paymentMethod.toLowerCase()) return false;
      }

      if (filters.selectedCashier !== "All") {
        const cId = s.employeeId?._id || s.employeeId?.id || s.employeeId;
        const cName = s.employeeId?.name || "";
        if (cId !== filters.selectedCashier && cName !== filters.selectedCashier) return false;
      }

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const docNo = (s.invoiceNo || s.docNo || "").toLowerCase();
        const cust = (s.partyId?.name || s.customerName || "").toLowerCase();
        if (!docNo.includes(q) && !cust.includes(q)) return false;
      }

      return true;
    });

    const transformed = filtered.map((s: any) => ({
      id: s._id,
      date: new Date(s.date || Date.now()).toLocaleString(),
      receipt: s.invoiceNo || s.docNo || "N/A",
      terminal: s.terminal || "Counter-1",
      cashier: s.employeeId?.name || "Cashier",
      gross: s.subTotal || s.totalAmount || 0,
      tax: s.taxAmount || 0,
      net: s.totalAmount || 0,
      payment: s.paymentMethod || "Cash",
      hour: new Date(s.date || Date.now()).getHours() + ":00"
    }));

    setData(transformed);
  }

  const handleGenerate = () => {
    filterAndProcess(rawSales, {
      dateFrom,
      dateTo,
      paymentMethod,
      selectedCashier,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setPaymentMethod("All");
    setSelectedCashier("All");
    setSearchQuery("");
    filterAndProcess(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      paymentMethod: "All",
      selectedCashier: "All",
      searchQuery: ""
    });
  };

  const totalSales = data.reduce((s, r) => s + r.net, 0);
  const cashCollected = data.filter(r => r.payment === 'Cash').reduce((s, r) => s + r.net, 0);
  const cardCollected = data.filter(r => r.payment === 'Card').reduce((s, r) => s + r.net, 0);
  const avgSale = data.length > 0 ? totalSales / data.length : 0;

  const stats = [
    { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, subtitle: `${data.length} transactions`, icon: ShoppingCart, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Net Revenue", value: `Rs. ${totalSales.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Average Ticket", value: `Rs. ${Math.round(avgSale).toLocaleString()}`, icon: TrendingUp, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "Cash Collected", value: `Rs. ${cashCollected.toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Card Collected", value: `Rs. ${cardCollected.toLocaleString()}`, icon: CreditCard, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
          <select 
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cashier</label>
          <select 
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Cashiers</option>
            {employees.map((emp: any) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>
                {emp.name}
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
              placeholder="Receipt / Customer..." 
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
      title="POS Sales"
      description="Real-time register summary and breakdown of retail counter point-of-sale transactions."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "POSSales.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">POS Receipts</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Receipt #</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Terminal</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cashier</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tax</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Amount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-xs text-slate-400">Loading POS transactions...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-xs text-slate-400">No POS transactions match the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.receipt}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{row.terminal}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-700 dark:text-slate-200">{row.cashier}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 text-right">{row.gross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.tax.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">Rs. {row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.payment === 'Cash' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200'
                        }`}>{row.payment}</span>
                      </td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={5} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} transactions)</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.tax, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {totalSales.toLocaleString()}</td>
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
