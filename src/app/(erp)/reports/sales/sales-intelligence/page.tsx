"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, ShoppingCart, Percent, DollarSign, MapPin, Users, BarChart3, TrendingUp, FileSpreadsheet, RotateCcw, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';

export default function SalesIntelligenceReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, custRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/parties?type=customer')
        ]);
        const [salesJson, custJson] = await Promise.all([
          salesRes.json(),
          custRes.json()
        ]);

        if (custJson.ok && custJson.data) setCustomers(custJson.data);

        if (salesJson.ok && salesJson.data) {
          setRawSales(salesJson.data);
          processIntelligence(salesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            selectedCustomer: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching intelligence data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processIntelligence(sales: any[], filters: any) {
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

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const cName = s.partyId?.name || s.partyId?.companyName || s.customerName || "";
        const docNo = s.invoiceNo || s.docNo || "";
        if (!cName.toLowerCase().includes(q) && !docNo.toLowerCase().includes(q)) return false;
      }

      return true;
    });

    setData(filtered);
    setQuotations(filtered.filter((s: any) => s.type === 'quotation'));
  }

  const handleGenerate = () => {
    processIntelligence(rawSales, {
      dateFrom,
      dateTo,
      selectedCustomer,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedCustomer("All");
    setSearchQuery("");
    processIntelligence(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedCustomer: "All",
      searchQuery: ""
    });
  };

  const siOnly = data.filter(s => s.type === 'sale' || s.type === 'sale_invoice' || s.type === 'non_tax_sale' || s.type === 'pos');
  const totalRevenue = siOnly.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const uniqueCustomers = new Set(siOnly.map(s => s.partyId?._id || s.customerName)).size;
  const avgOrderValue = siOnly.length > 0 ? totalRevenue / siOnly.length : 0;
  const totalQtValue = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const conversionRate = quotations.length > 0 ? ((siOnly.length / quotations.length) * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Total Quotations", value: quotations.length.toString(), subtitle: `Rs. ${totalQtValue.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Conversion Rate", value: `${conversionRate}%`, subtitle: "SI count / total QT", icon: Percent, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, subtitle: "Posted sales in period", icon: DollarSign, iconColor: "text-rose-600", iconBg: "bg-rose-50", valueColor: "text-rose-600" },
    { title: "Active Customers", value: uniqueCustomers.toString(), subtitle: "Customers billed", icon: Users, iconColor: "text-purple-600", iconBg: "bg-purple-50" },
    { title: "Avg Order Value", value: `Rs. ${Math.round(avgOrderValue).toLocaleString()}`, subtitle: "Average invoice size", icon: BarChart3, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Customer or Invoice #..." 
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

  const topCustomers = Object.entries(siOnly.reduce((acc: any, curr) => {
    const name = curr.partyId?.name || curr.customerName || "Walk-in";
    if (!acc[name]) acc[name] = { name, revenue: 0, orders: 0 };
    acc[name].revenue += curr.totalAmount || 0;
    acc[name].orders += 1;
    return acc;
  }, {})).map(([_, v]) => v).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);

  return (
    <ERPReportLayout
      title="Sales Intelligence"
      description="Executive business intelligence dashboard covering key revenue drivers, conversion, and top contributors."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(topCustomers, "SalesIntelligence.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Top 10 High Value Customers by Revenue</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={90} />
                  <RechartsTooltip />
                  <Bar dataKey="revenue" name="Revenue (Rs)" fill="#881337" barSize={16} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Top Revenue Contributors</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{topCustomers.length} top customers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Orders Count</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue (Rs)</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Order Size</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">% of Period Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-slate-400">Loading sales intelligence...</td>
                  </tr>
                ) : topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-slate-400">No customer sales found matching the selected filters.</td>
                  </tr>
                ) : (
                  topCustomers.map((c: any, i: number) => (
                    <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                      <td className="px-4 py-3 text-[11px] text-center font-bold text-slate-600 dark:text-slate-300">{c.orders}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">Rs. {c.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300 text-right">Rs. {Math.round(c.revenue / c.orders).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-rose-800 dark:text-rose-400 text-right bg-rose-50/30 dark:bg-rose-950/20">{totalRevenue > 0 ? ((c.revenue / totalRevenue) * 100).toFixed(1) + "%" : "0%"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
