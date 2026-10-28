"use client";

import { useState, useEffect } from "react";
import ERPModal from "../ui/ERPModal";
import { Save, User, Briefcase, Banknote, Plus, Trash2, Link2 } from "lucide-react";

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: any;
}

export default function StaffModal({ isOpen, onClose, staff }: StaffModalProps) {
  const [operationalEmployees, setOperationalEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    cnic: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    designation: "",
    department: "",
    grade: "",
    joiningDate: new Date().toISOString().split("T")[0],
    employmentStatus: "Permanent",
    linkedEmployee: "",
    linkedEmployeeName: "",
    isActive: true,
    basicSalary: 0,
    fixedMonthlySalary: 0,
    openingLoanBalance: 0,
    monthlyInstallment: 0,
  });

  const [allowances, setAllowances] = useState<Array<{ id: string; name: string; amount: number }>>([]);
  const [deductions, setDeductions] = useState<Array<{ id: string; name: string; amount: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Maintain > Employees list for "Linked Operational Employee"
  useEffect(() => {
    async function fetchOperationalEmployees() {
      try {
        const res = await fetch("/api/employees?cache=" + Date.now(), { cache: "no-store" });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setOperationalEmployees(json.data);
        }
      } catch (err) {
        console.error("Error fetching operational employees:", err);
      }
    }
    if (isOpen) {
      fetchOperationalEmployees();
    }
  }, [isOpen]);

  // Re-initialize or reset form state whenever staff or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (staff) {
        setFormData({
          code: staff.code || `STF-${Math.floor(Date.now() / 1000)}`,
          name: staff.name || "",
          cnic: staff.cnic || "",
          phone: staff.phone || staff.contact || "",
          email: staff.email || "",
          city: staff.city || "",
          address: staff.address || "",
          designation: staff.designation || "",
          department: staff.department || "",
          grade: staff.grade || "",
          joiningDate: staff.joiningDate || new Date().toISOString().split("T")[0],
          employmentStatus: staff.employmentStatus || "Permanent",
          linkedEmployee: staff.linkedEmployee || "",
          linkedEmployeeName: staff.linkedEmployeeName || "",
          isActive: staff.status === "Active" || staff.isActive !== false,
          basicSalary: Number(staff.fixedMonthlySalary || staff.basicSalary || 0),
          fixedMonthlySalary: Number(staff.fixedMonthlySalary || staff.basicSalary || 0),
          openingLoanBalance: Number(staff.openingLoanBalance || 0),
          monthlyInstallment: Number(staff.monthlyInstallment || 0),
        });
        setAllowances(Array.isArray(staff.allowances) && staff.allowances.length > 0 ? staff.allowances : []);
        setDeductions(Array.isArray(staff.deductions) && staff.deductions.length > 0 ? staff.deductions : []);
      } else {
        setFormData({
          code: `STF-${Math.floor(Date.now() / 1000)}`,
          name: "",
          cnic: "",
          phone: "",
          email: "",
          city: "",
          address: "",
          designation: "",
          department: "",
          grade: "",
          joiningDate: new Date().toISOString().split("T")[0],
          employmentStatus: "Permanent",
          linkedEmployee: "",
          linkedEmployeeName: "",
          isActive: true,
          basicSalary: 0,
          fixedMonthlySalary: 0,
          openingLoanBalance: 0,
          monthlyInstallment: 0,
        });
        setAllowances([]);
        setDeductions([]);
      }
    }
  }, [isOpen, staff]);

  // Handle Linked Operational Employee selection to auto-fill details
  const handleLinkedEmployeeChange = (employeeId: string) => {
    if (!employeeId) {
      setFormData(prev => ({ ...prev, linkedEmployee: "", linkedEmployeeName: "" }));
      return;
    }
    const matched = operationalEmployees.find(e => String(e._id || e.id) === String(employeeId));
    if (matched) {
      setFormData(prev => ({
        ...prev,
        linkedEmployee: String(matched._id || matched.id),
        linkedEmployeeName: matched.name || "",
        name: prev.name || matched.name || "",
        cnic: prev.cnic || matched.cnic || "",
        phone: prev.phone || matched.phone || matched.contact || "",
        designation: prev.designation || matched.designation || "",
        department: prev.department || matched.department || "",
        address: prev.address || matched.address || "",
        city: prev.city || matched.city || "",
        email: prev.email || matched.email || "",
      }));
    } else {
      setFormData(prev => ({ ...prev, linkedEmployee: employeeId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter staff full name");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = staff ? `/api/employees/${staff._id || staff.id}` : "/api/employees";
      const method = staff ? "PUT" : "POST";
      
      const salaryVal = Number(formData.fixedMonthlySalary || formData.basicSalary || 0);

      const payload = {
        ...formData,
        contact: formData.phone,
        phone: formData.phone,
        fixedMonthlySalary: salaryVal,
        basicSalary: salaryVal,
        openingLoanBalance: Number(formData.openingLoanBalance || 0),
        monthlyInstallment: Number(formData.monthlyInstallment || 0),
        allowances,
        deductions,
        status: formData.isActive ? "Active" : "Inactive"
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && (json.ok || json.data)) {
        onClose();
      } else {
        alert(json.message || json.error || "Failed to save staff");
      }
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("An error occurred while saving staff.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title={staff ? "Edit Salary Staff" : "New Salary Staff"}
      size="xl"
      footer={
        <>
          <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-maroon-800 text-white rounded-lg text-sm font-medium hover:bg-maroon-900 transition-colors shadow-lg shadow-maroon-900/20 disabled:opacity-50"
          >
            <Save size={18} />
            {isSubmitting ? "Saving..." : staff ? "Update Staff" : "Save Staff"}
          </button>
        </>
      }
    >
      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Personal Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Personal Info</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff Code *</label>
              <input 
                type="text" 
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name *</label>
              <input 
                type="text" 
                placeholder="Staff Member Name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CNIC Number</label>
              <input 
                type="text" 
                placeholder="e.g. 52203-1234567-1" 
                value={formData.cnic} 
                onChange={(e) => setFormData({...formData, cnic: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contact / Phone Number</label>
              <input 
                type="tel" 
                placeholder="0300-1234567" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email (Optional)</label>
              <input 
                type="email" 
                placeholder="email@example.com"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">City</label>
              <input 
                type="text" 
                placeholder="e.g. Winder / Karachi"
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Address</label>
              <input 
                type="text" 
                placeholder="Shop address / Residence"
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
          </div>
        </section>

        {/* HR & Operational Link Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Briefcase size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">HR Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3 rounded-xl">
              <label className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Link2 size={14} />
                Linked Operational Employee (From Maintain &gt; Employees)
              </label>
              <select 
                value={formData.linkedEmployee} 
                onChange={(e) => handleLinkedEmployeeChange(e.target.value)} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20 text-slate-800 dark:text-slate-100 mt-1"
              >
                <option value="">-- None / Direct Staff --</option>
                {operationalEmployees.map(emp => (
                  <option key={emp._id || emp.id} value={emp._id || emp.id}>
                    {emp.name} ({emp.code || "EMP"} - {emp.designation || emp.department || "Employee"})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Select an existing worker/employee from Maintain &gt; Employees to link their operational profile with salary management.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Designation</label>
              <input 
                type="text" 
                placeholder="e.g. Salesman, Accountant, Helper"
                value={formData.designation} 
                onChange={(e) => setFormData({...formData, designation: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</label>
              <input 
                type="text" 
                placeholder="e.g. Sales, Accounts, Store" 
                value={formData.department} 
                onChange={(e) => setFormData({...formData, department: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade</label>
              <input 
                type="text" 
                placeholder="e.g. Grade 1"
                value={formData.grade} 
                onChange={(e) => setFormData({...formData, grade: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Joining Date</label>
              <input 
                type="date" 
                value={formData.joiningDate} 
                onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employment Status</label>
              <select 
                value={formData.employmentStatus} 
                onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})} 
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20"
              >
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Probation">Probation</option>
                <option value="Daily Wages">Daily Wages</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input 
                type="checkbox" 
                id="staffActiveCheck"
                checked={formData.isActive} 
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})} 
                className="w-4 h-4 text-maroon-800 border-slate-300 rounded focus:ring-maroon-800" 
              />
              <label htmlFor="staffActiveCheck" className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Active Staff Member</label>
            </div>
          </div>
        </section>

        {/* Salary Structure (Retained & Preserved) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Banknote size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Salary Structure</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fixed Monthly Salary (Rs.) *</label>
                <input 
                  type="number" 
                  value={formData.fixedMonthlySalary || ""} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({...formData, fixedMonthlySalary: val, basicSalary: val});
                  }} 
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20 text-maroon-800" 
                  placeholder="0"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Opening Loan Balance (Rs.)</label>
                <input 
                  type="number" 
                  value={formData.openingLoanBalance || ""} 
                  onChange={(e) => setFormData({...formData, openingLoanBalance: parseFloat(e.target.value) || 0})} 
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20 text-amber-700" 
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Loan Installment (Rs.)</label>
                <input 
                  type="number" 
                  value={formData.monthlyInstallment || ""} 
                  onChange={(e) => setFormData({...formData, monthlyInstallment: parseFloat(e.target.value) || 0})} 
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20 text-rose-700" 
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Allowances */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Allowances (Earnings)</label>
                <button type="button" onClick={() => setAllowances([...allowances, { id: Date.now().toString(), name: "", amount: 0 }])} className="px-2.5 py-1 bg-maroon-800 text-white rounded text-[10px] font-bold flex items-center gap-1 hover:bg-maroon-900 transition-colors">
                  <Plus size={12} /> Add Allowance
                </button>
              </div>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                {allowances.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Allowance Name (e.g. Food, Travel, Medical)" 
                      value={item.name} 
                      onChange={(e) => setAllowances(allowances.map(a => a.id === item.id ? {...a, name: e.target.value} : a))} 
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" 
                    />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={item.amount || ""} 
                      onChange={(e) => setAllowances(allowances.map(a => a.id === item.id ? {...a, amount: parseFloat(e.target.value) || 0} : a))} 
                      className="w-32 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" 
                    />
                    <button type="button" onClick={() => setAllowances(allowances.filter(a => a.id !== item.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {allowances.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-2">No allowances added. Click Add to include Travel, Food, Medical, etc.</p>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Deductions</label>
                <button type="button" onClick={() => setDeductions([...deductions, { id: Date.now().toString(), name: "", amount: 0 }])} className="px-2.5 py-1 bg-maroon-800 text-white rounded text-[10px] font-bold flex items-center gap-1 hover:bg-maroon-900 transition-colors">
                  <Plus size={12} /> Add Deduction
                </button>
              </div>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                {deductions.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Deduction Name (e.g. Late Deduction, Fine)" 
                      value={item.name} 
                      onChange={(e) => setDeductions(deductions.map(a => a.id === item.id ? {...a, name: e.target.value} : a))} 
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" 
                    />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      value={item.amount || ""} 
                      onChange={(e) => setDeductions(deductions.map(a => a.id === item.id ? {...a, amount: parseFloat(e.target.value) || 0} : a))} 
                      className="w-32 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" 
                    />
                    <button type="button" onClick={() => setDeductions(deductions.filter(a => a.id !== item.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {deductions.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-2">No fixed deductions. Click Add for any recurring deductions.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ERPModal>
  );
}
