"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, FileText, ShoppingCart, Percent, RotateCcw, Activity, ArrowRight, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend } from 'recharts';

function FlowNode({ icon: Icon, title, count, amount, colorClass, borderClass }: any) {
  return (
    <div className={`p-4 rounded-xl border ${borderClass} bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3 min-w-[200px]`}>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</div>
        <div className="text-sm font-black text-slate-800 dark:text-slate-100">{count} docs</div>
        <div className="text-xs font-bold text-maroon-800 dark:text-rose-400">Rs. {amount}</div>
      </div>
    </div>
  );
}

export default function SaleActivityReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [docType, setDocType] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");

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
          filterData(salesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            docType: "All",
            taxFilter: "All",
            selectedCustomer: "All"
          });
        }
      } catch (error) {
        console.error("Error fetching sale activity:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function filterData(sales: any[], filters: any) {
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

      if (filters.docType !== "All") {
        const t = (s.type || "").toLowerCase();
        if (filters.docType === "quotation" && t !== 'quotation') return false;
        if (filters.docType === "sale_order" && t !== 'sale_order') return false;
        if (filters.docType === "sale_invoice" && !t.includes('sale') && !t.includes('pos')) return false;
        if (filters.docType === "sale_return" && !t.includes('return')) return false;
      }

      if (filters.taxFilter === "tax") {
        if (!s.isTaxInvoice && (s.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (s.isTaxInvoice || (s.taxAmount || 0) > 0) return false;
      }

      return true;
    });

    setData(filtered);
  }

  const handleGenerate = () => {
    filterData(rawSales, {
      dateFrom,
      dateTo,
      docType,
      taxFilter,
      selectedCustomer
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
    filterData(rawSales, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      docType: "All",
      taxFilter: "All",
      selectedCustomer: "All"
    });
  };

  const quotations = data.filter(s => s.type === 'quotation');
  const orders = data.filter(s => s.type === 'sale_order');
  const invoices = data.filter(s => s.type === 'sale' || s.type === 'sale_invoice' || s.type === 'non_tax_sale' || s.type === 'pos');
  const returns = data.filter(s => s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return');

  const qtTotal = quotations.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const soTotal = orders.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const siTotal = invoices.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const retTotal = returns.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const conversionRate = quotations.length > 0 ? ((invoices.length / quotations.length) * 100).toFixed(1) : "0.0";

  const stats = [
    { title: "Total Quotations", value: quotations.length.toString(), subtitle: `Rs. ${qtTotal.toLocaleString()}`, icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Total Orders", value: orders.length.toString(), subtitle: `Rs. ${soTotal.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Total Invoices", value: invoices.length.toString(), subtitle: `Rs. ${siTotal.toLocaleString()}`, icon: FileText, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Conversion Rate (QT → SI)", value: `${conversionRate}%`, subtitle: `SI count / QT count`, icon: Percent, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
  ];

  const Filters = (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
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
            <option value="quotation">Quotations Only</option>
            <option value="sale_order">Sale Orders</option>
            <option value="sale_invoice">Sale Invoices</option>
            <option value="sale_return">Sale Returns</option>
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

  const groupedByPeriod = data.reduce((acc: any, curr) => {
    const period = new Date(curr.date || Date.now()).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[period]) {
      acc[period] = { period, qt: 0, so: 0, si: 0, ret: 0, qtAmt: 0, soAmt: 0, siAmt: 0, retAmt: 0 };
    }
    const amt = curr.totalAmount || 0;
    if (curr.type === 'quotation') { acc[period].qt++; acc[period].qtAmt += amt; }
    else if (curr.type === 'sale_order') { acc[period].so++; acc[period].soAmt += amt; }
    else if (curr.type === 'sale_return' || curr.type === 'non_tax_sale_return') { acc[period].ret++; acc[period].retAmt += amt; }
    else { acc[period].si++; acc[period].siAmt += amt; }
    return acc;
  }, {});

  const periodData = Object.values(groupedByPeriod);

  return (
    <ERPReportLayout
      title="Sale Activity"
      description="Funnel and conversion tracking of sales pipeline: Quotations → Orders → Invoices → Returns."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(periodData, "SaleActivity.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pipeline Flow Tracking</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded text-[9px] uppercase tracking-wider font-bold">Conversion Funnel</span>
          </div>
          <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-center gap-4 overflow-x-auto">
            <FlowNode icon={FileText} title="QUOTATIONS" count={quotations.length.toString()} amount={qtTotal.toLocaleString()} colorClass="bg-amber-100 text-amber-600" borderClass="border-amber-100" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-amber-600 mb-1">{quotations.length > 0 ? ((orders.length / quotations.length) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={ShoppingCart} title="SALE ORDERS" count={orders.length.toString()} amount={soTotal.toLocaleString()} colorClass="bg-blue-100 text-blue-600" borderClass="border-blue-100" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-blue-600 mb-1">{orders.length > 0 ? ((invoices.length / orders.length) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={FileText} title="SALE INVOICES" count={invoices.length.toString()} amount={siTotal.toLocaleString()} colorClass="bg-emerald-100 text-emerald-600" borderClass="border-emerald-100" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-rose-600 mb-1">{invoices.length > 0 ? ((returns.length / invoices.length) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={RotateCcw} title="RETURNS" count={returns.length.toString()} amount={retTotal.toLocaleString()} colorClass="bg-rose-100 text-rose-600" borderClass="border-rose-100" />
          </div>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Monthly Sales Pipeline Breakdown</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{periodData.length} periods</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">QT Docs</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">QT Value</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">SO Docs</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">SO Value</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">SI Docs</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">SI Value</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Returns</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-xs text-slate-400">Loading activity...</td>
                  </tr>
                ) : periodData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-xs text-slate-400">No activity data matches the selected filters.</td>
                  </tr>
                ) : (
                  periodData.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.period}</td>
                      <td className="px-4 py-3 text-[11px] text-center text-slate-600 dark:text-slate-300">{row.qt}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-600 dark:text-slate-300">Rs. {row.qtAmt.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center text-slate-600 dark:text-slate-300">{row.so}</td>
                      <td className="px-4 py-3 text-[11px] text-right text-slate-600 dark:text-slate-300">Rs. {row.soAmt.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center font-bold text-slate-800 dark:text-slate-100">{row.si}</td>
                      <td className="px-4 py-3 text-[11px] text-right font-black text-slate-800 dark:text-slate-100">Rs. {row.siAmt.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center text-rose-600">{row.ret}</td>
                      <td className="px-4 py-3 text-[11px] text-right font-black text-emerald-600">Rs. {(row.siAmt - row.retAmt).toLocaleString()}</td>
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
