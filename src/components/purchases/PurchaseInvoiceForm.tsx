"use client";

import { useState, useEffect, useCallback } from "react";
import ItemSearchInput from "@/components/erp/ui/ItemSearchInput";
import {
  applyPurchaseUnitFieldUpdate,
  defaultPurchaseUnitsForItem,
  resolveCatalogItem,
} from "@/lib/itemUnits";
import {
  Plus, Trash2, Save, ArrowLeft, X, CheckCircle2, Wallet
} from "lucide-react";

interface PIItem {
  id: string;
  itemId: string;
  itemCode: string;
  description: string;
  cartons: number | string;
  gallons: number | string;
  liters: number | string;
  unitPrice: number | string;
  discPercent: number | string;
  isTaxable?: boolean;
  taxPercent: number | string;
  taxAmount?: number;
  grossAmount: number;
  discountAmount: number;
  total: number;
}

function calcItem(item: PIItem): PIItem {
  const ctns = Number(item.cartons) || 0;
  const price = Number(item.unitPrice) || 0;
  const disc = Number(item.discPercent) || 0;
  const tax = Number(item.taxPercent) || 0;
  const gross = ctns * price;
  const discAmt = gross * disc / 100;
  const afterDisc = gross - discAmt;
  const taxAmt = afterDisc * tax / 100;
  return { 
    ...item, 
    grossAmount: gross, 
    discountAmount: discAmt, 
    taxAmount: taxAmt, 
    total: afterDisc + taxAmt 
  };
}

interface PurchaseInvoiceFormProps {
  onClose: () => void;
  onSave?: (data: any) => void;
  initialData?: any;
}

