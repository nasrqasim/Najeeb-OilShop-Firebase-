"use client";

import { useState, useEffect } from "react";
import ERPPageHeader from "@/components/erp/ui/ERPPageHeader";
import { 
  Hash, 
  Settings, 
  FileText, 
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function DocumentSettingsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetch("/api/settings/documents")
      .then(res => res.json())
      .then(res => {
        if (res && res.ok && Array.isArray(res.data)) {
          setDocs(res.data);
        } else {
          setDocs([]);
        }
      })
      .catch((err) => {
        console.error("Error loading document settings:", err);
        setDocs([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (idx: number, field: string, value: any) => {
    const newDocs = [...docs];
    newDocs[idx] = { ...newDocs[idx], [field]: value };
    setDocs(newDocs);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: docs }),
      });
      if (res.ok) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ERPPageHeader 
        title="Document Settings" 
        description="Configure auto-numbering prefixes and naming conventions for documents."
        actions={
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-6 py-2 bg-maroon-800 text-white rounded-xl font-black text-sm shadow-xl shadow-maroon-900/20 hover:bg-maroon-900 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-8 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Important Note</h4>
            <p className="text-xs font-bold text-amber-700/80 leading-relaxed">
              Changing prefixes or next numbers after documents have been generated may cause inconsistencies in your accounting audit trail. Use with caution.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Loading Settings...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Document Type</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prefix</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Next Number</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Padding</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Array.isArray(docs) && docs.map((doc, idx) => {
                  const prefix = String(doc?.prefix || "");
                  const nextNo = Number(doc?.nextNo) || 1;
                  const padding = Number(doc?.padding) || 4;
                  return (
                    <tr key={doc?.type || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
                            <FileText size={16} />
                          </div>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{doc?.type || `Doc #${idx + 1}`}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <input 
                          type="text" 
                          value={prefix} 
                          onChange={(e) => handleChange(idx, "prefix", e.target.value.toUpperCase())}
                          className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black uppercase w-32 focus:bg-white dark:focus:bg-slate-900 focus:border-maroon-800 transition-all outline-none"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <input 
                          type="number" 
                          value={isNaN(nextNo) ? "" : nextNo} 
                          onChange={(e) => handleChange(idx, "nextNo", parseInt(e.target.value) || 0)}
                          className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black w-24 focus:bg-white dark:focus:bg-slate-900 focus:border-maroon-800 transition-all outline-none"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={padding}
                          onChange={(e) => handleChange(idx, "padding", parseInt(e.target.value) || 4)}
                          className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold w-24 outline-none cursor-pointer"
                        >
                          {[3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-maroon-800 bg-maroon-50 px-4 py-2 rounded-lg tracking-widest">
                          {prefix}{nextNo.toString().padStart(padding, '0')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle2 size={20} />
          <span className="font-bold text-sm">Configuration saved successfully!</span>
        </div>
      )}
    </div>
  );
}

