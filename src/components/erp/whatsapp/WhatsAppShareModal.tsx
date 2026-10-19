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

export function buildWhatsAppMessage({
  shopName,
  type,
  party,
  documentData
}: {
  shopName: string;
  type: string;
  party: any;
  documentData: any;
}) {
  const isVendor = 
    party?.type === "Vendor" || 
    Boolean(documentData?.vendorName) || 
    (documentData?.type && String(documentData.type).toLowerCase().includes("purchase"));

  const partyLabel = isVendor ? "Vendor" : "Customer";
  const partyName = party?.name || party?.companyName || documentData?.customerName || documentData?.vendorName || (isVendor ? "Valued Vendor" : "Valued Customer");
  const docDate = documentData?.date ? new Date(documentData.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  let title = "INVOICE";
  if (type === "Invoice") {
    title = isVendor ? "PURCHASE BILL" : "SALE INVOICE";
  } else if (type === "Receipt") {
    title = isVendor ? "PAYMENT VOUCHER" : "PAYMENT RECEIPT";
  } else if (type === "Statement") {
    title = "ACCOUNT STATEMENT";
  } else if (type === "Reminder") {
    title = "PAYMENT REMINDER";
  }

  const docNo = documentData?.invoiceNo || documentData?.dcNo || documentData?.receiptNumber || documentData?.voucherNo || "-";

  const lines: string[] = [];
  lines.push(`*${shopName.toUpperCase()}*`);
  lines.push(`----------------------------------------`);
  lines.push(`*${title}*`);
  lines.push(`----------------------------------------`);
  if (docNo && docNo !== "-") lines.push(`*Doc #:* ${docNo}`);
  lines.push(`*Date:* ${docDate}`);
  lines.push(`*${partyLabel}:* ${partyName}`);

  const items = documentData?.rows || documentData?.lines || documentData?.items || [];
  if (items.length > 0) {
    lines.push(`----------------------------------------`);
    lines.push(`*ITEMS:*`);
    items.forEach((item: any, idx: number) => {
      const name = item.description || item.itemName || item.name || `Item ${idx + 1}`;
      let qtyParts: string[] = [];
      if (Number(item.cartons) > 0) qtyParts.push(`${item.cartons} Ctn`);
      if (Number(item.liters) > 0) qtyParts.push(`${item.liters} Ltr`);
      if (Number(item.gallons) > 0) qtyParts.push(`${item.gallons} Gal`);
      if (qtyParts.length === 0) qtyParts.push(`${item.qty || 1} Qty`);

      const qtyStr = qtyParts.join(" / ");
      const rate = Number(item.rate || item.unitPrice || item.ratePerCtn || 0);
      const amt = Number(item.netAmount || item.total || (item.grossAmount - (item.discount || 0)) || (rate * (Number(item.cartons) || Number(item.qty) || 1)));
      
      lines.push(`${idx + 1}. *${name}*`);
      lines.push(`   ${qtyStr} @ Rs. ${Math.round(rate).toLocaleString()} = Rs. ${Math.round(amt).toLocaleString()}`);
    });
  }

  const grandTotal = Number(documentData?.totalAmount || documentData?.total || documentData?.grandTotal || documentData?.amount || 0);
  const subTotal = Number(documentData?.subTotal || documentData?.grossAmount || 0);
  const discount = Number(documentData?.discountAmount || documentData?.discount || 0);
  const tax = Number(documentData?.taxAmount || 0);
  const paid = Number(documentData?.amountReceived || documentData?.amountPaid || 0);
  const thisDue = Math.max(0, grandTotal - paid);

  let prevBal = 0;
  if (documentData?.previousBalance !== undefined && documentData?.previousBalance !== null) {
    prevBal = Number(documentData.previousBalance) || 0;
  } else if (party?.balance !== undefined && party?.balance !== null) {
    prevBal = Number(party.balance) - thisDue;
  }

  const totalBal = (prevBal > 0 ? prevBal : 0) + thisDue;
  const advance = documentData?.availableAdvance !== undefined && documentData?.availableAdvance !== null
    ? Number(documentData.availableAdvance)
    : (party?.availableAdvance || (party?.balance < 0 ? Math.abs(party.balance) : 0));

  lines.push(`----------------------------------------`);
  if (subTotal > 0 && Math.round(subTotal) !== Math.round(grandTotal)) {
    lines.push(`*Subtotal:* Rs. ${Math.round(subTotal).toLocaleString()}`);
  }
  if (discount > 0) {
    lines.push(`*Discount:* Rs. ${Math.round(discount).toLocaleString()}`);
  }
  if (tax > 0) {
    lines.push(`*Tax:* Rs. ${Math.round(tax).toLocaleString()}`);
  }
  lines.push(`*Total Amount:* Rs. ${Math.round(grandTotal).toLocaleString()}`);
  if (paid > 0) {
    lines.push(`*Amount Paid:* Rs. ${Math.round(paid).toLocaleString()}`);
  }
  if (thisDue > 0 && paid > 0) {
    lines.push(`*This Bill Due:* Rs. ${Math.round(thisDue).toLocaleString()}`);
  }

  if (prevBal > 0) {
    lines.push(`*Previous Udhaar:* Rs. ${Math.round(prevBal).toLocaleString()}`);
    lines.push(`*Total Balance Due:* Rs. ${Math.round(totalBal).toLocaleString()}`);
  } else if (party?.balance !== undefined && !isVendor) {
    lines.push(`*Net Balance Due:* Rs. ${Math.round(Math.max(0, Number(party.balance))).toLocaleString()}`);
  }

  if (advance > 0) {
    lines.push(`*Available Advance:* Rs. ${Math.round(advance).toLocaleString()}`);
  }

  lines.push(`----------------------------------------`);
  lines.push(`Thank you for your business!`);
  lines.push(`*${shopName}*`);

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
  
  const printRef = useRef<HTMLDivElement>(null);

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
        documentData
      });

      setMessage(generated);
    }
  }, [isOpen, party, type, documentData, shopProfile]);

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
