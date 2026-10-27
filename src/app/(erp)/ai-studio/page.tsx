"use client";
import { getStartOfMonthStr, getCurrentDateStr } from "@/lib/dateUtils";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  FileSearch,
  ShoppingCart,
  Truck,
  FileCheck,
  Receipt,
  FileClock,
  X,
  Sparkles,
  Search,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  AlertCircle,
  Clock,
  ExternalLink,
  Save,
  Split,
  FileSpreadsheet
} from "lucide-react";
import { exportToExcel } from "@/lib/excel";

type View = "dashboard" | "import" | "export";
type Step = 1 | 2 | 3 | 4;

export default function AIStudioPage() {
  const [view, setView] = useState<View>("dashboard");
  const [step, setStep] = useState<Step>(1);
  const [docType, setDocType] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const routeMap: Record<string, string> = {
    pi: "/purchases/purchase-invoice",
    ntpi: "/purchases/non-tax-purchase-invoice",
    grn: "/purchases/goods-receipt",
    si: "/sales/sale-invoice",
    dc: "/sales/delivery-challan",
    so: "/sales/sale-order",
  };

  const docTypes = [
    { id: "pi", label: "Purchase Invoice", desc: "Vendor invoice / bill", icon: FileText },
    { id: "ntpi", label: "Non-Tax Purchase Invoice", desc: "Vendor bill without GST", icon: FileText },
    { id: "grn", label: "Goods Receipt", desc: "Delivery note from vendor", icon: FileCheck },
    { id: "si", label: "Sale Invoice", desc: "Invoice to customer", icon: Receipt },
    { id: "dc", label: "Delivery Challan", desc: "Goods dispatched to customer", icon: Truck },
    { id: "so", label: "Sale Order", desc: "Customer purchase order", icon: ShoppingCart },
  ];

  const processedDocs = [
    { id: "AI-101", name: "INV_SHELL_99.pdf", type: "Purchase Invoice", date: "2026-04-28", status: "Completed", confidence: 98, vendor: "Shell Pakistan" },
    { id: "AI-102", name: "RECEIPT_882.jpg", type: "Expense Receipt", date: "2026-04-27", status: "Review Required", confidence: 64, vendor: "Local Vendor" },
    { id: "AI-103", name: "GRN_MAIN_11.pdf", type: "Goods Receipt", date: "2026-04-27", status: "Completed", confidence: 95, vendor: "PSO" },
  ];

  const handleStartImport = () => {
    setView("import");
    setStep(1);
  };

  const handleStartExport = () => {
    setView("export");
    setStep(1);
  };

  const handleProcess = () => {
    setStep(3);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(4);
    }, 3000);
  };

  const handleSaveToERP = () => {
    if (!docType) return;
    
    // Extracted data that matches the structure expected by the forms
    const extractedData = {
      vendor: "Shell Pakistan Limited",
      vendorInvNo: "SPL-2026-991",
      customer: "Standard Customer", // For sales docs
      date: new Date().toISOString().split('T')[0],
      total: 106500,
      taxId: "1234567-8",
      items: [
        { item: "Engine Oil 5W-30", qty: 20, rate: 4500, amount: 90000 },
        { item: "Oil Filter", qty: 10, rate: 1200, amount: 12000 },
        { item: "Air Filter", qty: 5, rate: 900, amount: 4500 },
      ]
    };

    sessionStorage.setItem("ai_extracted_data", JSON.stringify({ 
      type: docType, 
      data: extractedData,
      timestamp: Date.now() 
    }));
    
    const targetRoute = routeMap[docType];
    if (targetRoute) {
      router.push(targetRoute);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 min-h-screen">
      {/* Dynamic Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-maroon-800 to-maroon-600 text-white rounded-2xl shadow-lg shadow-maroon-800/20">
              <Sparkles size={24} className={isProcessing ? "animate-spin" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Studio</h1>
                <span className="px-2 py-0.5 bg-maroon-50 text-maroon-800 text-[10px] font-black rounded-md uppercase tracking-widest border border-maroon-100">PRO</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Document Intelligence & Automation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setView("dashboard")}
                className={`px-6 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${view === "dashboard" ? "bg-white dark:bg-slate-900 text-maroon-800 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                Dashboard
              </button>
              <button 
                onClick={handleStartImport}
                className={`px-6 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${view === "import" ? "bg-white dark:bg-slate-900 text-maroon-800 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                New Import
              </button>
              <button 
                onClick={handleStartExport}
                className={`px-6 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${view === "export" ? "bg-white dark:bg-slate-900 text-maroon-800 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {view === "dashboard" ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Processed Today", value: "24", icon: FileCheck, color: "bg-emerald-50 text-emerald-600" },
                { label: "Avg. Confidence", value: "94%", icon: Sparkles, color: "bg-maroon-50 text-maroon-800" },
                { label: "Need Review", value: "03", icon: AlertCircle, color: "bg-amber-50 text-amber-600" },
                { label: "Time Saved", value: "12.5h", icon: Clock, color: "bg-blue-50 text-blue-600" },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className={`p-3 rounded-2xl w-fit mb-4 ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Documents Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Processed Documents</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                    <input type="text" placeholder="Search history..." className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-maroon-800/10 transition-all outline-none" />
                  </div>
                  <button 
                    onClick={handleStartExport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs hover:bg-slate-200 transition-all"
                  >
                    <FileSpreadsheet size={16} />
                    BULK EXPORT
                  </button>
                  <button onClick={handleStartImport} className="flex items-center gap-2 px-6 py-2.5 bg-maroon-800 text-white rounded-xl font-black text-xs hover:bg-maroon-900 shadow-lg shadow-maroon-900/20 transition-all">
                    <Upload size={16} />
                    UPLOAD NEW
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50/50">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Document</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor / Entity</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Confidence</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {processedDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 group-hover:bg-maroon-800 group-hover:text-white transition-all">
                              <FileText size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{doc.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{doc.id} • {doc.date}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{doc.type}</span>
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-slate-700 dark:text-slate-200">
                          {doc.vendor}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full max-w-[80px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${doc.confidence > 90 ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{ width: `${doc.confidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{doc.confidence}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${doc.status === "Completed" ? "text-emerald-600" : "text-amber-600"}`}>
                            <div className={`w-2 h-2 rounded-full ${doc.status === "Completed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                            {doc.status}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-maroon-800 hover:bg-maroon-50 rounded-lg transition-all"><Eye size={18} /></button>
                            <button className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Download size={18} /></button>
                            <button className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : view === "import" ? (
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Progress Stepper */}
            <div className="flex items-center justify-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0 max-w-xl mx-auto"></div>
              <div className="flex justify-between w-full max-w-xl relative z-10">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex flex-col items-center space-y-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-4 transition-all ${step === s ? "bg-maroon-800 text-white border-maroon-100 shadow-lg" : step > s ? "bg-emerald-500 text-white border-emerald-100 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800"}`}>
                      {step > s ? <CheckCircle2 size={20} /> : s}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? "text-maroon-800" : "text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>
                      {s === 1 ? "Category" : s === 2 ? "Upload" : s === 3 ? "Process" : "Review"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Selection */}
            {step === 1 && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="text-center">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Document Category</h2>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mt-2">Our AI models are optimized for specific financial document structures.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {docTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button 
                        key={type.id} 
                        onClick={() => { setDocType(type.id); setStep(2); }}
                        className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 hover:border-maroon-300 hover:shadow-2xl hover:shadow-maroon-900/10 transition-all text-left relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-maroon-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-2xl w-fit group-hover:bg-maroon-800 group-hover:text-white transition-all mb-6 relative z-10">
                          <Icon size={32} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-maroon-800 transition-all relative z-10">{type.label}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mt-1 relative z-10">{type.desc}</p>
                        <ChevronRight size={24} className="absolute bottom-8 right-8 text-slate-200 group-hover:text-maroon-800 group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Upload */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-white dark:bg-slate-900 p-16 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center group hover:border-maroon-300 hover:bg-maroon-50/50 transition-all cursor-pointer shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/30 group-hover:to-maroon-50/30 transition-all"></div>
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center group-hover:bg-maroon-100 group-hover:text-maroon-800 transition-all mb-8 relative z-10">
                    <Upload size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight relative z-10">Drop your {docTypes.find(t => t.id === docType)?.label} here</h3>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mt-3 relative z-10">Max file size: 10MB. Supports Multi-page PDFs.</p>
                  <button className="mt-10 px-12 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:scale-105 transition-all active:scale-95 shadow-2xl relative z-10">Browse Computer</button>
                </div>
                <div className="flex items-center justify-between px-8">
                  <button onClick={() => setStep(1)} className="flex items-center text-sm font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-all">
                    <ArrowLeft size={18} className="mr-2" /> Back
                  </button>
                  <button onClick={handleProcess} className="flex items-center px-10 py-4 bg-maroon-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-maroon-900/20 hover:bg-maroon-700 transition-all">
                    Start AI Extraction <ChevronRight size={18} className="ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {step === 3 && (
              <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in slide-in-from-top-8 duration-500 flex flex-col items-center justify-center text-center overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-maroon-800 animate-[loading_2s_ease-in-out_infinite]"></div>
                </div>
                
                <div className="w-32 h-32 bg-maroon-50 text-maroon-800 rounded-full flex items-center justify-center mb-10 relative">
                   <div className="absolute inset-0 border-4 border-maroon-100 border-t-maroon-800 rounded-full animate-spin"></div>
                   <Sparkles size={48} />
                </div>
                
                <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">AI is Reading Your Document</h2>
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mt-6 max-w-lg leading-relaxed text-lg">
                  Applying OCR algorithms, identifying entity headers, and cross-referencing items with your inventory database...
                </p>
                
                <div className="mt-16 grid grid-cols-3 gap-8 w-full max-w-2xl">
                  {[
                    { label: "OCR Layer", status: "Completed" },
                    { label: "Entity Match", status: "Processing..." },
                    { label: "Line Items", status: "Queued" },
                  ].map((task, i) => (
                    <div key={i} className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">{task.label}</p>
                      <p className={`text-xs font-black ${task.status === "Completed" ? "text-emerald-500" : "text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>{task.status}</p>
                    </div>
                  ))}
                </div>

                <style jsx>{`
                  @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
              </div>
            )}

            {/* Step 4: Review Screen (SPLIT VIEW) */}
            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setStep(2)} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-maroon-800 transition-all">
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Review Extraction</h2>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Document: <span className="text-slate-800 dark:text-slate-100 font-bold">INV_SHELL_99.pdf</span> • Confidence: <span className="text-emerald-600 font-bold">98%</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Discard</button>
                    <button 
                      onClick={handleSaveToERP}
                      className="px-10 py-3 bg-maroon-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-maroon-900/20 hover:bg-maroon-900 transition-all flex items-center gap-2"
                    >
                      <Save size={18} />
                      SAVE TO ERP
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 min-h-[800px]">
                  {/* Left: Document View */}
                  <div className="flex-1 bg-slate-200 rounded-[2.5rem] border-4 border-slate-300 shadow-inner overflow-hidden relative group">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/5 z-10 pointer-events-none">
                       <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                         <Split size={16} /> PDF Preview Mode
                       </div>
                    </div>
                    {/* Mock Document Content */}
                    <div className="bg-white dark:bg-slate-900 m-8 h-full shadow-2xl p-12 space-y-8 pointer-events-none">
                       <div className="flex justify-between items-start">
                         <div className="w-32 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                         <div className="text-right space-y-1">
                            <div className="w-48 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                            <div className="w-32 h-4 bg-slate-100 dark:bg-slate-800 rounded-lg ml-auto"></div>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-8 pt-12">
                         <div className="space-y-2">
                            <div className="w-20 h-3 bg-maroon-100 rounded"></div>
                            <div className="w-full h-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl"></div>
                         </div>
                       </div>
                       <div className="pt-12 space-y-4">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800">
                               <div className="w-8 h-4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                               <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                               <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>

                  {/* Right: Extracted Data Form */}
                  <div className="w-full lg:w-[480px] space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 h-full">
                       <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 bg-maroon-50 text-maroon-800 rounded-lg"><FileSearch size={18} /></div>
                         <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Extracted Fields</h3>
                       </div>

                       <div className="space-y-4">
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Vendor Name</label>
                           <input defaultValue="Shell Pakistan Limited" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-maroon-200 text-maroon-900 rounded-xl text-sm font-black focus:ring-4 focus:ring-maroon-800/5 outline-none" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice Date</label>
                             <input type="date" defaultValue={getCurrentDateStr()} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black" />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invoice No</label>
                             <input defaultValue="SPL-2026-991" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black" />
                           </div>
                         </div>
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tax ID (NTN)</label>
                           <input defaultValue="1234567-8" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black" />
                         </div>
                         
                         {/* Line Items Extraction */}
                         <div className="pt-4">
                           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Detected Line Items (3)</label>
                           <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                              {[
                                { item: "Engine Oil 5W-30", qty: 20, rate: 4500 },
                                { item: "Oil Filter", qty: 10, rate: 1200 },
                                { item: "Air Filter", qty: 5, rate: 900 },
                              ].map((row, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-maroon-300 transition-all">
                                  <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">{row.item}</p>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">{row.qty} Units @ Rs. {row.rate}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-maroon-800">Rs. {row.qty * row.rate}</p>
                                    <button className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                                  </div>
                                </div>
                              ))}
                           </div>
                         </div>

                         <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                           <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Amount</span>
                             <span className="text-2xl font-black text-maroon-800 tracking-tighter">Rs. 106,500.00</span>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Data Category to Export</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Download your ERP data as formatted Excel spreadsheets.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {docTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button 
                    key={type.id} 
                    onClick={() => {
                      // Trigger export for the specific category
                      exportToExcel([], `${type.label.replace(/\s+/g, '_')}_Data.xlsx`);
                      setView("dashboard");
                    }}
                    className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-2xl transition-all text-left relative overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 rounded-2xl w-fit group-hover:bg-blue-600 group-hover:text-white transition-all mb-6 relative z-10">
                      <Icon size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-all relative z-10">{type.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 relative z-10">Export all records for {type.label}</p>
                    <Download size={24} className="absolute bottom-8 right-8 text-slate-200 group-hover:text-blue-600 transition-all" />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center">
              <button onClick={() => setView("dashboard")} className="text-sm font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Cancel Export</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
