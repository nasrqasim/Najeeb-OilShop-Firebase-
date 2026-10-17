"use client";

import { useState } from "react";
import ERPModal from "../ui/ERPModal";
import { Save, User, Briefcase, Building, FileText, Banknote, Plus, Trash2 } from "lucide-react";

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: any;
}

export default function StaffModal({ isOpen, onClose, staff }: StaffModalProps) {
  const [formData, setFormData] = useState({
    code: staff?.code || `STF-${Math.floor(Date.now() / 1000)}`,
    name: staff?.name || "",
    cnic: staff?.cnic || "",
    phone: staff?.phone || "",
    email: staff?.email || "",
    city: staff?.city || "",
    address: staff?.address || "",
    designation: staff?.designation || "",
    department: staff?.department || "",
    grade: staff?.grade || "",
    joiningDate: staff?.joiningDate || new Date().toISOString().split("T")[0],
    employmentStatus: staff?.employmentStatus || "Permanent",
    linkedEmployee: staff?.linkedEmployee || "",
    isActive: staff ? staff.status === "Active" : true,
    bankName: staff?.bankName || "",
    accountNo: staff?.accountNo || "",
    iban: staff?.iban || "",
    ntn: staff?.ntn || "",
    eobi: staff?.eobi || "",
    sessi: staff?.sessi || "",
    providentFund: staff?.providentFund || "",
    basicSalary: staff?.fixedMonthlySalary || staff?.basicSalary || 0,
    fixedMonthlySalary: staff?.fixedMonthlySalary || staff?.basicSalary || 0,
    openingLoanBalance: staff?.openingLoanBalance || 0,
    monthlyInstallment: staff?.monthlyInstallment || 0,
  });

  const [allowances, setAllowances] = useState([{ id: "1", name: "", amount: 0 }]);
  const [deductions, setDeductions] = useState([{ id: "1", name: "", amount: 0 }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = staff ? `/api/employees/${staff._id}` : "/api/employees";
      const method = staff ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        status: formData.isActive ? "Active" : "Inactive"
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.ok) {
        onClose();
      } else {
        alert(json.message || "Failed to save staff");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while saving staff.");
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
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-maroon-800 text-white rounded-lg text-sm font-medium hover:bg-maroon-900 transition-colors shadow-lg shadow-maroon-900/20"
          >
            <Save size={18} />
            {staff ? "Update Staff" : "Save Staff"}
          </button>
        </>
      }
    >
      <div className="space-y-8 h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Personal Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Personal Info</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff Code</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">CNIC</label>
              <input type="text" placeholder="12345-1234567-1" value={formData.cnic} onChange={(e) => setFormData({...formData, cnic: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">City</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
          </div>
        </section>

        {/* HR Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Briefcase size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">HR Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Designation</label>
              <input type="text" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Department</label>
              <input type="text" placeholder="e.g. Sales, Accounts" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade</label>
              <input type="text" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Joining Date</label>
              <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({...formData, joiningDate: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Employment Status</label>
              <select value={formData.employmentStatus} onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20">
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Probation">Probation</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Linked Operational Employee (optional)</label>
              <select value={formData.linkedEmployee} onChange={(e) => setFormData({...formData, linkedEmployee: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20">
                <option value="">-- None --</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-maroon-800 border-slate-300 rounded focus:ring-maroon-800" />
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Active</label>
            </div>
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Bank for Salary Deposit</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bank Name</label>
              <input type="text" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account No</label>
              <input type="text" value={formData.accountNo} onChange={(e) => setFormData({...formData, accountNo: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">IBAN</label>
              <input type="text" placeholder="PK00ABCD0123456789012345" value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
          </div>
        </section>

        {/* Statutory IDs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Statutory IDs (for reporting)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">NTN (Income Tax)</label>
              <input type="text" value={formData.ntn} onChange={(e) => setFormData({...formData, ntn: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">EOBI #</label>
              <input type="text" value={formData.eobi} onChange={(e) => setFormData({...formData, eobi: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">SESSI #</label>
              <input type="text" value={formData.sessi} onChange={(e) => setFormData({...formData, sessi: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Provident Fund #</label>
              <input type="text" value={formData.providentFund} onChange={(e) => setFormData({...formData, providentFund: e.target.value})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-maroon-800/20" />
            </div>
          </div>
        </section>

        {/* Salary Structure */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Banknote size={18} className="text-maroon-800" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Salary Structure</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fixed Monthly Salary (Rs.) *</label>
                <input type="number" value={formData.fixedMonthlySalary} onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData({...formData, fixedMonthlySalary: val, basicSalary: val});
                }} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Opening Loan Balance (Rs.)</label>
                <input type="number" value={formData.openingLoanBalance} onChange={(e) => setFormData({...formData, openingLoanBalance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Loan Installment (Rs.)</label>
                <input type="number" value={formData.monthlyInstallment} onChange={(e) => setFormData({...formData, monthlyInstallment: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-black focus:ring-2 focus:ring-maroon-800/20" />
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Allowances (Earnings)</label>
                <button type="button" onClick={() => setAllowances([...allowances, { id: Date.now().toString(), name: "", amount: 0 }])} className="px-2 py-1 bg-maroon-800 text-white rounded text-[10px] font-bold flex items-center gap-1 hover:bg-maroon-900">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                {allowances.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <input type="text" placeholder="Allowance Name (e.g. HRA)" value={item.name} onChange={(e) => setAllowances(allowances.map(a => a.id === item.id ? {...a, name: e.target.value} : a))} className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" />
                    <input type="number" placeholder="Amount" value={item.amount} onChange={(e) => setAllowances(allowances.map(a => a.id === item.id ? {...a, amount: parseFloat(e.target.value) || 0} : a))} className="w-32 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" />
                    <button type="button" onClick={() => setAllowances(allowances.filter(a => a.id !== item.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {allowances.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-2">No allowances. Click Add to include HRA, Medical, Conveyance, etc.</p>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Deductions</label>
                <button type="button" onClick={() => setDeductions([...deductions, { id: Date.now().toString(), name: "", amount: 0 }])} className="px-2 py-1 bg-maroon-800 text-white rounded text-[10px] font-bold flex items-center gap-1 hover:bg-maroon-900">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
                {deductions.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <input type="text" placeholder="Deduction Name (e.g. EOBI)" value={item.name} onChange={(e) => setDeductions(deductions.map(a => a.id === item.id ? {...a, name: e.target.value} : a))} className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" />
                    <input type="number" placeholder="Amount" value={item.amount} onChange={(e) => setDeductions(deductions.map(a => a.id === item.id ? {...a, amount: parseFloat(e.target.value) || 0} : a))} className="w-32 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-sm font-medium focus:outline-none focus:border-maroon-800" />
                    <button type="button" onClick={() => setDeductions(deductions.filter(a => a.id !== item.id))} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {deductions.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-2">No deductions. Click Add for EOBI, Income Tax, Provident Fund, etc.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ERPModal>
  );
}