export default function PurchaseInvoiceForm({ onClose, onSave, initialData }: PurchaseInvoiceFormProps) {
  const isEdit = !!(initialData && initialData._id);

  const buildItems = (lines: any[]): PIItem[] =>
    lines.map((l: any, i: number) => {
      const base: PIItem = {
        id: i.toString(),
        itemId: l.itemId?._id || l.itemId || "",
        itemCode: l.itemId?.code || l.itemCode || "",
        description: l.description || l.itemId?.name || "",
        cartons: l.cartons ?? l.qty ?? 0,
        gallons: l.gallons ?? 0,
        liters: l.liters ?? 0,
        unitPrice: l.rate ?? l.unitPrice ?? 0,
        discPercent: l.discountPercent ?? l.discPercent ?? 0,
        isTaxable: (l.taxPercent ?? 0) > 0,
        taxPercent: l.taxPercent ?? 0,
        grossAmount: 0,
        discountAmount: 0,
        total: l.netAmount ?? 0,
      };
      return calcItem(base);
    });

  const defaultItem = (): PIItem => calcItem({
    id: Date.now().toString(),
    itemId: "", itemCode: "", description: "",
    cartons: 0, gallons: 0, liters: 0,
    unitPrice: 0, discPercent: 0,
    isTaxable: false, taxPercent: 0,
    grossAmount: 0, discountAmount: 0, total: 0,
  });

  const [items, setItems] = useState<PIItem[]>(
    initialData?.lines?.length ? buildItems(initialData.lines) : [defaultItem()]
  );

  const [formData, setFormData] = useState({
    invoiceNumber: initialData?.invoiceNo || "Auto-generated",
    invoiceDate: initialData?.date ? new Date(initialData.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    status: initialData?.status || "Draft",
    vendorId: initialData?.partyId?._id || initialData?.partyId || "",
    vendorInvoiceNo: initialData?.reference || initialData?.vendorInvNo || "",
    vendorInvoiceDate: initialData?.vendorInvoiceDate ? new Date(initialData.vendorInvoiceDate).toISOString().split("T")[0] : "",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
    paymentTerms: initialData?.paymentTerms || "",
    paymentMethod: initialData?.paymentMethod || "Cash",
    currency: initialData?.currency || "PKR",
    employeeId: initialData?.employeeId?._id || initialData?.employeeId || "",
    jobId: initialData?.jobId?._id || initialData?.jobId || "",
    locationId: initialData?.locationId?._id || initialData?.locationId || "",
    amountPaid: initialData?.amountReceived || 0,
    notes: initialData?.notes || "",
  });

  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ir, pr, er, jr, lr] = await Promise.all([
          fetch("/api/items"), fetch("/api/parties"),
          fetch("/api/employees"), fetch("/api/jobs"), fetch("/api/locations"),
        ]);
        const [ij, pj, ej, jj, lj] = await Promise.all([
          ir.json(), pr.json(), er.json(), jr.json(), lr.json(),
        ]);
        if (ij.ok) setAvailableItems(ij.data);
        if (pj.ok) setVendors(pj.data.filter((p: any) => p.type === "Vendor"));
        if (ej.ok) setEmployees(ej.data);
        if (jj.ok) setJobs(jj.data);
        if (lj.ok) setLocations(lj.data);
      } catch (e) { console.error(e); }
    };
    fetchAll();
  }, []);

  const addItem = () => setItems(prev => [...prev, defaultItem()]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = useCallback((id: string, field: keyof PIItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      let updated = { ...item, [field]: value };

      // Auto-fill name/price when item selected
      if (field === "itemId") {
        const sel = availableItems.find(a => a._id === value);
        if (sel) {
          updated.itemCode = sel.code || "";
          updated.description = sel.name || "";
          updated.unitPrice = sel.purchaseRate || sel.rate || 0;
          updated = defaultPurchaseUnitsForItem(updated, sel);
        }
      }

      if (field === "cartons" || field === "gallons" || field === "liters") {
        const sel = resolveCatalogItem(availableItems, updated);
        updated = applyPurchaseUnitFieldUpdate(updated, field, value, sel);
      }

      return calcItem(updated);
    }));
  }, [availableItems]);

  // Totals
  const subTotal = items.reduce((s, i) => s + i.grossAmount, 0);
  const totalDiscount = items.reduce((s, i) => s + i.discountAmount, 0);
  const totalTax = items.reduce((s, i) => s + (i.taxAmount || 0), 0);
  const totalPKR = subTotal - totalDiscount + totalTax;
  const balance = totalPKR - Number(formData.amountPaid);

  const handleSave = async (status: "Draft" | "Posted") => {
    if (!formData.vendorId) { alert("Please select a vendor."); return; }
    setSaving(true);
    try {
      const invoiceNo = formData.invoiceNumber === "Auto-generated"
        ? `PI-${Date.now().toString().slice(-6)}`
        : formData.invoiceNumber;

      const selectedVendor = vendors.find(v => (v._id || v.id) === formData.vendorId);
      const vendorName = selectedVendor ? (selectedVendor.companyName || selectedVendor.name) : "";

      const payload = {
        invoiceNo,
        type: "purchase",
        date: formData.invoiceDate,
        partyId: formData.vendorId,
        partyName: vendorName,
        vendorName: vendorName,
        reference: formData.vendorInvoiceNo,
        currency: formData.currency,
        dueDate: formData.dueDate || undefined,
        paymentTerms: formData.paymentTerms,
        paymentMethod: formData.paymentMethod,
        employeeId: formData.employeeId || null,
        jobId: formData.jobId || null,
        locationId: formData.locationId || null,
        amountReceived: Number(formData.amountPaid) || 0,
        notes: formData.notes,
        lines: items.filter(i => i.itemId || i.description).map(i => ({
          itemId: i.itemId || null,
          description: i.description,
          cartons: Number(i.cartons) || 0,
          gallons: Number(i.gallons) || 0,
          liters: Number(i.liters) || 0,
          rate: Number(i.unitPrice) || 0,
          grossAmount: i.grossAmount,
          discountPercent: Number(i.discPercent) || 0,
          taxPercent: Number(i.taxPercent) || 0,
          netAmount: i.total,
        })),
        subTotal,
        discountAmount: totalDiscount,
        taxAmount: totalTax,
        totalAmount: totalPKR,
        balance,
        status: balance <= 0 && status === "Posted" ? "paid" : status.toLowerCase(),
      };

      const url = isEdit ? `/api/invoices/${initialData._id}` : "/api/invoices";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(`Purchase Invoice ${isEdit ? "updated" : "saved"} successfully!`);
        if (onSave) onSave(await res.json());
        onClose();
      } else {
        const err = await res.json().catch(() => ({ message: "Unknown error" }));
        alert("Error: " + (err.error || err.message));
      }
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 min-h-screen font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onClose} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-maroon-800 hover:bg-maroon-50 rounded-lg transition-all">
            <ArrowLeft size={16} /> Back to List
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {isEdit ? `Edit: ${initialData.invoiceNo}` : "New Purchase Invoice"}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg flex items-center border border-slate-200 bg-white shadow-sm transition-all">
            <X size={16} className="mr-2" /> Cancel
          </button>
          <button onClick={() => handleSave("Draft")} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-lg flex items-center shadow-lg transition-all disabled:opacity-50">
            <Save size={16} className="mr-2" /> Save Draft
          </button>
          <button onClick={() => handleSave("Posted")} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center shadow-lg transition-all disabled:opacity-50">
            <CheckCircle2 size={16} className="mr-2" /> Save &amp; Post
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 space-y-6 pb-32">
        {/* Invoice Details */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Invoice Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</label>
              <input value={formData.invoiceNumber} disabled className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Date *</label>
              <input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <input value={formData.status} disabled className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-400" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency</label>
              <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none">
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor *</label>
              <select value={formData.vendorId} onChange={e => setFormData({ ...formData, vendorId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none">
                <option value="">-- Select Vendor --</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName || v.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Invoice No.</label>
              <input placeholder="Enter invoice #" value={formData.vendorInvoiceNo} onChange={e => setFormData({ ...formData, vendorInvoiceNo: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Invoice Date</label>
              <input type="date" value={formData.vendorInvoiceDate} onChange={e => setFormData({ ...formData, vendorInvoiceDate: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
              <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Terms</label>
              <input placeholder="e.g. 30 days" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job</label>
              <select value={formData.jobId} onChange={e => setFormData({ ...formData, jobId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none">
                <option value="">-- Select Job --</option>
                {jobs.map(j => <option key={j._id} value={j._id}>{j.title || j.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
              <select value={formData.locationId} onChange={e => setFormData({ ...formData, locationId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-maroon-800 outline-none">
                <option value="">-- Select Location --</option>
                {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">LINE ITEMS</h3>
            <button onClick={addItem} className="px-4 py-2 text-[10px] font-black bg-white text-slate-600 border border-slate-200 rounded-xl uppercase tracking-widest flex items-center hover:bg-slate-50 shadow-sm transition-all">
              <Plus size={14} className="mr-1.5 text-maroon-800" /> Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 1000 }}>
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-10 text-center">#</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-44">Item Code</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[160px]">Description</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Ctns</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Gals</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Ltrs</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Unit Price</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-right">Disc %</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Disc (PKR)</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-right">Tax %</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-right">Tax (PKR)</th>
                  <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-right">Total</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-xs font-bold text-slate-300 text-center">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <ItemSearchInput
                        value={item.itemCode || ""}
                        availableItems={availableItems}
                        onSelect={sel => updateItem(item.id, "itemId", sel._id)}
                        onChange={val => updateItem(item.id, "itemCode", val)}
                        placeholder="Search item..."
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItem(item.id, "description", e.target.value)}
                        className="w-full bg-transparent text-sm font-medium focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1 transition-all"
                      />
                    </td>
                    {/* CTNS - free number */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.cartons}
                        onChange={e => updateItem(item.id, "cartons", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "cartons", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-center focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1"
                      />
                    </td>
                    {/* GALS - free number */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.gallons}
                        onChange={e => updateItem(item.id, "gallons", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "gallons", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-center focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1"
                      />
                    </td>
                    {/* LTRS - free number */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.liters}
                        onChange={e => updateItem(item.id, "liters", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "liters", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-center focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.unitPrice}
                        onChange={e => updateItem(item.id, "unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "unitPrice", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-right focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={item.discPercent}
                        onChange={e => updateItem(item.id, "discPercent", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "discPercent", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-right focus:outline-none border-b border-transparent focus:border-rose-400/30 py-1 text-rose-600"
                      />
                    </td>
                    {/* Disc PKR - read only */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-bold text-rose-500">{fmt(item.discountAmount)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="any"
                        value={item.taxPercent}
                        onChange={e => updateItem(item.id, "taxPercent", e.target.value === "" ? "" : Number(e.target.value))}
                        onBlur={e => updateItem(item.id, "taxPercent", Number(e.target.value) || 0)}
                        className="w-full bg-transparent text-sm font-black text-right focus:outline-none border-b border-transparent focus:border-maroon-800/30 py-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmt(item.taxAmount || 0)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{fmt(item.total)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-8 bg-white flex flex-col items-end">
            <div className="w-full md:w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Subtotal (Gross)</span>
                <span className="font-bold text-slate-900">{fmt(subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Total Discount</span>
                <span className="font-bold text-rose-600">-{fmt(totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Tax</span>
                <span className="font-bold text-slate-900">+{fmt(totalTax)}</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-black text-maroon-800 uppercase tracking-widest">Invoice Total (PKR)</span>
                <span className="text-3xl font-black text-maroon-800 tracking-tighter">{fmt(totalPKR)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30 flex items-center gap-3">
            <Wallet size={20} className="text-emerald-600" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Information</h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black focus:border-emerald-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Credit">Credit (On Account)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</label>
              <input
                type="number"
                min={0}
                step="any"
                value={formData.amountPaid}
                onChange={e => setFormData({ ...formData, amountPaid: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</label>
              <div className={`w-full px-4 py-3 rounded-xl text-sm font-black ${balance > 0 ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}>
                {fmt(balance)}
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes &amp; Remarks</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Internal notes or terms..."
            className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-maroon-800 transition-all resize-none outline-none"
          />
        </section>
      </div>
    </div>
  );
}
