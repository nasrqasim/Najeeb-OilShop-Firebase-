import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  X, 
  Save, 
  CheckCircle2, 
  Plus,
  Trash2,
  Printer,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { printPage } from "@/lib/excel";

interface SettlementLine {
  id: string;
  description: string;
  amount: number;
}

export default function FinalSettlementForm({ onClose, initialData }: any) {
  const [earnings, setEarnings] = useState<SettlementLine[]>(initialData?.earnings || [
    { id: "1", description: "Last Month / Days Salary", amount: 0 },
    { id: "2", description: "Gratuity", amount: 0 },
    { id: "3", description: "Leave Encashment", amount: 0 },
    { id: "4", description: "Notice Pay", amount: 0 },
    { id: "5", description: "Bonus / Goodwill / Other", amount: 0 },
  ]);

  const [deductions, setDeductions] = useState<SettlementLine[]>(initialData?.deductionLines || []);

  const [formData, setFormData] = useState({
    voucherNo: initialData?.voucherNo || `FF-${Date.now()}`,
    date: initialData?.date ? initialData.date.split("T")[0] : new Date().toISOString().split("T")[0],
    employee: initialData?.employee || "",
    employeeId: initialData?.employeeId || "",
    leavingDate: initialData?.leavingDate ? initialData.leavingDate.split("T")[0] : new Date().toISOString().split("T")[0],
    reason: initialData?.reason || "Resignation",
    notes: initialData?.notes || "",
    status: initialData?.status || "Draft"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [allAdvances, setAllAdvances] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [empRes, loansRes, advRes] = await Promise.all([
          fetch("/api/employees?t=" + Date.now(), { cache: "no-store" }),
          fetch("/api/salary-loans?t=" + Date.now(), { cache: "no-store" }),
          fetch("/api/salary-advances?t=" + Date.now(), { cache: "no-store" })
        ]);
        const [empJson, loansJson, advJson] = await Promise.all([
          empRes.json(),
          loansRes.json(),
          advRes.json()
        ]);
        if (empJson.ok && Array.isArray(empJson.data)) setEmployees(empJson.data);
        if (loansJson.ok && Array.isArray(loansJson.data)) setAllLoans(loansJson.data);
        if (advJson.ok && Array.isArray(advJson.data)) setAllAdvances(advJson.data);
      } catch (err) {
        console.error("Error loading final settlement dependencies:", err);
      }
    }
    loadData();
  }, []);

  // Automated calculation when employee or leavingDate changes
  const applyAutomation = (empNameOrId: string, leavingDateStr: string) => {
    if (!empNameOrId) return;
    const emp = employees.find(e => (e._id || e.id) === empNameOrId || e.name === empNameOrId);
    if (!emp) return;

    // 1. Auto Salary Calculation:
    const monthlySalary = Number(emp.fixedMonthlySalary || emp.basicSalary || 0);
    let calculatedSalary = 0;
    let daysWorked = 0;

    if (leavingDateStr && monthlySalary > 0) {
      const leaving = new Date(leavingDateStr);
      const dayOfMonth = leaving.getDate();
      const daysInMonth = new Date(leaving.getFullYear(), leaving.getMonth() + 1, 0).getDate();
      daysWorked = Math.min(dayOfMonth, daysInMonth);
      calculatedSalary = Math.round((monthlySalary / (daysInMonth || 30)) * daysWorked);
    }

    setEarnings(prev => {
      const updated = [...prev];
      const salaryIdx = updated.findIndex(e => e.description.toLowerCase().includes("last month") || e.description.toLowerCase().includes("salary"));
      const label = `Last Month / Days Salary (${daysWorked} Days)`;
      if (salaryIdx >= 0) {
        updated[salaryIdx] = { ...updated[salaryIdx], description: label, amount: calculatedSalary };
      } else {
        updated.unshift({ id: "1", description: label, amount: calculatedSalary });
      }
      return updated;
    });

    // 2. Auto Loan / Advance Deduction:
    const openingLoan = Number(emp.openingLoanBalance || 0);
    const empId = emp._id || emp.id;
    
    // Remaining additional loans
    const empLoans = allLoans.filter(l => 
      (l.employeeId === empId || l.employee === emp.name || l.staff === emp.name) && 
      l.status !== 'cancelled' && l.status !== 'Cancelled'
    );
    const loanBalance = empLoans.reduce((sum, l) => sum + (Number(l.amount || 0) - Number(l.deductedAmount || 0)), 0);

    // Remaining advances
    const empAdvs = allAdvances.filter(a => 
      (a.employeeId === empId || a.employee === emp.name || a.staff === emp.name) && 
      a.status !== 'cancelled' && a.status !== 'Cancelled'
    );
    const advanceBalance = empAdvs.reduce((sum, a) => sum + (Number(a.amount || 0) - Number(a.deductedAmount || 0)), 0);

    const autoDeductions: SettlementLine[] = [];
    if (openingLoan > 0) {
      autoDeductions.push({ id: "ded-open-loan", description: "Remaining Opening Loan Balance", amount: openingLoan });
    }
    if (loanBalance > 0) {
      autoDeductions.push({ id: "ded-staff-loan", description: "Remaining Staff Loans", amount: loanBalance });
    }
    if (advanceBalance > 0) {
      autoDeductions.push({ id: "ded-advances", description: "Outstanding Salary Advances", amount: advanceBalance });
    }

    // Preserve any custom user-added deductions other than the auto ones
    setDeductions(prev => {
      const customDeductions = prev.filter(d => 
        !d.id.startsWith("ded-open-loan") && 
        !d.id.startsWith("ded-staff-loan") && 
        !d.id.startsWith("ded-advances")
      );
      return [...autoDeductions, ...customDeductions];
    });
  };

  const handleEmployeeChange = (empIdentifier: string) => {
    const emp = employees.find(e => (e._id || e.id) === empIdentifier || e.name === empIdentifier);
    setFormData(prev => ({
      ...prev,
      employee: emp ? emp.name : empIdentifier,
      employeeId: emp ? (emp._id || emp.id) : ""
    }));
    applyAutomation(empIdentifier, formData.leavingDate);
  };

  const handleLeavingDateChange = (dateVal: string) => {
    setFormData(prev => ({ ...prev, leavingDate: dateVal }));
    if (formData.employee) {
      applyAutomation(formData.employee, dateVal);
    }
  };

  const addEarning = () => setEarnings([...earnings, { id: Date.now().toString(), description: "", amount: 0 }]);
  const removeEarning = (id: string) => setEarnings(earnings.filter(e => e.id !== id));
  
  const addDeduction = () => setDeductions([...deductions, { id: Date.now().toString(), description: "", amount: 0 }]);
  const removeDeduction = (id: string) => setDeductions(deductions.filter(d => d.id !== id));

  const updateLine = (list: SettlementLine[], setList: (l: SettlementLine[]) => void, id: string, field: "description" | "amount", value: any) => {
    setList(list.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const netPayable = totalEarnings - totalDeductions;

  const handleSubmit = async (submitStatus: string) => {
    if (!formData.employee) {
      alert("Please select an employee");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        grossPay: totalEarnings,
        deductions: totalDeductions,
        netPayable: netPayable,
        status: submitStatus,
        earnings,
        deductionLines: deductions
      };
      
      const url = initialData?._id ? `/api/salary-settlements/${initialData._id}` : "/api/salary-settlements";
      const method = initialData?._id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && (json.ok || json.data)) {
        onClose();
      } else {
        alert(json.message || json.error || "Failed to save settlement");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settlement record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{initialData ? "Edit Final Settlement" : "Final Settlement (F&F)"}</h1>
            <p className="text-xs text-slate-400">Automated salary calculation and remaining loan/advance deductions</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
          <button type="button" onClick={() => handleSubmit("Draft")} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-lg flex items-center shadow-lg transition-all disabled:opacity-50">
            <Save size={16} className="mr-2" /> Save Draft
          </button>
          <button type="button" onClick={() => handleSubmit("Approved")} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center shadow-lg transition-all disabled:opacity-50">
            <CheckCircle2 size={16} className="mr-2" /> Save &amp; Post
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8 pb-24">
        {/* Top Details Card */}
        <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Doc Date *</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold dark:text-white" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Salary Staff *</label>
              <select 
                value={formData.employeeId || formData.employee} 
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100" 
                required
              >
                <option value="">-- Select Staff Member --</option>
                {employees.map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name} ({emp.code || "EMP"} - Salary: PKR {(Number(emp.fixedMonthlySalary || emp.basicSalary || 0)).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Last Working Day *</label>
              <input 
                type="date" 
                value={formData.leavingDate} 
                onChange={(e) => handleLeavingDateChange(e.target.value)} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold dark:text-white" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reason</label>
              <select 
                value={formData.reason} 
                onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold dark:text-white"
              >
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="Retirement">Retirement</option>
                <option value="Contract End">Contract End</option>
              </select>
            </div>
          </div>
        </section>

        {/* Earnings Table */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">1. Earnings / Payable Salary</h3>
              <p className="text-[10px] text-slate-400">Calculated pro-rata monthly salary up to the last working day + allowances</p>
            </div>
            <button 
              type="button"
              onClick={addEarning} 
              className="p-2 text-white bg-maroon-800 rounded-lg hover:bg-maroon-900 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Plus size={16} /> Add Earning
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-12 text-center">#</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-48 text-right">Amount (PKR)</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {earnings.map((e, i) => (
                <tr key={e.id}>
                  <td className="px-6 py-3 text-sm font-bold text-slate-400 dark:text-slate-500 text-center">{i + 1}</td>
                  <td className="px-6 py-3">
                    <input 
                      value={e.description} 
                      onChange={(val) => updateLine(earnings, setEarnings, e.id, "description", val.target.value)} 
                      className="w-full bg-transparent text-sm font-semibold focus:outline-none dark:text-white" 
                      placeholder="Earning description"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="number" 
                      value={e.amount || ""} 
                      placeholder="0"
                      onChange={(val) => updateLine(earnings, setEarnings, e.id, "amount", parseFloat(val.target.value) || 0)} 
                      className="w-full bg-transparent text-sm font-black text-right focus:outline-none text-emerald-600 dark:text-emerald-400" 
                    />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button 
                      type="button"
                      onClick={() => removeEarning(e.id)} 
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                <td colSpan={2} className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Earnings:</td>
                <td className="px-6 py-4 text-right text-base text-emerald-600 dark:text-emerald-400 font-black">PKR {totalEarnings.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Deductions Table */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">2. Deductions (Loans &amp; Advances)</h3>
              <p className="text-[10px] text-slate-400">Automatically populated from staff remaining opening loan, active loans, and advances</p>
            </div>
            <button 
              type="button"
              onClick={addDeduction} 
              className="p-2 text-white bg-maroon-800 rounded-lg hover:bg-maroon-900 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Plus size={16} /> Add Deduction
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-12 text-center">#</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Deduction Description</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-48 text-right">Amount (PKR)</th>
                <th className="px-6 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {deductions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-xs text-slate-400 italic text-center">No outstanding loans or deductions for this staff member.</td>
                </tr>
              ) : (
                deductions.map((d, i) => (
                  <tr key={d.id}>
                    <td className="px-6 py-3 text-sm font-bold text-slate-400 dark:text-slate-500 text-center w-12">{i + 1}</td>
                    <td className="px-6 py-3">
                      <input 
                        value={d.description} 
                        onChange={(val) => updateLine(deductions, setDeductions, d.id, "description", val.target.value)} 
                        className="w-full bg-transparent text-sm font-semibold focus:outline-none dark:text-white" 
                        placeholder="Deduction description"
                      />
                    </td>
                    <td className="px-6 py-3 w-48">
                      <input 
                        type="number" 
                        value={d.amount || ""} 
                        placeholder="0"
                        onChange={(val) => updateLine(deductions, setDeductions, d.id, "amount", parseFloat(val.target.value) || 0)} 
                        className="w-full bg-transparent text-sm font-black text-right focus:outline-none text-rose-600 dark:text-rose-400" 
                      />
                    </td>
                    <td className="px-6 py-3 text-center w-12">
                      <button 
                        type="button"
                        onClick={() => removeDeduction(d.id)} 
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-slate-50 dark:bg-slate-800/50 font-black">
                <td colSpan={2} className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Deductions:</td>
                <td className="px-6 py-4 text-right text-base text-rose-600 dark:text-rose-400 font-black">PKR {totalDeductions.toLocaleString()}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Net Total Summary Card */}
        <section className={`rounded-2xl border p-6 text-white shadow-lg transition-colors ${
          netPayable >= 0 ? "bg-slate-900 border-slate-800" : "bg-rose-950 border-rose-900"
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Settlement Formula: Total Earnings (PKR {totalEarnings.toLocaleString()}) - Total Deductions (PKR {totalDeductions.toLocaleString()})
              </span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white mt-1">
                {netPayable >= 0 ? "Net Payable to Employee (واجب الادا رقم)" : "Net Receivable from Employee (واپس لینی ہے)"}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {netPayable >= 0 
                  ? "Final amount to pay to employee upon departure." 
                  : "Employee owes remaining loan/advance balance exceeding their salary."}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className={`text-3xl md:text-4xl font-black ${netPayable >= 0 ? "text-emerald-400" : "text-rose-300"}`}>
                PKR {Math.abs(netPayable).toLocaleString()}
              </div>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                {netPayable >= 0 ? "Payable" : "Receivable Balance Due"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
