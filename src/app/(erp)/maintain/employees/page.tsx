"use client";

import { useState, useEffect } from "react";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import ERPDataTable from "@/components/erp/ui/ERPDataTable";
import EmployeeModal from "@/components/erp/maintain/EmployeeModal";
import { Plus, Users, UserCheck, UserX, CheckCircle2, FileText, Download, Printer, FileSpreadsheet, Edit2, Trash2 } from "lucide-react";
import ERPStatCard from "@/components/erp/ui/ERPStatCard";
import { exportToExcel, downloadTemplate, printPage, triggerFileInput, importFromExcel } from "@/lib/excel";

export default function EmployeesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/employees");
      const json = await res.json();
      if (json.ok) setEmployees(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleAdd = () => { setSelectedEmployee(null); setIsModalOpen(true); };

  const handleImport = async () => {
    const file = await triggerFileInput();
    if (file) {
      const data = await importFromExcel(file);
      for (const row of data) {
        await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: row["Code"] || row.code || `EMP-${Date.now()}`,
            name: row["Name"] || row.name || "Unknown",
            cnic: row["CNIC"] || row.cnic || "",
            department: row["Department"] || row.department || "",
            designation: row["Designation"] || row.designation || "",
            phone: row["Contact"] || row.contact || "",
            status: row["Status"] || row.status || "Active",
          }),
        });
      }
      fetchEmployees();
    }
  };

  const handleEdit = (employee: any) => { setSelectedEmployee(employee); setIsModalOpen(true); };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.message || "Failed to delete employee");
        }
        fetchEmployees();
      } catch (e) {
        console.error(e);
        alert((e as Error).message);
      }
    }
  };

  const handleSave = async (data: any) => {
    try {
      const url = selectedEmployee?._id ? `/api/employees/${selectedEmployee._id}` : "/api/employees";
      const method = selectedEmployee?._id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedEmployee?._id ? data : { ...data, code: data.code || `EMP-${Date.now()}` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save employee");

      fetchEmployees();
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const q = searchTerm.toLowerCase();
    return (
      (emp.name || "").toLowerCase().includes(q) ||
      (emp.code || "").toLowerCase().includes(q) ||
      (emp.cnic || "").toLowerCase().includes(q) ||
      (emp.department || "").toLowerCase().includes(q) ||
      (emp.designation || "").toLowerCase().includes(q) ||
      (emp.phone || "").toLowerCase().includes(q)
    );
  });

  const columns = [
    { header: "Code", accessor: "code" },
    { header: "Name (CNIC)", accessor: "name", render: (val: string, item: any) => (
      <div>
        <p className="font-bold text-slate-900 dark:text-white">{val}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.cnic}</p>
      </div>
    )},
    { header: "Department", accessor: "department" },
    { header: "Designation", accessor: "designation" },
    { header: "Contact", accessor: "phone", render: (val: string, item: any) => item.phone || item.contact || "-" },
    { header: "Status", accessor: "status", render: (val: string) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
        val === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}>
        {val}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <ERPPageHeader 
        title="Employees" 
        subtitle="Manage staff members, roles and departmental assignments"
        actions={[
          { label: "Print", onClick: printPage, icon: Printer },
          { label: "Export", onClick: () => exportToExcel(employees, "Employees.xlsx"), icon: FileSpreadsheet },
          { label: "Download Template", onClick: () => downloadTemplate(["Code", "Name", "CNIC", "Department", "Designation", "Contact", "Status"], "EmployeesTemplate.xlsx"), icon: Download },
          { label: "Import", onClick: handleImport, icon: FileText },
          { label: "Add Employee", onClick: handleAdd, icon: Plus, variant: "primary" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ERPStatCard label="Total Staff" value={employees.length} icon={Users} variant="blue" />
        <ERPStatCard label="Active" value={employees.filter(e => e.status === "Active").length} icon={UserCheck} variant="maroon" />
        <ERPStatCard label="Inactive" value={employees.filter(e => e.status === "Inactive").length} icon={UserX} variant="slate" />
      </div>

      <ERPDataTable 
        columns={columns} 
        data={filteredEmployees} 
        onSearch={setSearchTerm}
        searchPlaceholder="Search employees by name, CNIC, code, department..."
        actions={[
          { label: "Edit", onClick: handleEdit, icon: Edit2 },
          { label: "Delete", onClick: (row: any) => handleDelete(row._id), icon: Trash2, variant: "danger" },
        ]}
      />

      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        employee={selectedEmployee}
        onSave={handleSave}
      />
    </div>
  );
}
