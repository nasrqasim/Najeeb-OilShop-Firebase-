"use client";

import { useState, useEffect, useMemo } from "react";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import StaffModal from "@/components/erp/maintain/StaffModal";
import { Plus, Search, Edit2, Trash2, UserPlus, Printer, FileSpreadsheet, Phone, CreditCard } from "lucide-react";
import { exportToExcel, printPage } from "@/lib/excel";

export default function StaffSalaryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees?t=" + Date.now(), { cache: "no-store" });
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setStaffList(json.data);
      }
    } catch (e) {
      console.error("Error fetching staff list:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const deleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff record?")) return;
    setStaffList(prev => prev.filter(s => (s._id || s.id) !== id));
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      fetchStaff();
    } catch (e) { 
      console.error("Error deleting staff:", e); 
    }
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = (
        (s.name || "").toLowerCase().includes(q) ||
        (s.code || "").toLowerCase().includes(q) ||
        (s.cnic || "").toLowerCase().includes(q) ||
        (s.phone || s.contact || "").toLowerCase().includes(q) ||
        (s.designation || "").toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q)
      );

      const matchesDept = selectedDepartment === "All" || s.department === selectedDepartment;
      const matchesStatus = selectedStatus === "All" || (selectedStatus === "Active" ? (s.status === "Active" || !s.status) : s.status === "Inactive");

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staffList, searchTerm, selectedDepartment, selectedStatus]);

  return (
    <div className="space-y-6">
      <ERPPageHeader
        title="Salary Staff"
        description="Manage employee salary structures, personnel information, and loan balances."
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export Excel", onClick: () => exportToExcel(staffList, "StaffSalary.xlsx"), icon: FileSpreadsheet },
        ]}
      />
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setSelectedStaff(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-maroon-900 transition-all shadow-lg shadow-maroon-800/20"
        >
          <Plus size={18} />
          Add Salary Staff
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by code, name, CNIC, contact, or designation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-maroon-800/10 font-medium transition-all dark:text-white" 
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/10 transition-all dark:text-white"
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-maroon-800/10 transition-all dark:text-white"
          >
            <option value="All">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-bold">Loading salary staff...</div>
        ) : filteredStaff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Staff Code</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Name &amp; CNIC</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Designation / Dept</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Fixed Monthly Salary</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Opening Loan</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredStaff.map((staff) => {
                  const salary = Number(staff.fixedMonthlySalary || staff.basicSalary || 0);
                  const loan = Number(staff.openingLoanBalance || 0);
                  const installment = Number(staff.monthlyInstallment || 0);
                  const phone = staff.phone || staff.contact || "";

                  return (
                    <tr key={staff._id || staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-maroon-800 transition-colors">{staff.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{staff.name}</div>
                        {staff.cnic && (
                          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                            <CreditCard size={11} />
                            {staff.cnic}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {phone ? (
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {phone}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{staff.designation || "-"}</div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{staff.department || "General"}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-maroon-800 dark:text-rose-400">
                          PKR {salary.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {loan > 0 ? (
                          <div>
                            <span className="text-sm font-black text-amber-600">PKR {loan.toLocaleString()}</span>
                            {installment > 0 && (
                              <span className="block text-[9px] font-bold text-slate-400">Inst: PKR {installment.toLocaleString()}/mo</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">PKR 0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center ${staff.status === "Active" || !staff.status ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"}`}>
                          {staff.status || "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={printPage}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" 
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>
                          <button 
                            onClick={() => { setSelectedStaff(staff); setIsModalOpen(true); }} 
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => deleteStaff(staff._id || staff.id)} 
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
              <UserPlus size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium mb-1">No salary staff found</p>
            <p className="text-xs text-slate-400">Click &quot;Add Salary Staff&quot; to configure employee salaries</p>
          </div>
        )}
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => { 
          setIsModalOpen(false); 
          setSelectedStaff(null);
          fetchStaff(); 
        }}
        staff={selectedStaff}
      />
    </div>
  );
}
