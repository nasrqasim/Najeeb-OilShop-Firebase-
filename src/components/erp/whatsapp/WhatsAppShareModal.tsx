"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Phone, MessageCircle, FileText, CheckCircle, AlertTriangle, RefreshCw, Download, Printer, Copy } from "lucide-react";
import html2canvas from "html2canvas";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: any;
  type?: "Statement" | "Invoice" | "Receipt" | "Reminder";
  referenceId?: string;
  documentData?: any; // e.g. ledger rows, invoice details
  shopProfile?: any;
}

const numEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export function buildWhatsAppMessage({
  shopName,
  type,
  party,
  documentData,
  shopProfile,
  itemsCatalog = [],
  categoriesCatalog = []
}: {
  shopName: string;
  type: string;
  party: any;
  documentData: any;
  shopProfile?: any;
  itemsCatalog?: any[];
  categoriesCatalog?: any[];
}) {
  const isVendor = 
    party?.type === "Vendor" || 
    Boolean(documentData?.vendorName) || 
    (documentData?.type && String(documentData.type).toLowerCase().includes("purchase"));

  const partyLabel = isVendor ? "Vendor" : "Customer";
  const partyName = party?.name || party?.companyName || documentData?.customerName || documentData?.vendorName || (isVendor ? "Valued Vendor" : "Valued Customer");
  
  // Format Date & Time: 22-Oct-2026 | 01:15 PM
  const rawDate = documentData?.date ? new Date(documentData.date) : new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayStr = String(rawDate.getDate()).padStart(2, "0");
  const monthStr = months[rawDate.getMonth()];
  const yearStr = rawDate.getFullYear();
  let hours = rawDate.getHours();
  const minutes = String(rawDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeFormatted = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  const dateTimeStr = `${dayStr}-${monthStr}-${yearStr} | ${timeFormatted}`;

  const docNo = documentData?.invoiceNo || documentData?.dcNo || documentData?.receiptNumber || documentData?.voucherNo || "1048";
  const docNoClean = String(docNo).startsWith("#") ? docNo : `#${docNo}`;

  const agencyName = (shopProfile?.companyName || shopName || "AL HADEED OIL AGENCY").toUpperCase();
  const agencyCity = shopProfile?.address ? shopProfile.address.split(",")[0].trim() : "Winder";
  const agencyPhone = shopProfile?.phone || "0333-5411558";

  const partyLocation = party?.address || party?.city || documentData?.location || documentData?.customerAddress || "";

  // If this is an Account Statement and contains ledger totals, produce Statement format
  if (type === "Statement" && (documentData?.closing !== undefined || documentData?.totalDr !== undefined || documentData?.totalCr !== undefined)) {
    const lines: string[] = [];
    lines.push(`🛢️ ${agencyName}`);
    lines.push(`📍 ${agencyCity} | 📞 ${agencyPhone}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`* Statement: ${partyName}`);
    lines.push(`* Date & Time: ${dateTimeStr}`);
    lines.push(`* ${partyLabel}: ${partyName}`);
    if (partyLocation) {
      lines.push(`* Location: ${partyLocation}`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📋 ACCOUNT SUMMARY:`);
    lines.push(`* Opening Balance: Rs. ${Math.round(documentData.opening || 0).toLocaleString()}`);
    lines.push(`* Total Sales (Debits): Rs. ${Math.round(documentData.totalDr || 0).toLocaleString()}`);
    lines.push(`* Total Receipts (Credits): Rs. ${Math.round(documentData.totalCr || 0).toLocaleString()}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
    const closingVal = Number(documentData.closing || 0);
    const balType = closingVal >= 0 ? "Debit (Receivable)" : "Credit (Advance)";
    lines.push(`💰 NET CLOSING BALANCE: Rs. ${Math.round(Math.abs(closingVal)).toLocaleString()} ${balType}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✨ Thank you for visiting ${agencyName}!`);
    return lines.join("\n");
  }

  // Invoice / Bill format
  const lines: string[] = [];
  lines.push(`🛢️ ${agencyName}`);
  lines.push(`📍 ${agencyCity} | 📞 ${agencyPhone}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`* ${isVendor ? "Bill" : "Invoice"}: ${docNoClean}`);
  lines.push(`* Date & Time: ${dateTimeStr}`);
  lines.push(`* ${partyLabel}: ${partyName}`);
  if (partyLocation) {
    lines.push(`* Location: ${partyLocation}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);

  const rawItems = documentData?.lines || documentData?.items || (type !== "Statement" ? documentData?.rows : []) || [];
  if (rawItems.length > 0) {
    lines.push(`📦 ITEMS DETAILS:`);
    rawItems.forEach((item: any, idx: number) => {
      const emoji = numEmojis[idx] || `${idx + 1}️⃣`;

      // Master item lookup for accurate category and unit resolution
      const rawItemId = String(item.itemId?._id || item.itemId || "");
      const master = itemsCatalog.find(i => String(i._id) === rawItemId || String(i.code) === rawItemId || i.name === item.description || i.name === item.itemName);

      // 1. Resolve item name
      let name = item.description || item.itemName || item.name || item.itemId?.name || master?.name || `Item ${idx + 1}`;
      if (name.startsWith("(") && name.includes(" - ")) {
        name = name.slice(1).split(" - ")[0].trim();
      }

      // 2. Resolve category
      let cat = item.category || item.categoryName || item.itemId?.category || "";
      if (!cat && master?.mainCategoryId) {
        const catObj = categoriesCatalog.find(c => String(c._id) === String(master.mainCategoryId));
        if (catObj?.name) cat = catObj.name;
      }
      if (!cat) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("20w") || lowerName.includes("oil") || lowerName.includes("sheel") || lowerName.includes("atlas") || lowerName.includes("zic") || lowerName.includes("havoline") || lowerName.includes("total")) {
          cat = "Engine Oil";
        } else if (lowerName.includes("diesel") && lowerName.includes("filter")) {
          cat = "Diesel Filter";
        } else if (lowerName.includes("filter")) {
          cat = "Oil Filter";
        } else if (lowerName.includes("cloth") || lowerName.includes("کپڑا")) {
          cat = "Cleaning Cloth";
        }
      }

      let headerText = name;
      if (cat && !name.toLowerCase().includes(cat.toLowerCase())) {
        headerText = `${name} (${cat})`;
      }

      // 3. Resolve quantity and unit string
      const unit = String(item.unit || item.itemId?.unit || master?.unit || "").toLowerCase();
      let qtyStr = "";

      if (unit.includes("piece") || unit.includes("pc") || cat.toLowerCase().includes("filter")) {
        const q = Number(item.qty || item.quantity || 1);
        qtyStr = `${q} Pc${q > 1 ? "s" : ""}`;
      } else if (unit.includes("kg")) {
        const q = Number(item.qty || item.quantity || 1);
        qtyStr = `${q} KG`;
      } else if (unit.includes("carton") || unit.includes("ctn")) {
        const q = Number(item.cartons || item.qty || item.quantity || 1);
        qtyStr = `${q} ${q === 1 ? "Carton" : "Cartons"}`;
      } else if (unit.includes("liter") || cat.toLowerCase().includes("oil")) {
        if (Number(item.cartons) > 0 && !item.liters) {
          const ctn = Number(item.cartons);
          qtyStr = `${ctn} ${ctn === 1 ? "Carton" : "Cartons"}`;
        } else if (Number(item.cartons) > 0 && Number(item.cartons) < 1) {
          qtyStr = `${item.cartons} Cartons`;
        } else if (Number(item.cartons) > 0) {
          const ctn = Number(item.cartons);
          qtyStr = `${ctn} ${ctn === 1 ? "Carton" : "Cartons"}`;
        } else if (Number(item.liters) > 0) {
          const l = Number(item.liters);
          qtyStr = `${l} ${l === 1 ? "Liter" : "Liters"}`;
        } else {
          const q = Number(item.qty || item.quantity || 1);
          qtyStr = `${q} Liters`;
        }
      } else {
        if (Number(item.cartons) > 0 && !item.liters) {
          const ctn = Number(item.cartons);
          qtyStr = `${ctn} ${ctn === 1 ? "Carton" : "Cartons"}`;
        } else if (Number(item.liters) > 0) {
          const l = Number(item.liters);
          qtyStr = `${l} ${l === 1 ? "Liter" : "Liters"}`;
        } else {
          const q = Number(item.qty || item.quantity || 1);
          qtyStr = `${q} ${item.unit || "Pc"}`;
        }
      }

      // 4. Rate & Amount
      let rate = Number(item.rate || item.ratePerCarton || item.unitPrice || item.price || 0);
      let amt = Number(item.netAmount || item.total || (item.grossAmount - (item.discount || 0)) || 0);
      const unitsCount = Number(item.cartons) || Number(item.qty) || 1;
      if (amt === 0 && rate > 0) {
        amt = rate * unitsCount;
      }
      if (rate === 0 && amt > 0) {
        rate = Math.round(amt / unitsCount);
      }

      lines.push(`${emoji} ${headerText}`);
      lines.push(`* Qty: ${qtyStr} @ Rs. ${Math.round(rate).toLocaleString()} = Rs. ${Math.round(amt).toLocaleString()}`);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  const grandTotal = Number(documentData?.totalAmount || documentData?.total || documentData?.grandTotal || documentData?.amount || 0);
  const paid = Number(documentData?.amountReceived || documentData?.amountPaid || 0);
  const thisDue = Math.max(0, grandTotal - paid);

  let prevBal = 0;
  if (documentData?.previousBalance !== undefined && documentData?.previousBalance !== null) {
    prevBal = Number(documentData.previousBalance) || 0;
  } else if (party?.balance !== undefined && party?.balance !== null) {
    prevBal = Number(party.balance) - thisDue;
  }

  const totalBal = (prevBal > 0 ? prevBal : 0) + thisDue;

  if (rawItems.length > 0) {
    lines.push(`* Total Items: ${rawItems.length}`);
  }
  lines.push(`* Current Bill: Rs. ${Math.round(grandTotal).toLocaleString()}`);
  if (paid > 0) {
    lines.push(`* Amount Paid: Rs. ${Math.round(paid).toLocaleString()}`);
  }
  lines.push(`* Previous Balance: Rs. ${Math.round(Math.max(0, prevBal)).toLocaleString()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💰 NET TOTAL PAYABLE: Rs. ${Math.round(totalBal > 0 ? totalBal : grandTotal).toLocaleString()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✨ Thank you for visiting ${agencyName}!`);

  return lines.join("\n");
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  party,
  type = "Statement",
  referenceId,
  documentData,
  shopProfile
}: WhatsAppShareModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [categoriesCatalog, setCategoriesCatalog] = useState<any[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && itemsCatalog.length === 0) {
      Promise.all([
        fetch('/api/items').then(r => r.json()).catch(() => ({})),
        fetch('/api/categories').then(r => r.json()).catch(() => ({}))
      ]).then(([itemsRes, catsRes]) => {
        if (itemsRes?.ok && itemsRes?.data) setItemsCatalog(itemsRes.data);
        if (catsRes?.ok && catsRes?.data) setCategoriesCatalog(catsRes.data);
      });
    }
  }, [isOpen, itemsCatalog.length]);

  // Auto-generate detailed message on open
  useEffect(() => {
    if (isOpen) {
      const initialPhone = 
        party?.phone || 
        party?.mobile || 
        documentData?.customerPhone || 
        documentData?.vendorPhone || 
        documentData?.phone || 
        "";
      
      setPhone(initialPhone);
      setStatus("idle");
      setErrorMessage("");
      setPreviewImg(null);
      setCopySuccess(false);
      
      const shopName = shopProfile?.companyName || "AL HADEED TRADERS";
      const generated = buildWhatsAppMessage({
        shopName,
        type,
        party,
        documentData,
        shopProfile,
        itemsCatalog,
        categoriesCatalog
      });

      setMessage(generated);
    }
  }, [isOpen, party, type, documentData, shopProfile, itemsCatalog, categoriesCatalog]);

  const generatePreviewImage = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const pngUrl = canvas.toDataURL("image/png");
      setPreviewImg(pngUrl);
    } catch (err) {
      console.error("Image generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!previewImg) return;
    const link = document.createElement("a");
    link.download = `Invoice_${documentData?.invoiceNo || documentData?.receiptNumber || "document"}.png`;
    link.href = previewImg;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!previewImg) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Invoice</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
              img { max-width: 100%; height: auto; display: block; }
              @media print {
                body { background: white; }
                img { width: 100%; height: auto; }
              }
            </style>
          </head>
          <body>
            <img src="${previewImg}" />
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSend = () => {
    if (!phone) {
      setErrorMessage("Please enter a valid WhatsApp number.");
      setStatus("error");
      return;
    }
    
    setIsSending(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      // Clean and format recipient phone number
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "92" + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith("3")) {
        cleanPhone = "92" + cleanPhone;
      }

      const encodedMsg = encodeURIComponent(message);
      
      // WhatsApp direct URL (works on both mobile app and desktop browser)
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

      window.open(waUrl, "_blank");
      setStatus("success");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(e.message || "An error occurred while sending.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const customerName = party?.name || party?.companyName || party?.vendor || documentData?.customerName || documentData?.vendorName || "Valued Customer";
  const customerPhone = party?.phone || party?.mobile || documentData?.customerPhone || documentData?.vendorPhone || "-";
  const customerAddress = party?.address || "-";
  const shopName = shopProfile?.companyName || "AL HADEED TRADERS";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#25D366] p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle size={26} className="fill-white/20 animate-pulse" />
            <div>
              <h3 className="font-black text-lg">Send Bill via WhatsApp</h3>
              <p className="text-white/80 text-xs font-bold">Fast formatted text message directly to WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-black/10 hover:bg-black/20 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950">
          
          {/* Left Side: Live Formatted Message Preview */}
          <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Message Preview</span>
              <button
                onClick={handleCopyMessage}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
              >
                <Copy size={13} />
                {copySuccess ? "Copied!" : "Copy Text"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 bg-[#EFEAE2] dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text max-h-[50vh] shadow-inner">
              {message}
            </div>

            <div className="flex gap-2 w-full mt-3 justify-end">
              {!previewImg && !isGenerating && (
                <button 
                  onClick={generatePreviewImage} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-[11px] font-bold rounded-lg transition-all"
                >
                  Generate Image Slip
                </button>
              )}
              {isGenerating && (
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Generating slip...
                </span>
              )}
              {previewImg && (
                <>
                  <button 
                    onClick={handleDownload} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Download size={13} /> PNG
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Printer size={13} /> Print
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Side: Message & Target Input */}
          <div className="flex flex-col justify-between space-y-4">
            
            {status === "success" && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-4 rounded-xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle size={18} className="shrink-0" />
                <p className="text-xs font-extrabold uppercase tracking-wider">WhatsApp opened successfully!</p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={20} className="shrink-0" />
                <p className="text-xs font-bold">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={12} /> Recipient WhatsApp Number
                </label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 03001234567 or 923001234567"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:outline-none focus:border-[#25D366] transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText size={12} /> Edit Message Text (if needed)
                </label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-[#25D366] transition-all dark:text-white leading-relaxed font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold leading-normal">
              💬 Clicking &quot;Send to WhatsApp&quot; will open WhatsApp with this complete bill message pre-filled and ready to send.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-black shadow-lg shadow-[#25D366]/30 transition-all disabled:opacity-50"
              >
                {isSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {isSending ? "Opening..." : "Send to WhatsApp"}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Hidden Document Render Container (for optional PNG slip generation) */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ position: "absolute", left: "-9999px" }}>
        <div ref={printRef} className="w-[794px] bg-white p-10 text-black font-sans leading-normal flex flex-col justify-between" style={{ minHeight: "1123px" }}>
          <div>
            <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-[#800000]">{shopName}</h1>
                <p className="text-xs text-slate-500 font-bold mt-1">{shopProfile?.address || "Main Road, Oil Market"}</p>
                <p className="text-xs text-slate-500 font-bold">Tel: {shopProfile?.phone || "03108444612"}</p>
                {shopProfile?.ntn && <p className="text-xs text-slate-500 font-bold">NTN: {shopProfile.ntn}</p>}
              </div>
              <div className="text-right">
                <h2 className="text-xl font-black uppercase tracking-wide text-[#800000]">
                  {type === "Statement" ? "Account Statement" : type === "Receipt" ? "Cash Receipt" : type === "Reminder" ? "Account Statement" : "Invoice"}
                </h2>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs font-bold text-left mt-2 border border-slate-200 p-2 rounded bg-slate-50">
                  <span className="text-slate-400">Voucher No:</span>
                  <span className="text-slate-800 text-right font-black">
                    {documentData?.invoiceNo || documentData?.receiptNumber || documentData?.voucherNo || "-"}
                  </span>
                  <span className="text-slate-400">Date:</span>
                  <span className="text-slate-800 text-right">
                    {documentData?.date ? new Date(documentData.date).toLocaleDateString() : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-3 rounded-lg flex flex-col justify-start mb-6">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Billed To</h3>
              <p className="font-extrabold text-sm text-slate-900">{customerName}</p>
              <p className="text-xs text-slate-500 font-bold">Phone: {customerPhone}</p>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Address: {customerAddress}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
