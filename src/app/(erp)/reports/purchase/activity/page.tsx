"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import React, { useState, useEffect } from "react";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, RotateCcw, ShoppingCart, Package, FileText, RotateCcw as RotateLeft, ArrowRight, FileSpreadsheet, Play, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart } from 'recharts';

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

export default function PurchaseActivityReportPage() {
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [docType, setDocType] = useState("All");
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [taxFilter, setTaxFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [purchasesRes, vendorsRes] = await Promise.all([
          fetch('/api/purchases'),
          fetch('/api/parties?type=vendor')
        ]);
        const [purchasesJson, vendorsJson] = await Promise.all([
          purchasesRes.json(),
          vendorsRes.json()
        ]);

        if (vendorsJson.ok && vendorsJson.data) {
          setVendors(vendorsJson.data);
        }

        if (purchasesJson.ok && purchasesJson.data) {
          setRawPurchases(purchasesJson.data);
          processAndFilterData(purchasesJson.data, {
            dateFrom: getStartOfMonthStr(),
            dateTo: getCurrentDateStr(),
            docType: "All",
            selectedVendor: "All",
            taxFilter: "All",
            searchQuery: ""
          });
        }
      } catch (error) {
        console.error("Error fetching purchase activity:", error);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  function processAndFilterData(items: any[], filters: any) {
    let filtered = items.filter((p: any) => {
      if (p.date) {
        const d = p.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }
      if (filters.selectedVendor !== "All") {
        const vId = p.partyId?._id || p.partyId?.id || p.partyId;
        if (vId !== filters.selectedVendor) return false;
      }
      if (filters.docType !== "All") {
        const t = (p.type || "purchase_invoice").toLowerCase();
        if (t !== filters.docType.toLowerCase()) return false;
      }
      if (filters.taxFilter === "tax") {
        if (!p.isTaxInvoice && (p.taxAmount || 0) <= 0) return false;
      } else if (filters.taxFilter === "non-tax") {
        if (p.isTaxInvoice || (p.taxAmount || 0) > 0) return false;
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const vName = p.partyId?.name || p.partyId?.companyName || "";
        const docNo = p.invoiceNo || p.billNumber || p.docNo || "";
        if (!vName.toLowerCase().includes(q) && !docNo.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const grouped = filtered.reduce((acc: any, p: any) => {
      const month = new Date(p.date || Date.now()).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { period: month, pos: 0, poAmt: 0, grns: 0, grnAmt: 0, invoices: 0, invAmt: 0, returns: 0, retAmt: 0, net: 0, count: 0 };
      }
      
      acc[month].count += 1;
      const amt = p.totalAmount || 0;
      if (p.type === 'purchase_order') { 
        acc[month].pos += 1; 
        acc[month].poAmt += amt; 
      } else if (p.type === 'grn') { 
        acc[month].grns += 1; 
        acc[month].grnAmt += amt; 
      } else if (p.type === 'purchase_return') { 
        acc[month].returns += 1; 
        acc[month].retAmt += amt; 
      } else { 
        acc[month].invoices += 1; 
        acc[month].invAmt += amt; 
      }
      
      acc[month].net += (p.type === 'purchase_return' ? -amt : amt);
      return acc;
    }, {});

    setData(Object.values(grouped).map((g: any) => ({
      ...g,
      avgValue: g.count > 0 ? (g.invAmt / g.count).toFixed(0) : 0,
      growth: "-"
    })));
  }

  const handleGenerate = () => {
    processAndFilterData(rawPurchases, {
      dateFrom,
      dateTo,
      docType,
      selectedVendor,
      taxFilter,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setDocType("All");
    setSelectedVendor("All");
    setTaxFilter("All");
    setSearchQuery("");
    processAndFilterData(rawPurchases, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      docType: "All",
      selectedVendor: "All",
      taxFilter: "All",
      searchQuery: ""
    });
  };

  const totalPos = data.reduce((s, r) => s + r.pos, 0);
  const totalPoAmt = data.reduce((s, r) => s + r.poAmt, 0);
  const totalGrns = data.reduce((s, r) => s + r.grns, 0);
  const totalGrnAmt = data.reduce((s, r) => s + r.grnAmt, 0);
  const totalInvs = data.reduce((s, r) => s + r.invoices, 0);
  const totalInvAmt = data.reduce((s, r) => s + r.invAmt, 0);
  const totalRet = data.reduce((s, r) => s + r.returns, 0);
  const totalRetAmt = data.reduce((s, r) => s + r.retAmt, 0);

  const stats = [
    { title: "TOTAL POS", value: totalPos.toString(), subtitle: `Rs. ${totalPoAmt.toLocaleString()}`, icon: ShoppingCart, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "TOTAL GRNS", value: totalGrns.toString(), subtitle: `Rs. ${totalGrnAmt.toLocaleString()}`, icon: Package, iconColor: "text-indigo-600", iconBg: "bg-indigo-50" },
    { title: "TOTAL INVOICES", value: totalInvs.toString(), subtitle: `Rs. ${totalInvAmt.toLocaleString()}`, icon: FileText, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "TOTAL RETURNS", value: totalRet.toString(), subtitle: `Rs. ${totalRetAmt.toLocaleString()}`, icon: RotateLeft, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Type</label>
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Types</option>
            <option value="purchase_invoice">Purchase Invoice</option>
            <option value="purchase_order">Purchase Order (PO)</option>
            <option value="grn">GRN</option>
            <option value="purchase_return">Purchase Return</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor</label>
          <select 
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Vendors</option>
            {vendors.map((v: any) => (
              <option key={v._id || v.id} value={v._id || v.id}>
                {v.name || v.companyName} {v.code ? `(${v.code})` : ''}
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Search</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Doc No / Vendor..." 
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

  const lineData = data.map(d => ({ name: d.period, invoiceAmt: d.invAmt, netAmt: d.net }));
  const stackedData = data.map(d => ({ name: d.period, grns: d.grns, invoices: d.invoices, pos: d.pos, returns: d.returns }));
  const avgData = data.map(d => ({ name: d.period, avgValue: Number(d.avgValue), netAmount: d.net }));

  return (
    <ERPReportLayout
      title="Purchase Activity"
      description="Reports / Purchase Reports / Purchase Activity"
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "PurchaseActivity.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4 overflow-x-auto">
          <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">POs</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">PO Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">GRNs</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GRN Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Invoices</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Invoice Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Returns</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Return Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-xs text-slate-400">Loading purchase activity data...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-xs text-slate-400">No purchase activity records match the selected filters.</td>
                </tr>
              ) : (
                data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.period}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">{row.pos}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.poAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">{row.grns}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-right">{row.grnAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">{row.invoices}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.invAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-center">{row.returns}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">{row.retAmt.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">{row.net.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-500 text-right">Rs. {Number(row.avgValue).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">PO to GRN to Invoice Flow</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded text-[9px] uppercase tracking-wider font-bold">Conversion tracking</span>
          </div>
          <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-center gap-4 overflow-x-auto">
            <FlowNode icon={ShoppingCart} title="PURCHASE ORDERS" count={totalPos.toString()} amount={totalPoAmt.toLocaleString()} colorClass="bg-rose-100 text-rose-600" borderClass="border-rose-100" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-rose-600 mb-1">{totalPos > 0 ? ((totalGrns / totalPos) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={Package} title="GOODS RECEIPTS" count={totalGrns.toString()} amount={totalGrnAmt.toLocaleString()} colorClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" borderClass="border-slate-200 dark:border-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-rose-600 mb-1">{totalGrns > 0 ? ((totalInvs / totalGrns) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={FileText} title="PURCHASE INVOICES" count={totalInvs.toString()} amount={totalInvAmt.toLocaleString()} colorClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" borderClass="border-slate-200 dark:border-slate-800" />
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-rose-600 mb-1">{totalInvs > 0 ? ((totalRet / totalInvs) * 100).toFixed(0) : 0}%</span>
              <ArrowRight className="text-slate-300" size={20} />
            </div>
            <FlowNode icon={RotateLeft} title="RETURNS" count={totalRet.toString()} amount={totalRetAmt.toLocaleString()} colorClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" borderClass="border-slate-200 dark:border-slate-800" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:col-span-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Purchase Trend Over Time (Monthly)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }}/>
                  <Line type="monotone" dataKey="invoiceAmt" name="Invoice Amount" stroke="#d6a383" strokeWidth={2} dot={{ fill: '#d6a383', r: 4 }} />
                  <Line type="monotone" dataKey="netAmt" name="Net Amount" stroke="#881337" strokeWidth={2} dot={{ fill: '#881337', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Document Count by Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis tick={{fontSize: 10}} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px' }}/>
                  <Bar dataKey="grns" stackId="a" name="GRNs" fill="#881337" barSize={40} />
                  <Bar dataKey="invoices" stackId="a" name="Invoices" fill="#d6a383" barSize={40} />
                  <Bar dataKey="pos" stackId="a" name="POs" fill="#9f1239" barSize={40} />
                  <Bar dataKey="returns" stackId="a" name="Returns" fill="#eab308" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6">Average Purchase Value</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={avgData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis yAxisId="left" tick={{fontSize: 10}} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10}} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: '10px' }}/>
                  <Bar yAxisId="left" dataKey="avgValue" name="Avg Value" fill="#fecdd3" barSize={20} stroke="#881337" />
                  <Line yAxisId="right" type="monotone" dataKey="netAmount" name="Net Amount" stroke="#d6a383" strokeWidth={2} dot={{ fill: '#d6a383', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ERPReportLayout>
  );
}
