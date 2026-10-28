"use client";

import { useState, useEffect } from "react";
import ERPModal from "../ui/ERPModal";
import { Save, User, Briefcase, Phone, CreditCard, MapPin, CheckCircle2 } from "lucide-react";

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: any;
  onSave?: (data: any) => void;
}

export default function EmployeeModal({ isOpen, onClose, employee, onSave }: EmployeeModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    cnic: "",
    department: "Sales",
    designation: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    isSalesman: false,
    status: "Active",
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        code: employee.code || "",
        name: employee.name || "",
        cnic: employee.cnic || "",
        department: employee.department || "Sales",
        designation: employee.designation || "",
        contact: employee.contact || employee.phone || "",
        phone: employee.contact || employee.phone || "",
        email: employee.email || "",
        address: employee.address || "",
        isSalesman: employee.isSalesman || false,
        status: employee.status || "Active",
      });
    } else {
      setFormData({
        code: "",
        name: "",
        cnic: "",
        department: "Sales",
        designation: "",
        contact: "",
        phone: "",
        email: "",
        address: "",
        isSalesman: false,
        status: "Active",
      });
    }
  }, [employee, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) onSave({ ...formData, phone: formData.contact });
    onClose();
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? "Edit Employee" : "Add New Employee"}
      size="lg"
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
            {employee ? "Update Employee" : "Save Employee"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Employee Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
              placeholder="e.g. EMP-001"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                placeholder="Full name"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">CNIC Number *</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={formData.cnic}
                onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                placeholder="XXXXX-XXXXXXX-X"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="tel"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                placeholder="03XX-XXXXXXX"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
            >
              <option>Management</option>
              <option>Sales</option>
              <option>Warehouse</option>
              <option>Finance</option>
              <option>Operations</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Designation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                placeholder="e.g. Sales Manager"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Residential Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-4 text-slate-400 dark:text-slate-500" size={16} />
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all min-h-[80px]"
              placeholder="Home address"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <input
            type="checkbox"
            id="is-salesman"
            checked={formData.isSalesman}
            onChange={(e) => setFormData({ ...formData, isSalesman: e.target.checked })}
            className="w-4 h-4 rounded text-maroon-800 focus:ring-maroon-500"
          />
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={formData.isSalesman ? "text-blue-600" : "text-slate-400 dark:text-slate-500"} />
            <label htmlFor="is-salesman" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              This employee is a Salesman / Field Agent
            </label>
          </div>
        </div>
      </form>
    </ERPModal>
  );
}
