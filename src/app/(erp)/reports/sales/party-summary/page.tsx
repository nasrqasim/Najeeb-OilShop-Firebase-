"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, Users, DollarSign, TrendingDown, TrendingUp, Search, FileSpreadsheet, Play } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PartySaleSummaryReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, customersRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/parties?type=customer')
        ]);
        const [salesJson, customersJson] = await Promise.all([
          salesRes.json(),
          customersRes.json()
        ]);

        if (customersJson.ok && customersJson.data) setCustomers(customersJson.data);

        if (salesJson.ok && salesJson.data) {
          setRawSales(salesJson.data);
          processAndFilter(salesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            selectedCustomer: "All",
            taxFilter: "All",
            minAmount: "",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching party sale summary:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processAndFilter(sales: any[], filters: any) {
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

      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return false;
      }

      return true;
    });

    const grouped = filtered.reduce((acc: any, s: any) => {
      const key = s.partyId?._id || s.partyId?.id || s.partyId || "walk-in";
      const isRet = s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return';

      if (!acc[key]) {
        acc[key] = {
          id: key,
          customerCode: s.partyId?.code || "WALK-001",
          customerName: s.partyId?.name || s.partyId?.companyName || s.customerName || "Walk-in",
          invoices: 0,
          gross: 0,
          returns: 0,
          discount: 0,
          gst: 0,
          net: 0
        };
      }

      acc[key].invoices += 1;
      if (isRet) {
        acc[key].returns += Math.abs(s.totalAmount || 0);
        acc[key].net -= Math.abs(s.totalAmount || 0);
      } else {
        acc[key].gross += s.subTotal || s.totalAmount || 0;
        acc[key].discount += s.discountAmount || 0;
        acc[key].gst += s.taxAmount || 0;
        acc[key].net += s.totalAmount || 0;
      }
      return acc;
    }, {});

    let list: any[] = Object.values(grouped);

    if (filters.minAmount) {
      const min = Number(filters.minAmount) || 0;
      list = list.filter((r: any) => r.net >= min || r.gross >= min);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((r: any) => 
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.customerCode && r.customerCode.toLowerCase().includes(q))
      );
    }

    const totalNetAll: number = list.reduce((s: number, r: any) => s + r.net, 0);
    const transformed = list.map((r: any) => ({
      ...r,
      percent: totalNetAll > 0 ? ((r.net / totalNetAll) * 100).toFixed(1) + "%" : "0%"
    })).sort((a: any, b: any) => b.net - a.net);

    setData(transformed);
  }

  const handleGenerate = () => {
    processAndFilter(rawSales, {
      dateFrom,
      dateTo,
      selectedCustomer,
      taxFilter,
      minAmount,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedCustomer("All");
    setTaxFilter("All");
    setMinAmount("");
    setSearchQuery("");
    processAndFilter(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedCustomer: "All",
      taxFilter: "All",
      minAmount: "",
      searchQuery: ""
    });
  };

  const totalGross = data.reduce((acc, curr) => acc + curr.gross, 0);
  const totalReturns = data.reduce((acc, curr) => acc + curr.returns, 0);
  const totalNet = data.reduce((acc, curr) => acc + curr.net, 0);

  const stats = [
    { title: "CUSTOMERS WITH SALES", value: data.length.toString(), subtitle: "Active in period", icon: Users, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "TOTAL SALE AMOUNT", value: `Rs. ${totalGross.toLocaleString()}`, subtitle: "Gross invoiced", icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "TOTAL RETURNS", value: `Rs. ${totalReturns.toLocaleString()}`, subtitle: "Sale returns", icon: TrendingDown, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "NET SALES", value: `Rs. ${totalNet.toLocaleString()}`, subtitle: "Sales - Returns", icon: TrendingUp, iconColor: "text-blue-600", iconBg: "bg-blue-50", valueColor: "text-blue-600" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min Net Amount</label>
          <input 
            type="number" 
            placeholder="0" 
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search Customer</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Name or Code..." 
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

  const barData = data.slice(0, 15).map(d => ({ name: d.customerName, value: d.net }));

  return (
    <ERPReportLayout
      title="Party Sale Summary"
      description="Consolidated sales performance and contribution by customer."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "PartySaleSummary.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Customer Sales Ledger</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} customers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Code</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Invoices</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Gross Sales</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Returns</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Discount</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GST</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Sales</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-xs text-slate-400">Loading party sale records...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-xs text-slate-400">No customer sales match the selected filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.customerCode}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-blue-600 dark:text-blue-400">{row.customerName}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-center text-slate-600 dark:text-slate-300">{row.invoices}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.gross.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.returns.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.discount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">{row.gst.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">Rs. {row.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-right text-rose-800 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">{row.percent}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} customers)</td>
                    <td className="px-4 py-3 text-[11px] text-center">{data.reduce((s, r) => s + r.invoices, 0)}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{totalGross.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600">{totalReturns.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.discount, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">{data.reduce((s, r) => s + r.gst, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {totalNet.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Top 15 Customers by Net Sales</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={90} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Net Sales (Rs)" fill="#881337" barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
