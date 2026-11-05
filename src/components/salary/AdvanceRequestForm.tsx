"use client";

import { useState, useEffect } from "react";
import { Save, User, DollarSign, Calendar } from "lucide-react";

interface AdvanceRequestFormProps {
  onClose: () => void;
}

export default function AdvanceRequestForm({ onClose, initialData }: any) {
  const [formData, setFormData] = useState({
    voucherNo: initialData?.voucherNo || `ADV-${Date.now()}`,
    date: initialData?.date || new Date().toISOString().split("T")[0],
    employee: initialData?.employee || "",
    department: initialData?.department || "",
    amount: initialData?.amount || 0,
    deductionMonth: initialData?.deductionMonth || "",
    status: initialData?.status || "Paid",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/employees").then(r => r.json()).then(data => {
      if (data.ok) setEmployees(data.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = initialData?._id ? `/api/salary-advances/${initialData._id}` : "/api/salary-advances";
      const method = initialData?._id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.ok) {
        onClose();
      } else {
        alert(json.message || "Failed to save");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
            <User size={12} className="mr-1" /> Employee
          </label>
          <select 
            value={formData.employee}
            onChange={(e) => {
              const emp = employees.find(emp => emp.name === e.target.value);
              setFormData({...formData, employee: e.target.value, department: emp ? emp.department : ""})
            }}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" required>
            <option value="">Select Employee</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
            <DollarSign size={12} className="mr-1" /> Advance Amount
          </label>
          <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-maroon-800" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
            <Calendar size={12} className="mr-1" /> Date of Advance
          </label>
          <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Recovery Month</label>
          <input type="month" required value={formData.deductionMonth} onChange={e => setFormData({...formData, deductionMonth: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
             Status
          </label>
          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
        <button type="submit" disabled={isSaving} className="flex items-center px-8 py-2.5 bg-maroon-800 hover:bg-maroon-900 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">
          <Save size={18} className="mr-2" /> {initialData ? "Update" : "Submit"} Advance Request
        </button>
      </div>
    </form>
  );
}
