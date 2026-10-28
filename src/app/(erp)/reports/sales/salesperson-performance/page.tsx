"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";
import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Award, Users, DollarSign, TrendingUp, FileSpreadsheet, RotateCcw, Search } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';

export default function SalespersonPerformanceReportPage() {
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawCash, setRawCash] = useState<any[]>([]);
  const [rawBank, setRawBank] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getStartOfMonthStr());
  const [dateTo, setDateTo] = useState(getCurrentDateStr());
  const [selectedSalesperson, setSelectedSalesperson] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [salesRes, cashRes, bankRes, empRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/cash-receipts'),
          fetch('/api/bank-receipts'),
          fetch('/api/employees')
        ]);
        const [salesJson, cashJson, bankJson, empJson] = await Promise.all([
          salesRes.json(),
          cashRes.json(),
          bankRes.json(),
          empRes.json()
        ]);

        if (empJson.ok && empJson.data) setEmployees(empJson.data);

        const salesList = salesJson.ok && Array.isArray(salesJson.data) ? salesJson.data : [];
        const cashList = cashJson.ok && Array.isArray(cashJson.data) ? cashJson.data : [];
        const bankList = bankJson.ok && Array.isArray(bankJson.data) ? bankJson.data : [];

        setRawSales(salesList);
        setRawCash(cashList);
        setRawBank(bankList);

        processPerformance(salesList, cashList, bankList, empJson.ok ? empJson.data : [], {
          dateFrom: getStartOfMonthStr(),
          dateTo: getCurrentDateStr(),
          selectedSalesperson: "All",
          searchQuery: ""
        });
      } catch (error) {
        console.error("Error fetching performance:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  function processPerformance(sales: any[], cash: any[], bank: any[], emps: any[], filters: any) {
    const personMap: Record<string, any> = {};

    emps.forEach((emp: any) => {
      personMap[emp.name] = {
        name: emp.name,
        designation: emp.designation || "Salesperson",
        sales: 0,
        collections: 0,
        invoicesCount: 0
      };
    });

    sales.forEach((s: any) => {
      if (s.date) {
        const d = s.date.substring(0, 10);
        if (filters.dateFrom && d < filters.dateFrom) return;
        if (filters.dateTo && d > filters.dateTo) return;
      }

      const name = s.employeeId?.name || "Unassigned";
      if (!personMap[name]) {
        personMap[name] = { name, designation: "Sales", sales: 0, collections: 0, invoicesCount: 0 };
      }

      const isReturn = (s.type === 'sale_return' || s.type === 'non_tax_sale_return' || s.type === 'pos_return');
      const factor = isReturn ? -1 : 1;
      personMap[name].sales += (Number(s.totalAmount) || 0) * factor;
      personMap[name].invoicesCount += 1;
    });

    const processReceipts = (receipts: any[]) => {
      receipts.forEach((r: any) => {
        if (r.date) {
          const d = r.date.substring(0, 10);
          if (filters.dateFrom && d < filters.dateFrom) return;
          if (filters.dateTo && d > filters.dateTo) return;
        }

        const name = r.employeeId?.name || r.partyId?.salespersonId?.name || "Unassigned";
        if (!personMap[name]) {
          personMap[name] = { name, designation: "Sales", sales: 0, collections: 0, invoicesCount: 0 };
        }
        personMap[name].collections += (Number(r.amount) || 0);
      });
    };

    processReceipts(cash);
    processReceipts(bank);

    let list = Object.values(personMap).map((p: any) => ({
      ...p,
      pending: p.sales - p.collections,
      recoveryRate: p.sales > 0 ? ((p.collections / p.sales) * 100).toFixed(1) + "%" : "0.0%"
    }));

    if (filters.selectedSalesperson !== "All") {
      list = list.filter((p: any) => p.name === filters.selectedSalesperson);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter((p: any) => p.name.toLowerCase().includes(q) || (p.designation && p.designation.toLowerCase().includes(q)));
    }

    setData(list.sort((a: any, b: any) => b.sales - a.sales));
  }

  const handleGenerate = () => {
    processPerformance(rawSales, rawCash, rawBank, employees, {
      dateFrom,
      dateTo,
      selectedSalesperson,
      searchQuery
    });
  };

  const handleReset = () => {
    const defaultFrom = getStartOfMonthStr();
    const defaultTo = getCurrentDateStr();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedSalesperson("All");
    setSearchQuery("");
    processPerformance(rawSales, rawCash, rawBank, employees, {
      dateFrom: defaultFrom,
      dateTo: defaultTo,
      selectedSalesperson: "All",
      searchQuery: ""
    });
  };

  const totalSales = data.reduce((s, p) => s + p.sales, 0);
  const totalCollections = data.reduce((s, p) => s + p.collections, 0);

  const stats = [
    { title: "Total Salespersons", value: data.length.toString(), icon: Users, iconColor: "text-rose-600", iconBg: "bg-rose-50" },
    { title: "Total Sales", value: `Rs. ${totalSales.toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", valueColor: "text-emerald-600" },
    { title: "Total Collections", value: `Rs. ${totalCollections.toLocaleString()}`, icon: TrendingUp, iconColor: "text-blue-600", iconBg: "bg-blue-50" },
    { title: "Avg Sale per Person", value: `Rs. ${data.length > 0 ? Math.round(totalSales / data.length).toLocaleString() : "0"}`, icon: Award, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesperson</label>
          <select 
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20"
          >
            <option value="All">All Salespersons</option>
            {employees.map((emp: any) => (
              <option key={emp._id || emp.id} value={emp.name}>
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
              placeholder="Name or Designation..." 
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
      title="Salesperson Performance"
      description="Track and evaluate sales figures, customer collections, and recovery efficiency per salesperson."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(data, "SalespersonPerformance.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        <div className="px-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Performance Scorecard</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{data.length} persons</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border-b border-slate-200 dark:border-slate-800 min-w-max">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Salesperson</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Invoices</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Net Sales</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Collections</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Pending Receivable</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Recovery Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">Loading performance data...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-xs text-slate-400">No salesperson performance data found matching the filters.</td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.name}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{row.designation}</td>
                      <td className="px-4 py-3 text-[11px] text-center font-bold text-slate-600 dark:text-slate-300">{row.invoicesCount}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">Rs. {row.sales.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-emerald-600 text-right">Rs. {row.collections.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-rose-600 text-right">Rs. {row.pending.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[11px] text-center font-bold text-blue-600">{row.recoveryRate}</td>
                    </tr>
                  ))
                )}
                {data.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                    <td colSpan={4} className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-slate-800 dark:text-slate-100">TOTAL ({data.length} persons)</td>
                    <td className="px-4 py-3 text-[11px] text-right text-slate-900 dark:text-slate-100">Rs. {totalSales.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-emerald-600">Rs. {totalCollections.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[11px] text-right text-rose-600">Rs. {(totalSales - totalCollections).toLocaleString()}</td>
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
