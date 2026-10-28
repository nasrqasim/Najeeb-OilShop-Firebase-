"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Hash, DollarSign, Percent, FileText, Search, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from 'recharts';

export default function SaleRegisterReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [docType, setDocType] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

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
          setRawSales(salesJson.data);
          filterAndProcess(salesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            docType: "All",
            taxFilter: "All",
            selectedCustomer: "All",
            selectedSalesperson: "All",
            selectedStatus: "All",
            searchTerm: ""
          });
        }
      } catch (error) {
        console.error("Error fetching sale register:", error);
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

      if (filters.docType !== "All") {
        const t = (s.type || "").toLowerCase();
        if (filters.docType === "sale_invoice" && (t.includes("return") || t.includes("order"))) return false;
        if (filters.docType === "sale_return" && !t.includes("return")) return false;
        if (filters.docType === "sale_order" && !t.includes("order")) return false;
        if (filters.docType === "pos" && !t.includes("pos")) return false;
      }

      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return false;
      }

      if (filters.searchTerm) {
        const q = filters.searchTerm.toLowerCase();
        const docNo = (s.invoiceNo || s.docNo || "").toLowerCase();
        const customer = (s.partyId?.name || s.partyId?.companyName || s.customerName || "").toLowerCase();
        if (!docNo.includes(q) && !customer.includes(q)) return false;
      }

      return true;
    });

    const transformed = filtered.map((s: any) => ({
      id: s._id,
      date: new Date(s.date || Date.now()).toLocaleDateString(),
      docNo: s.invoiceNo || s.docNo || "N/A",
      type: s.type === 'sale_return' || s.type === 'non_tax_sale_return' ? 'SR' : s.type === 'sale_order' ? 'SO' : s.type?.includes('pos') ? 'POS' : 'SI',
      customer: s.partyId?.name || s.partyId?.companyName || s.customerName || "Walk-in",
      salesperson: s.employeeId?.name || "-",
      gross: s.subTotal || s.totalAmount || 0,
      gst: s.taxAmount || 0,
      net: s.totalAmount || 0,
      status: s.status || "Posted"
    }));

    setData(transformed);
  }

  const handleGenerate = () => {
    filterAndProcess(rawSales, {
      dateFrom,
      dateTo,
      docType,
      taxFilter,
      selectedCustomer,
      selectedSalesperson,
      selectedStatus,
      searchTerm
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setDocType("All");
    setTaxFilter("All");
    setSelectedCustomer("All");
    setSelectedSalesperson("All");
    setSelectedStatus("All");
    setSearchTerm("");
    filterAndProcess(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      docType: "All",
      taxFilter: "All",
      selectedCustomer: "All",
      selectedSalesperson: "All",
      selectedStatus: "All",
      searchTerm: ""
    });
  };

  const totalGross = data.reduce((acc, curr) => acc + curr.gross, 0);
  const totalNet = data.reduce((acc, curr) => acc + curr.net, 0);
  const totalGst = data.reduce((acc, curr) => acc + curr.gst, 0);

  const stats = [
    { title: "Total Documents", value: data.length.toString(), icon: Hash, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Gross Amount", value: `Rs. ${totalGross.toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: "text-emerald-600" },
    { title: "Total Net Amount", value: `Rs. ${totalNet.toLocaleString()}`, icon: DollarSign, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
    { title: "Total GST", value: `Rs. ${totalGst.toLocaleString()}`, icon: Percent, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Type</label>
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Types</option>
            <option value="sale_invoice">Sale Invoice</option>
            <option value="pos">POS Sales</option>
            <option value="sale_order">Sale Order</option>
            <option value="sale_return">Sale Return</option>
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
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input 
            type="text" 
            placeholder="Search doc # or customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

  return (
    <ERPReportLayout
      title="Sale Register"
      description="Detailed ledger of all sales invoices, orders, and returns."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Register", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SaleRegister.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Document Register</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc #</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesperson</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Amount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GST</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Amount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-xs text-slate-400">Loading register records...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-xs text-slate-400">No documents found matching the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.date}</td>
                      <td className="px-4 py-3 text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          row.type === 'SR' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-200' :
                          row.type === 'SO' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200' :
                          row.type === 'POS' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border border-purple-200' :
                          'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-200'
                        }`}>{row.type}</span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.docNo}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.customer}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">{row.salesperson}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.gross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.gst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">{row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 rounded text-[10px] font-bold">{row.status}</span>
                      </td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={6} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} records)</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalGross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalGst.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">{totalNet.toLocaleString()}</td>
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
