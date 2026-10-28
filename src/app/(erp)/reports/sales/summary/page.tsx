"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, TrendingUp, TrendingDown, DollarSign, Percent, Tag, Calculator, RotateCcw, FileSpreadsheet, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SaleSummaryReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [docType, setDocType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, customersRes, empRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/parties?type=customer'),
          fetch('/api/employees')
        ]);
        const [salesJson, customersJson, empJson] = await Promise.all([
          salesRes.json(),
          customersRes.json(),
          empRes.json()
        ]);

        if (customersJson.ok && customersJson.data) setCustomers(customersJson.data);
        if (empJson.ok && empJson.data) setEmployees(empJson.data);

        if (salesJson.ok && salesJson.data) {
          const validSales = salesJson.data.filter((s: any) => s.type !== 'quotation');
          setRawSales(validSales);
          filterAndProcess(validSales, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            selectedCustomer: "All",
            selectedSalesperson: "All",
            selectedStatus: "All",
            taxFilter: "All",
            docType: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching sale summary:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function filterAndProcess(sales: any[], filters: any) {
    let filtered = sales.filter((s: any) => {
      if (s.date) {
        const d = s.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }

      if (filters.selectedCustomer !== "All") {
        const cId = s.partyId?._id || s.partyId?.id || s.partyId;
        if (cId !== filters.selectedCustomer) return false;
      }

      if (filters.selectedSalesperson !== "All") {
        const spId = s.employeeId?._id || s.employeeId?.id || s.employeeId || s.partyId?.salespersonId?._id || s.partyId?.salespersonId;
        if (spId !== filters.selectedSalesperson) return false;
      }

      if (filters.selectedStatus !== "All") {
        const st = (s.status || "posted").toLowerCase();
        if (st !== filters.selectedStatus.toLowerCase()) return false;
      }

      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return false;
      }

      const isRet = s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return';
      if (filters.docType === "sales" && isRet) return false;
      if (filters.docType === "returns" && !isRet) return false;
      if (filters.docType === "pos" && !s.type.includes("pos")) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const docNo = s.invoiceNo || s.docNo || "";
        const cName = s.partyId?.name || s.partyId?.companyName || s.customerName || "";
        const spName = s.employeeId?.name || "";
        if (!docNo.toLowerCase().includes(q) && !cName.toLowerCase().includes(q) && !spName.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });

    const transformed = filtered.map((s: any) => {
      const isRet = s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return';
      return {
        id: s._id,
        date: new Date(s.date || Date.now()).toLocaleDateString(),
        docNo: s.invoiceNo || s.docNo || "N/A",
        badge: isRet ? 'SR' : s.type === 'sale_order' ? 'SO' : s.type?.includes('pos') ? 'POS' : 'SI',
        customer: s.partyId?.name || s.partyId?.companyName || s.customerName || "Walk-in",
        salesperson: s.employeeId?.name || "-",
        gross: s.subTotal || s.totalAmount || 0,
        discount: s.discountAmount || 0,
        gst: s.taxAmount || 0,
        net: s.totalAmount || 0,
        status: s.status || "Posted",
        statusColor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
        badgeColor: isRet ? "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200" : "text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200"
      };
    });

    setData(transformed);
  }

  const handleGenerate = () => {
    filterAndProcess(rawSales, {
      dateFrom,
      dateTo,
      selectedCustomer,
      selectedSalesperson,
      selectedStatus,
      taxFilter,
      docType,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedCustomer("All");
    setSelectedSalesperson("All");
    setSelectedStatus("All");
    setTaxFilter("All");
    setDocType("All");
    setSearchQuery("");
    filterAndProcess(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedCustomer: "All",
      selectedSalesperson: "All",
      selectedStatus: "All",
      taxFilter: "All",
      docType: "All",
      searchQuery: ""
    });
  };

  const totalSales = data.filter(d => d.badge !== 'SR').reduce((acc, curr) => acc + curr.net, 0);
  const totalReturns = data.filter(d => d.badge === 'SR').reduce((acc, curr) => acc + curr.net, 0);
  const totalGst = data.reduce((acc, curr) => acc + curr.gst, 0);
  const totalDiscount = data.reduce((acc, curr) => acc + curr.discount, 0);

  const stats = [
    { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Returns", value: `Rs. ${totalReturns.toLocaleString()}`, icon: TrendingDown, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Net Sales", value: `Rs. ${(totalSales - totalReturns).toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Total GST", value: `Rs. ${totalGst.toLocaleString()}`, icon: Percent, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Total Discount", value: `Rs. ${totalDiscount.toLocaleString()}`, icon: Tag, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
    { title: "Avg Sale Value", value: `Rs. ${data.length > 0 ? (totalSales / data.length).toFixed(0) : 0}`, icon: Calculator, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesperson</label>
          <select 
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Salespersons</option>
            {employees.map((emp: any) => (
              <option key={emp._id || emp.id} value={emp._id || emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Type</label>
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Documents</option>
            <option value="sales">Sales Only</option>
            <option value="returns">Returns Only</option>
            <option value="pos">POS Sales</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Statuses</option>
            <option value="posted">Posted</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search invoice #, customer..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
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
    </div>
  );

  const barData = Object.entries(data.reduce((acc: any, curr) => {
    if (!acc[curr.customer]) acc[curr.customer] = { name: curr.customer, value: 0 };
    acc[curr.customer].value += curr.net;
    return acc;
  }, {})).map(([_, v]) => v).sort((a: any, b: any) => b.value - a.value).slice(0, 10);

  return (
    <ERPReportLayout
      title="Sale Summary"
      description="Consolidated overview of sales performance, top customers, and trends."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Summary", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SaleSummary.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold">Fetching live sale records...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <DollarSign size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No sale records found matching the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sale Transactions</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc #</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesperson</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Amount</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Discount</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GST</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Amount</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                        <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400 flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${row.badgeColor}`}>{row.badge}</span>
                          {row.docNo}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.customer}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.salesperson}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.gross.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.discount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.gst.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.net.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.statusColor}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} records)</td>
                      <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gross, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right">{totalDiscount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right">{totalGst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {(totalSales - totalReturns).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
