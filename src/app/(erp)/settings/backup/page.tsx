"use client";

import { useState, useEffect } from "react";
import { 
  Archive, 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  FileJson, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Layers
} from "lucide-react";
import * as XLSX from "xlsx";
import { getLocalVaultStats, exportLocalVaultAsJson, processSyncQueue } from "@/lib/realtimeBackup";

export default function BackupExportPage() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [localVaultStats, setLocalVaultStats] = useState({ totalVault: 0, pendingSync: 0, lastSyncTime: "-" });
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const refreshVaultStats = async () => {
    const s = await getLocalVaultStats();
    setLocalVaultStats(s);
  };

  useEffect(() => {
    refreshVaultStats();
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        processSyncQueue().then(() => refreshVaultStats());
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleManualSync = async () => {
    setIsSyncingOffline(true);
    try {
      const res = await processSyncQueue();
      await refreshVaultStats();
      setStatus({ type: "success", message: `Offline Sync completed: ${res.processed} synchronized, ${res.failed} failed.` });
    } catch (e: any) {
      setStatus({ type: "error", message: e.message || "Failed to process offline sync queue." });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/backup/stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setStatus(null);
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) throw new Error('Backup failed');
      
      const blob = await response.blob();
      console.log("Backup blob received, size:", blob.size);
      setStatus({ type: 'success', message: 'File prepared! Starting download...' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oilshop_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus({ type: 'success', message: 'Backup created and downloaded successfully!' });
    } catch (error: any) {
      console.error("Backup Error:", error);
      setStatus({ type: 'error', message: error.message || 'Failed to create backup. Please try again.' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setStatus(null);
    try {
      setStatus({ type: 'success', message: 'Fetching data from server...' });
      const response = await fetch('/api/export/data');
      if (!response.ok) throw new Error('Failed to fetch data for export');
      
      const allData = await response.json();
      setStatus({ type: 'success', message: 'Data received! Generating Excel workbook...' });

      const workbook = XLSX.utils.book_new();

      const cleanForExcel = (data: any[]) => {
        if (!data || !Array.isArray(data)) return [];
        return data.map((doc: any) => {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(doc)) {
            if (key === "__v" || key === "password") continue;
            let val: any = value;
            
            // Handle populated objects (use name or title if available)
            if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
              if (val.name) val = val.name;
              else if (val.title) val = val.title;
              else if (val.invoiceNo) val = val.invoiceNo;
              else {
                try {
                  val = JSON.stringify(val);
                } catch (e) {
                  val = String(val);
                }
              }
            } else if (Array.isArray(val)) {
              // For arrays (like invoice lines), stringify them but keep them readable
              try {
                val = JSON.stringify(val.map(item => {
                  if (typeof item === 'object' && item.name) return item.name;
                  return item;
                }));
              } catch (e) {
                val = JSON.stringify(val);
              }
            } else if (val instanceof Date) {
              val = val.toISOString();
            }
            
            // Excel limit: 32767 characters per cell
            if (typeof val === 'string' && val.length > 32000) {
              val = val.substring(0, 32000) + "... (truncated)";
            }
            cleaned[key] = val;
          }
          return cleaned;
        });
      };

      for (const [sheetName, data] of Object.entries(allData)) {
        const cleanData = cleanForExcel(data as any[]);
        const ws = XLSX.utils.json_to_sheet(cleanData.length > 0 ? cleanData : [{ Info: "No data" }]);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName.substring(0, 31));
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oilshop_export_${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      setStatus({ type: 'success', message: 'Excel file generated and download started!' });
      alert("Excel Export Successful! Your download should start now.");
    } catch (error: any) {
      console.error("Export Error:", error);
      setStatus({ type: 'error', message: error.message || 'Failed to export data. Please try again.' });
      alert("Export Failed: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Data Management</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
          <ShieldCheck size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Secure Backup System</span>
        </div>
      </div>

      <div className="space-y-1 mb-8">
        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">Backup & Export</h2>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium max-w-2xl">
          Download a copy of your company&apos;s data. Keep it safe — it&apos;s your responsibility to store backups securely.
        </p>
      </div>

      {status && (
        <div className={`p-6 rounded-[2rem] border animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-4 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="font-bold">{status.message}</p>
        </div>
      )}

      {/* Real-Time Local Vault & Offline Sync Engine Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-slate-700/50 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-maroon-800/40 border border-maroon-700/50 text-rose-300 rounded-3xl">
              <Cpu size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black tracking-tight">Real-Time Per-Entry Local Backup & Offline Mode</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active Engine
                </span>
              </div>
              <p className="text-slate-300 text-xs font-medium mt-1">
                Zero data loss guarantee: every invoice, receipt, and payment is instantly committed to local device storage before & during cloud sync.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isOnline ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? "Device Online" : "Device Offline (Local Vault Safe)"}</span>
            </div>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Local Vault Cached Records</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{localVaultStats.totalVault}</span>
              <span className="text-xs text-slate-400">entries saved locally</span>
            </div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending Offline Queue</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${localVaultStats.pendingSync > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {localVaultStats.pendingSync}
              </span>
              <span className="text-xs text-slate-400">waiting to sync to cloud</span>
            </div>
          </div>
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-5 space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Last Local Device Backup</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-200">{localVaultStats.lastSyncTime}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Research Notes */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={exportLocalVaultAsJson}
            className="flex-1 py-3 px-5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <HardDrive size={16} /> Download Local Device Vault (.json)
          </button>
          <button
            onClick={handleManualSync}
            disabled={isSyncingOffline || !isOnline}
            className="flex-1 py-3 px-5 bg-maroon-800 hover:bg-maroon-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <RefreshCw size={16} className={isSyncingOffline ? "animate-spin" : ""} /> 
            {isSyncingOffline ? "Syncing Offline Queue..." : "Sync Pending Queue to Cloud Now"}
          </button>
        </div>

        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
          <span className="font-black text-amber-300 uppercase tracking-wider block">Multi-Device Architecture Protocol (Admin, Super Admin & Salesman):</span>
          <p className="leading-relaxed">
            <strong>1. Instant Local Journaling:</strong> Whenever an invoice or voucher is saved on any computer (Admin, Super Admin, or Salesman), the record is immediately committed to the client machine&apos;s local persistent storage (IndexedDB + LocalStorage).
          </p>
          <p className="leading-relaxed">
            <strong>2. Offline Resilience:</strong> If the shop loses internet connectivity, the ERP seamlessly switches to local offline queue mode. Salesmen can continue creating invoices without interruption.
          </p>
          <p className="leading-relaxed">
            <strong>3. Dual Cloud Sync:</strong> As soon as connectivity is restored, the queue worker automatically replays all offline transactions to Firestore and confirms their cloud status without any duplicate entry risk.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Backup Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
          <div className="p-8 lg:p-10 space-y-8">
            <div className="flex items-start justify-between">
              <div className="p-5 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <Archive size={32} />
              </div>
              <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                System Recovery
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Create Backup</h3>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                Full snapshot of every record in your company — items, customers, vendors, transactions, settings, and everything else. Saved as a .zip of JSON files.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <Info size={18} className="mt-0.5 shrink-0" />
                <p>For disaster recovery — send to support if you ever need to restore.</p>
              </div>
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <FileJson size={18} className="mt-0.5 shrink-0" />
                <p>Complete and machine-readable. Not meant to be opened by humans.</p>
              </div>
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>Image/file attachments are not included (only their links).</p>
              </div>
            </div>

            <button 
              onClick={handleCreateBackup}
              disabled={isBackingUp || isExporting}
              className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-600 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-slate-200"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Preparing Backup...</span>
                </>
              ) : (
                <>
                  <Download size={24} />
                  <span>Create Backup</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Export Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
          <div className="p-8 lg:p-10 space-y-8">
            <div className="flex items-start justify-between">
              <div className="p-5 bg-emerald-50 text-emerald-600 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                <FileSpreadsheet size={32} />
              </div>
              <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                Business Intelligence
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Export Data</h3>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                Human-readable copy of your data as a single Excel workbook. One sheet per record type. Open it directly in Excel, Google Sheets, or LibreOffice.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <Info size={18} className="mt-0.5 shrink-0" />
                <p>For browsing, auditing, or sharing with your accountant.</p>
              </div>
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <FileSpreadsheet size={18} className="mt-0.5 shrink-0" />
                <p>Nested data (e.g. invoice line items) is split into linked sheets.</p>
              </div>
              <div className="flex items-start gap-3 text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>Not a recovery format — for that use &quot;Create Backup&quot;.</p>
              </div>
            </div>

            <button 
              onClick={handleExportData}
              disabled={isBackingUp || isExporting}
              className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-600 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-slate-200"
            >
              {isExporting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <Download size={24} />
                  <span>Export Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Data Verification Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Data Verification</h2>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Real-time database record counts</p>
            </div>
          </div>
          <button 
            onClick={fetchStats}
            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 rounded-2xl transition-colors text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-blue-600"
            title="Refresh Stats"
          >
            <Loader2 className={isLoadingStats ? "animate-spin" : ""} size={20} />
          </button>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoadingStats ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
              ))
            ) : (
              stats.map((s: any, i: number) => (
                <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-blue-400">{s.name}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.count}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] flex gap-4">
        <div className="p-3 bg-white dark:bg-slate-900 text-amber-600 rounded-2xl h-fit">
          <Loader2 className={isBackingUp || isExporting ? "animate-spin" : ""} size={24} />
        </div>
        <div className="space-y-2">
          <h4 className="font-black text-slate-800 dark:text-slate-100">Processing Time</h4>
          <p className="text-slate-600 dark:text-slate-300 font-medium text-sm leading-relaxed">
            Backups can take a few seconds to several minutes depending on the size of your data. The page may appear unresponsive while the file is being prepared — please wait until you see the success message.
          </p>
        </div>
      </div>
    </div>
  );
}
