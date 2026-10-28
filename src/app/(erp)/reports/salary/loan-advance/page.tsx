"use client";

import ERPReportLayout from "@/components/erp/reports/ERPReportLayout";
import { Download, Printer, Play, Users, DollarSign, Wallet, History, Search, RotateCcw, TrendingDown, ArrowUpRight, FileSpreadsheet } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function StaffLoanAdvanceReportPage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Outstanding only");
  const [searchQuery, setSearchQuery] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const [loansRes, advancesRes, empRes] = await Promise.all([
        fetch("/api/salary-loans?t=" + Date.now(), { cache: "no-store" }),
        fetch("/api/salary-advances?t=" + Date.now(), { cache: "no-store" }),
        fetch("/api/employees?t=" + Date.now(), { cache: "no-store" })
      ]);
      
      const loansJson = await loansRes.json();
      const advancesJson = await advancesRes.json();
      const empJson = await empRes.json();
      
      let empMap = new Map();
      let empByName = new Map();
      let empByCode = new Map();
      let empList: any[] = [];

      if (empJson.ok && Array.isArray(empJson.data)) {
        empList = empJson.data;
        setEmployees(empList);
        empMap = new Map(empList.map((e: any) => [e._id || e.id, e]));
        empByName = new Map(empList.map((e: any) => [e.name, e]));
        empByCode = new Map(empList.map((e: any) => [e.code, e]));
      }

      const combinedData: any[] = [];
      
      // 1. Staff Opening Loans (Critical Fix: Include staff opening loan balances)
      empList.forEach((emp: any) => {
        const openingLoan = Number(emp.openingLoanBalance || 0);
        if (openingLoan > 0) {
          combinedData.push({
            id: `open-${emp._id || emp.id}`,
            staff: emp.name,
            code: emp.code || "EMP",
            type: "Loan",
            subType: "Opening Loan",
            issued: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "Opening",
            amount: openingLoan,
            recovered: 0,
            balance: openingLoan,
          });
        }
      });

      // 2. Regular Salary Loans
      if (loansJson.ok && Array.isArray(loansJson.data)) {
        loansJson.data.forEach((loan: any) => {
          if (loan.status === 'cancelled' || loan.status === 'Cancelled') return;
          const empId = loan.employeeId || loan.employee;
          const emp = empMap.get(empId) || empByName.get(empId) || empByCode.get(empId);
          const staffName = emp ? emp.name : (loan.employee || "Staff");
          const staffCode = emp ? emp.code : (loan.code || "EMP");

          combinedData.push({
            id: loan._id || loan.id,
            staff: staffName,
            code: staffCode,
            type: "Loan",
            subType: "General Loan",
            issued: loan.date ? new Date(loan.date).toLocaleDateString() : (loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : "-"),
            amount: Number(loan.amount || 0),
            recovered: Number(loan.deductedAmount || 0),
            balance: Number(loan.amount || 0) - Number(loan.deductedAmount || 0),
          });
        });
      }

      // 3. Salary Advances
      if (advancesJson.ok && Array.isArray(advancesJson.data)) {
        advancesJson.data.forEach((adv: any) => {
          if (adv.status === 'cancelled' || adv.status === 'Cancelled') return;
          const empId = adv.employeeId || adv.employee;
          const emp = empMap.get(empId) || empByName.get(empId) || empByCode.get(empId);
          const staffName = emp ? emp.name : (adv.employee || "Staff");
          const staffCode = emp ? emp.code : (adv.code || "EMP");

          combinedData.push({
            id: adv._id || adv.id,
            staff: staffName,
            code: staffCode,
            type: "Advance",
            subType: "Salary Advance",
            issued: adv.date ? new Date(adv.date).toLocaleDateString() : (adv.createdAt ? new Date(adv.createdAt).toLocaleDateString() : "-"),
            amount: Number(adv.amount || 0),
            recovered: Number(adv.deductedAmount || 0),
            balance: Number(adv.amount || 0) - Number(adv.deductedAmount || 0),
          });
        });
      }

      setReportData(combinedData);
    } catch (e) {
      console.error("Error generating staff loan/advance report:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const filteredData = useMemo(() => {
    return reportData.filter(r => {
      // Staff filter
      if (selectedStaff !== "All" && r.staff !== selectedStaff && r.code !== selectedStaff) return false;

      // Type filter
      if (selectedType !== "All" && r.type !== selectedType) return false;

      // Status filter
      if (selectedStatus === "Outstanding only" && r.balance <= 0) return false;
      if (selectedStatus === "Paid" && r.balance > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStaff = String(r.staff || "").toLowerCase().includes(q);
        const matchesCode = String(r.code || "").toLowerCase().includes(q);
        const matchesType = String(r.subType || r.type || "").toLowerCase().includes(q);
        if (!matchesStaff && !matchesCode && !matchesType) return false;
      }

      return true;
    });
  }, [reportData, selectedStaff, selectedType, selectedStatus, searchQuery]);

  const outstandingData = useMemo(() => {
    return filteredData.filter(r => r.balance > 0);
  }, [filteredData]);

  const totalLoanOutstanding = useMemo(() => {
    return filteredData.filter(r => r.type === "Loan" && r.balance > 0).reduce((sum, r) => sum + r.balance, 0);
  }, [filteredData]);

  const totalAdvanceOutstanding = useMemo(() => {
    return filteredData.filter(r => r.type === "Advance" && r.balance > 0).reduce((sum, r) => sum + r.balance, 0);
  }, [filteredData]);

  const totalReceivable = totalLoanOutstanding + totalAdvanceOutstanding;

  const stats = [
    { title: "Staff with Outstanding", value: new Set(outstandingData.map(r => r.code || r.staff)).size.toString(), icon: Users, iconColor: "text-slate-600 dark:text-slate-300", iconBg: "bg-slate-50 dark:bg-slate-800/50" },
    { title: "Loan Outstanding", value: `Rs.${totalLoanOutstanding.toLocaleString()}`, icon: History, iconColor: "text-amber-600", iconBg: "bg-amber-50" },
    { title: "Advance Outstanding", value: `Rs.${totalAdvanceOutstanding.toLocaleString()}`, icon: Wallet, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
    { title: "Total Receivable", value: `Rs.${totalReceivable.toLocaleString()}`, icon: DollarSign, iconColor: "text-white", iconBg: "bg-maroon-800", valueColor: "text-white" },
  ];

  const pieData = [
    { name: 'Loan Outstanding', value: totalLoanOutstanding, color: '#881337' },
    { name: 'Advance Outstanding', value: totalAdvanceOutstanding, color: '#d6a383' },
  ];

  const highestOutstanding = outstandingData.reduce((prev, current) => (prev.balance > current.balance) ? prev : current, { staff: "None", code: "N/A", balance: 0, type: "" } as any);

  const Filters = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff</label>
          <select 
            value={selectedStaff} 
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Staff</option>
            {employees.map(e => (
              <option key={e._id || e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="All">All Types</option>
            <option value="Loan">Loan</option>
            <option value="Advance">Advance</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/20 dark:text-white"
          >
            <option value="Outstanding only">Outstanding only</option>
            <option value="All">All Records</option>
            <option value="Paid">Paid / Settled</option>
          </select>
        </div>
        <div className="space-y-1 lg:col-span-2 flex items-end">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={12} />
            <input 
              type="text" 
              placeholder="Search by staff name or type..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all dark:text-white" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          className="px-3 py-2 bg-maroon-800 text-white rounded-lg text-[10px] font-bold hover:bg-maroon-900 flex items-center justify-center gap-1.5 shadow-sm shadow-maroon-900/20 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          <Play size={14} /> {isLoading ? "Fetching..." : "Refresh Report"}
        </button>
      </div>
    </div>
  );

  return (
    <ERPReportLayout
      title="Staff Loan & Advance"
      description="Detailed tracking of employee opening loans, additional loans, advances, and recovery status."
      stats={stats}
      filters={Filters}
      actions={[
        { label: "Print Report", onClick: printPage, icon: Printer },
        { label: "Export Excel", onClick: () => exportToExcel(filteredData, "StaffLoans.xlsx"), icon: FileSpreadsheet },
      ]}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Fetching records...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 mx-4">
            <TrendingDown size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No staff have loans or advances matching your filters</p>
          </div>
        ) : (
          <>
            <div className="px-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Outstanding Balances</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs font-bold">{filteredData.length} records</span>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff Name</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Type</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Issued Date</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-right">Amount (PKR)</th>
                      <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Recovered</th>
                      <th className="px-4 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((row, i) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-maroon-800 dark:text-rose-400">{row.staff}</span>
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{row.code}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                            row.subType === 'Opening Loan'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : row.type === 'Loan' 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' 
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}>
                            {row.subType || row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center">{row.issued}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-800 dark:text-slate-100 text-right">{row.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-emerald-700 dark:text-emerald-400 text-right">{row.recovered.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] font-black text-rose-700 dark:text-rose-400 text-right bg-rose-50/30 dark:bg-rose-950/20">{row.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-widest">Outstanding Distribution</h3>
                <div className="h-64 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `Rs.${value}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-center">
                 <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-xl">
                        <ArrowUpRight size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Highest Outstanding</p>
                        <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{highestOutstanding.staff} {highestOutstanding.code !== "N/A" ? `(${highestOutstanding.code})` : ""}</h4>
                        <p className="text-sm font-bold text-rose-600">Rs. {highestOutstanding.balance.toLocaleString()} ({highestOutstanding.subType || highestOutstanding.type})</p>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl">
                      <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-2">Recovery Insight</h4>
                      <p className="text-xs text-amber-900/70 dark:text-amber-300/70 leading-relaxed font-medium">
                        Staff opening loans and regular loans are recovered monthly via payroll deductions or final settlements.
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ERPReportLayout>
  );
}
