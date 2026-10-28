"use client";

import { useState, useEffect } from "react";
import ERPModal from "../ui/ERPModal";
import { Save, User, Building, Phone, MapPin, CreditCard, Banknote, ShieldCheck, Mail, Hash, MessageCircle } from "lucide-react";
import WhatsAppShareModal from "../whatsapp/WhatsAppShareModal";

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: any;
  onSave?: (data: any) => void;
}

export default function VendorModal({ isOpen, onClose, vendor, onSave }: VendorModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "Supplier",
    category: "General Supplier",
    contactPerson: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    city: "",
    country: "Pakistan",
    ntn: "",
    gst: "",
    whtApplicable: false,
    bankName: "",
    accountNo: "",
    branch: "",
    paymentTerms: 30,
    openingBalance: 0,
    manualDebit: 0,
    manualCredit: 0,
    status: "Active",
    notes: "",
  });

  const [openingBalanceType, setOpeningBalanceType] = useState<"Credit" | "Debit">("Credit");
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [shopProfile, setShopProfile] = useState<any>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "General Supplier",
    "Oil Companies",
    "Spare Parts / Filters",
    "Local Distributors",
    "Import Suppliers",
    "Cash Vendor",
    "Credit Vendor"
  ]);

  useEffect(() => {
    const fetchShopProfile = async () => {
      try {
        const res = await fetch("/api/shop-profile");
        const json = await res.json();
        if (json.ok) setShopProfile(json.data);
      } catch (e) {
        console.error(e);
      }
    };
    const fetchCats = async () => {
      try {
        const res = await fetch("/api/categories?type=vendor&t=" + Date.now());
        const json = await res.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
          setAvailableCategories(json.data.map((c: any) => c.name));
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) {
      fetchShopProfile();
      fetchCats();
    }
  }, [isOpen]);

  useEffect(() => {
    if (vendor) {
      const op = vendor.openingBalance || 0;
      setOpeningBalanceType(op < 0 ? "Debit" : "Credit");
      setFormData({
        name: vendor.name || "",
        type: vendor.type || "Supplier",
        category: vendor.category || "General Supplier",
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        mobile: vendor.mobile || "",
        address: vendor.address || "",
        city: vendor.city || "",
        country: vendor.country || "Pakistan",
        ntn: vendor.ntn || "",
        gst: vendor.gst || "",
        whtApplicable: vendor.whtApplicable || false,
        bankName: vendor.bankName || "",
        accountNo: vendor.accountNo || "",
        branch: vendor.branch || "",
        paymentTerms: vendor.paymentTerms || 30,
        openingBalance: Math.abs(op),
        manualDebit: vendor.manualDebit || vendor.debit || 0,
        manualCredit: vendor.manualCredit || vendor.credit || 0,
        status: vendor.status || "Active",
        notes: vendor.notes || "",
      });
    } else {
      setOpeningBalanceType("Credit");
      setFormData({
        name: "",
        type: "Supplier",
        category: "General Supplier",
        contactPerson: "",
        email: "",
        phone: "",
        mobile: "",
        address: "",
        city: "",
        country: "Pakistan",
        ntn: "",
        gst: "",
        whtApplicable: false,
        bankName: "",
        accountNo: "",
        branch: "",
        paymentTerms: 30,
        openingBalance: 0,
        manualDebit: 0,
        manualCredit: 0,
        status: "Active",
        notes: "",
      });
    }
  }, [vendor, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      const finalOpeningBalance = openingBalanceType === "Debit" ? -Math.abs(Number(formData.openingBalance)) : Math.abs(Number(formData.openingBalance));
      onSave({
        ...formData,
        openingBalance: finalOpeningBalance
      });
    }
    onClose();
  };

  return (
    <ERPModal
      isOpen={isOpen}
      onClose={onClose}
      title={vendor ? "Edit Vendor" : "Add New Vendor"}
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div>
            {vendor && (formData.phone || formData.mobile) && (formData.phone || formData.mobile).replace(/[^0-9]/g, "").length >= 10 && (
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-sm font-black shadow-lg shadow-[#25D366]/20 transition-all"
              >
                <MessageCircle size={18} className="fill-white/10" />
                WhatsApp Details
              </button>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl transition-all">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-2.5 bg-maroon-800 text-white rounded-xl text-sm font-black hover:bg-maroon-900 transition-all shadow-xl shadow-maroon-900/20"
            >
              <Save size={18} />
              {vendor ? "Update" : "Create"}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-2 space-y-10">
        {/* Basic Information */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:focus:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 dark:text-white outline-none transition-all"
                placeholder="Business/Company name"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 outline-none transition-all dark:text-white"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {formData.category && !availableCategories.includes(formData.category) && (
                  <option value={formData.category}>{formData.category}</option>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Type</label>
              <input
                list="vendor-types"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:focus:bg-slate-900 outline-none transition-all dark:text-white"
                placeholder="Select or enter new type"
              />
              <datalist id="vendor-types">
                <option value="Supplier" />
                <option value="Manufacturer" />
                <option value="Wholesaler" />
                <option value="Importer" />
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="Primary contact name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="vendor@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mobile</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="Mobile number"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Address</h3>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="Pakistan"
              />
            </div>
          </div>
        </section>

        {/* Tax Information */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Tax Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">NTN (National Tax Number)</label>
              <input
                type="text"
                value={formData.ntn}
                onChange={(e) => setFormData({ ...formData, ntn: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="e.g., 1234567-8"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">GST Number</label>
              <input
                type="text"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="GST registration number"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 dark:border-slate-700">
            <input
              type="checkbox"
              id="wht-vendor"
              checked={formData.whtApplicable}
              onChange={(e) => setFormData({ ...formData, whtApplicable: e.target.checked })}
              className="w-4 h-4 rounded text-maroon-800 focus:ring-maroon-500"
            />
            <label htmlFor="wht-vendor" className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-300">
              Deduct Withholding Tax on payments
            </label>
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="e.g., HBL, MCB, UBL"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Number</label>
              <input
                type="text"
                value={formData.accountNo}
                onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="Bank account number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
              placeholder="Branch name"
            />
          </div>
        </section>

        {/* Purchased Money (Opening Balance) */}
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Financial Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Opening Balance</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                  className="flex-1 min-w-0 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all dark:text-white"
                  placeholder="0"
                />
                 <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl shrink-0 w-36">
                  <button
                    type="button"
                    onClick={() => setOpeningBalanceType("Credit")}
                    className={`flex-1 py-1 text-[11px] font-black rounded-lg transition-all ${
                      openingBalanceType === "Credit"
                        ? "bg-white dark:bg-slate-900 text-maroon-850 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpeningBalanceType("Debit")}
                    className={`flex-1 py-1 text-[11px] font-black rounded-lg transition-all ${
                      openingBalanceType === "Debit"
                        ? "bg-white dark:bg-slate-900 text-maroon-855 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    Debit
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Terms (Days)</label>
              <input
                type="number"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 outline-none transition-all"
                placeholder="30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 outline-none transition-all"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Debit & Credit */}
          <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Debit (Payments Made)</label>
              <input
                type="number"
                value={formData.manualDebit}
                onChange={(e) => setFormData({ ...formData, manualDebit: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                placeholder="0"
              />
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">Payments made to this vendor</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Credit (Purchased)</label>
              <input
                type="number"
                value={formData.manualCredit}
                onChange={(e) => setFormData({ ...formData, manualCredit: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                placeholder="0"
              />
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">Goods purchased from this vendor</p>
            </div>
          </div>
        </section>

        {/* Purchased Items / Notes */}
        <section className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">What things I purchased / Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 dark:border-slate-700 rounded-xl text-sm font-bold focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:focus:bg-slate-900 focus:ring-4 focus:ring-maroon-800/5 dark:text-white outline-none transition-all min-h-[100px] resize-none"
            placeholder="Items purchased or internal notes about this vendor..."
          />
        </section>
      </form>

      <WhatsAppShareModal 
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        party={{
          ...vendor,
          phone: formData.phone || formData.mobile,
          name: formData.name,
          status: formData.status,
          balance: vendor?.balance !== undefined ? vendor.balance : formData.openingBalance,
          type: "Vendor"
        }}
        type="Reminder"
        shopProfile={shopProfile}
      />
    </ERPModal>
  );
}
