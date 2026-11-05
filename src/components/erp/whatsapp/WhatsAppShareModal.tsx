"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Phone, MessageCircle, FileText, CheckCircle, AlertTriangle, RefreshCw, Download, Printer, Copy, Camera, Share2 } from "lucide-react";
import html2canvas from "html2canvas";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: any;
  type?: "Statement" | "Invoice" | "Receipt" | "Reminder";
  referenceId?: string;
  documentData?: any; // e.g. ledger rows, invoice details
  shopProfile?: any;
  initialMode?: "image" | "text";
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

  const agencyName = (shopProfile?.companyName || shopName || "AL HADEED TRADERS").toUpperCase();
  const agencyCity = shopProfile?.address ? shopProfile.address.split(",")[0].trim() : "Winder";
  const agencyPhone = shopProfile?.phone || "0315-8060240 / 0333-5411558";

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

      const rawItemId = String(item.itemId?._id || item.itemId || "");
      const master = itemsCatalog.find(i => String(i._id) === rawItemId || String(i.code) === rawItemId || i.name === item.description || i.name === item.itemName);

      let name = item.description || item.itemName || item.name || item.itemId?.name || master?.name || `Item ${idx + 1}`;
      if (name.startsWith("(") && name.includes(" - ")) {
        name = name.slice(1).split(" - ")[0].trim();
      }

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
  shopProfile,
  initialMode = "image"
}: WhatsAppShareModalProps) {
  const [activeMode, setActiveMode] = useState<"image" | "text">("image");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [categoriesCatalog, setCategoriesCatalog] = useState<any[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
    }
  }, [isOpen, initialMode]);

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
      setImageCopied(false);
      
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

  const generatePreviewImage = useCallback(async () => {
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
      return pngUrl;
    } catch (err) {
      console.error("Image generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Auto-generate preview image once modal is mounted
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        generatePreviewImage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, generatePreviewImage, documentData]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyImageOnly = async () => {
    try {
      if (!printRef.current) return;
      setIsGenerating(true);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob })
          ]);
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 3000);
        }
      }, "image/png");
    } catch (err) {
      console.error("Copy image failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewImg) return;
    const link = document.createElement("a");
    const namePart = (party?.name || party?.companyName || "party").replace(/[^a-zA-Z0-9]/g, "_");
    link.download = `${type}_${namePart}_${documentData?.invoiceNo || documentData?.voucherNo || Date.now()}.png`;
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
            <title>Print ${type}</title>
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

  // SEND PICTURE VIA WHATSAPP
  const handleSendImage = async () => {
    if (!phone) {
      setErrorMessage("Please enter a valid WhatsApp number.");
      setStatus("error");
      return;
    }

    setIsSending(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      // 1. Generate HD canvas & blob
      let blob: Blob | null = null;
      if (printRef.current) {
        const canvas = await html2canvas(printRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false
        });
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      }

      // 2. Format phone number
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "92" + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith("3")) {
        cleanPhone = "92" + cleanPhone;
      }

      const partyNameStr = (party?.name || party?.companyName || "Party").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${type}_${partyNameStr}.png`;

      // 3. Mobile Web Share API: if available with files, share directly into WhatsApp
      if (blob && typeof navigator !== "undefined" && (navigator as any).canShare) {
        try {
          const file = new File([blob], filename, { type: "image/png" });
          if ((navigator as any).canShare({ files: [file] })) {
            await (navigator as any).share({
              files: [file],
              title: `${type} - ${party?.name || party?.companyName || ""}`,
              text: `Here is your ${type.toLowerCase()} picture slip.`
            });
            setStatus("success");
            setIsSending(false);
            return;
          }
        } catch (shareErr) {
          console.log("Mobile share skipped/cancelled, fallback to clipboard/download", shareErr);
        }
      }

      // 4. Desktop Clipboard Copy (Picture copied directly to system clipboard for Ctrl + V)
      let copiedToClip = false;
      if (blob && typeof navigator !== "undefined" && navigator.clipboard && (window as any).ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob })
          ]);
          copiedToClip = true;
          setImageCopied(true);
        } catch (clipErr) {
          console.warn("Clipboard write failed", clipErr);
        }
      }

      // 5. Download PNG file as reliable backup
      const downloadUrl = previewImg || (blob ? URL.createObjectURL(blob) : null);
      if (downloadUrl) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = downloadUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 6. Open WhatsApp Web / App
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}`;
      window.open(waUrl, "_blank");

      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMessage(e.message || "An error occurred while preparing picture.");
    } finally {
      setIsSending(false);
    }
  };

  // SEND TEXT MESSAGE VIA WHATSAPP
  const handleSendText = () => {
    if (!phone) {
      setErrorMessage("Please enter a valid WhatsApp number.");
      setStatus("error");
      return;
    }
    
    setIsSending(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "92" + cleanPhone.substring(1);
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith("3")) {
        cleanPhone = "92" + cleanPhone;
      }

      const encodedMsg = encodeURIComponent(message);
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

  const isVendor = party?.type === "Vendor" || Boolean(documentData?.vendorName);
  const customerName = party?.name || party?.companyName || party?.vendor || documentData?.customerName || documentData?.vendorName || (isVendor ? "Valued Vendor" : "Valued Customer");
  const customerPhone = party?.phone || party?.mobile || documentData?.customerPhone || documentData?.vendorPhone || "-";
  const customerAddress = party?.address || party?.city || "-";
  const shopName = shopProfile?.companyName || "AL HADEED TRADERS";

  const rawItems = documentData?.lines || documentData?.items || (type !== "Statement" ? documentData?.rows : []) || [];
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

  const isStatement = type === "Statement";
  const ledgerRows = documentData?.rows || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh]">
        
        {/* Header with Mode Switcher */}
        <div className="bg-gradient-to-r from-[#25D366] via-emerald-600 to-[#128C7E] px-6 py-4 text-white flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
              <MessageCircle size={24} className="fill-white/30 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                WhatsApp {isStatement ? "Statement" : "Bill"}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 tracking-wider">
                  {activeMode === "image" ? "Picture Mode" : "Text Mode"}
                </span>
              </h3>
              <p className="text-white/80 text-xs font-semibold">Share {isStatement ? "Account Statement" : "Invoice Bill"} with {customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-black/20 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveMode("image")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeMode === "image"
                    ? "bg-white text-emerald-800 shadow-md"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Camera size={14} />
                Picture Slip
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("text")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  activeMode === "text"
                    ? "bg-white text-emerald-800 shadow-md"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <FileText size={14} />
                Text Message
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors bg-black/10 hover:bg-black/30 p-2.5 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 dark:bg-slate-950">
          
          {/* Left Side: Preview (8 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden">
            
            {activeMode === "image" ? (
              // IMAGE / PICTURE SLIP VIEW
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Camera size={14} className="text-[#25D366]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Picture Slip Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyImageOnly}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                      title="Copy Picture directly to Clipboard"
                    >
                      <Copy size={12} />
                      {imageCopied ? "Copied!" : "Copy Picture"}
                    </button>
                    {previewImg && (
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                        title="Download Picture as PNG"
                      >
                        <Download size={12} />
                        PNG
                      </button>
                    )}
                    {previewImg && (
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                        title="Print Picture Slip"
                      >
                        <Printer size={12} />
                        Print
                      </button>
                    )}
                  </div>
                </div>

                {/* Picture Slip Rendering Area */}
                <div className="flex-1 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[380px] max-h-[55vh]">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
                      <RefreshCw size={28} className="animate-spin text-[#25D366]" />
                      <p className="text-xs font-bold tracking-wider">Generating high-definition picture slip...</p>
                    </div>
                  ) : previewImg ? (
                    // Render the crisp captured PNG image
                    <img 
                      src={previewImg} 
                      alt="WhatsApp Slip Preview" 
                      className="max-w-full h-auto rounded-lg shadow-md border border-slate-200/80 object-contain max-h-[52vh]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                      <Camera size={32} className="text-slate-300" />
                      <button 
                        onClick={generatePreviewImage}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      >
                        Click to Render Picture
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-300 font-bold flex items-center justify-between">
                  <span>📸 Picture format ready for WhatsApp</span>
                  <button 
                    onClick={generatePreviewImage}
                    disabled={isGenerating}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <RefreshCw size={11} className={isGenerating ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              // TEXT MESSAGE VIEW (Preserves exact text message behavior)
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[#25D366]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Text Message Preview
                    </span>
                  </div>
                  <button
                    onClick={handleCopyMessage}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all"
                  >
                    <Copy size={12} />
                    {copySuccess ? "Copied!" : "Copy Text"}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#EFEAE2] dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text min-h-[380px] max-h-[55vh] shadow-inner">
                  {message}
                </div>

                <div className="mt-3 p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                  <span>💬 Standard formatted WhatsApp text message</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Action Panel & Recipient Details (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            
            <div className="space-y-4">
              {/* Recipient Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Recipient ({isVendor ? "Vendor" : "Customer"})
                </span>
                <p className="font-black text-sm text-slate-900 dark:text-white">{customerName}</p>
                <p className="text-xs text-slate-500 font-semibold">{customerAddress}</p>
              </div>

              {/* Status Notifications */}
              {status === "success" && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl flex items-start gap-3 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide">WhatsApp Opened!</p>
                    {activeMode === "image" ? (
                      <p className="text-[11px] font-medium mt-1 leading-snug">
                        📋 <b>Picture copied to clipboard!</b> Simply press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono font-bold">Ctrl + V</kbd> (Paste) in WhatsApp to send the picture.
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium mt-1 leading-snug">
                        Text message pre-filled in WhatsApp chat bar ready to send!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl flex items-center gap-3 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                  <p className="text-xs font-bold">{errorMessage}</p>
                </div>
              )}

              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={12} /> WhatsApp Phone Number
                </label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 03158060240 or 923158060240"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 transition-all dark:text-white"
                />
              </div>

              {/* Optional Text Editor (available in text mode, or folded in image mode) */}
              {activeMode === "text" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={12} /> Edit Message Text (if needed)
                  </label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-[#25D366] transition-all dark:text-white leading-relaxed font-mono"
                  />
                </div>
              )}

              {/* Picture Mode Instructions Box */}
              {activeMode === "image" && (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-300 leading-relaxed space-y-1.5">
                  <p className="font-black flex items-center gap-1.5">
                    <Camera size={14} className="text-emerald-600" /> How Picture Sharing Works:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-medium pl-1 text-[11px]">
                    <li>Click <b>&quot;Send Picture via WhatsApp&quot;</b> below.</li>
                    <li>Picture is <b>copied to clipboard</b> & downloaded.</li>
                    <li>WhatsApp Web chat opens automatically.</li>
                    <li>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono font-black text-[10px]">Ctrl + V</kbd> to paste and send!</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {activeMode === "image" ? (
                <button 
                  onClick={handleSendImage}
                  disabled={isSending || isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-sm font-black shadow-lg shadow-[#25D366]/30 transition-all disabled:opacity-50"
                >
                  {isSending ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
                  {isSending ? "Preparing Picture..." : "Send Picture via WhatsApp"}
                </button>
              ) : (
                <button 
                  onClick={handleSendText}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-sm font-black shadow-lg shadow-[#25D366]/30 transition-all disabled:opacity-50"
                >
                  {isSending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSending ? "Opening WhatsApp..." : "Send Text via WhatsApp"}
                </button>
              )}

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => setActiveMode(activeMode === "image" ? "text" : "image")}
                  className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  Switch to {activeMode === "image" ? "💬 Text Message" : "📸 Picture Slip"}
                </button>
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* OFF-SCREEN HIGH-RESOLUTION DOCUMENT RENDER (Used by html2canvas for Crystal Clear Pictures) */}
      <div 
        className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" 
        style={{ position: "absolute", left: "-9999px", width: "794px" }}
      >
        <div 
          ref={printRef} 
          style={{ width: "794px", minHeight: "900px", backgroundColor: "#ffffff", padding: "36px", color: "#0f172a", fontFamily: "Arial, sans-serif" }}
          className="flex flex-col justify-between"
        >
          {/* Top Brand Header */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #800000", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#800000", margin: "0", letterSpacing: "-0.5px" }}>
                  {shopName.toUpperCase()}
                </h1>
                <p style={{ fontSize: "13px", fontWeight: "700", color: "#475569", margin: "4px 0 2px 0" }}>
                  Wholesale Oil Agency & Lubricants Distributor
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "0" }}>
                  📍 {shopProfile?.address || "Main Road, Winder, Balochistan"} | 📞 Tel: {shopProfile?.phone || "0315-8060240 / 0333-5411558"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-block", backgroundColor: isStatement ? "#25D366" : "#800000", color: "#ffffff", padding: "6px 14px", borderRadius: "8px", fontWeight: "900", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {isStatement ? "Account Statement" : type === "Receipt" ? "Cash Receipt" : isVendor ? "Purchase Bill" : "Sales Invoice"}
                </div>
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  Date: {new Date().toLocaleDateString("en-GB")} | {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {!isStatement && (
                  <div style={{ fontSize: "13px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
                    Doc #: {documentData?.invoiceNo || documentData?.voucherNo || documentData?.receiptNumber || "-"}
                  </div>
                )}
              </div>
            </div>

            {/* Billed To Information Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px", display: "block" }}>
                  {isVendor ? "Vendor Details" : "Customer Details"}
                </span>
                <p style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: "2px 0" }}>
                  {customerName}
                </p>
                <p style={{ fontSize: "12px", color: "#475569", fontWeight: "600", margin: "0" }}>
                  📍 {customerAddress}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px", display: "block" }}>
                  Contact Phone
                </span>
                <p style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a", margin: "2px 0" }}>
                  {customerPhone}
                </p>
                <p style={{ fontSize: "11px", color: "#16a34a", fontWeight: "800", margin: "0" }}>
                  ✓ WhatsApp Verified
                </p>
              </div>
            </div>

            {/* CONDITIONAL CONTENT: STATEMENT vs INVOICE/BILL */}
            {isStatement ? (
              // STATEMENT CARD & LEDGER TABLE
              <div>
                {/* 4 Summary Metric Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ backgroundColor: "#f1f5f9", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block" }}>Opening Balance</span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                      Rs. {Math.round(documentData?.opening || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", display: "block" }}>Total Sales (Dr)</span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: "#1e40af" }}>
                      Rs. {Math.round(documentData?.totalDr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#16a34a", textTransform: "uppercase", display: "block" }}>Total Receipts (Cr)</span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: "#15803d" }}>
                      Rs. {Math.round(documentData?.totalCr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ backgroundColor: (documentData?.closing || 0) >= 0 ? "#fef2f2" : "#f0fdf4", padding: "12px", borderRadius: "10px", border: (documentData?.closing || 0) >= 0 ? "1px solid #fecaca" : "1px solid #bbf7d0" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: (documentData?.closing || 0) >= 0 ? "#b91c1c" : "#15803d", textTransform: "uppercase", display: "block" }}>Closing Balance</span>
                    <span style={{ fontSize: "15px", fontWeight: "900", color: (documentData?.closing || 0) >= 0 ? "#991b1b" : "#166534" }}>
                      Rs. {Math.round(Math.abs(documentData?.closing || 0)).toLocaleString()} {(documentData?.closing || 0) >= 0 ? "(Dr)" : "(Cr)"}
                    </span>
                  </div>
                </div>

                {/* Statement Transactions Table */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "0.5px", color: "#475569", marginBottom: "8px" }}>
                    Recent Transaction Ledger
                  </h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Date</th>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Ref / Voucher</th>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Description</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Debit (Rs)</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Credit (Rs)</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Balance (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>No ledger entries found.</td>
                        </tr>
                      ) : (
                        ledgerRows.slice(-18).map((row: any, idx: number) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "7px 10px", fontWeight: "600", color: "#334155" }}>
                              {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "-"}
                            </td>
                            <td style={{ padding: "7px 10px", fontWeight: "800", color: "#800000" }}>
                              {row.voucherNo || row.invoiceNo || "-"}
                            </td>
                            <td style={{ padding: "7px 10px", color: "#1e293b", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {row.description || row.type || "Transaction"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: "700", color: Number(row.debit) > 0 ? "#1e40af" : "#94a3b8" }}>
                              {Number(row.debit) > 0 ? Math.round(Number(row.debit)).toLocaleString() : "-"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: "700", color: Number(row.credit) > 0 ? "#15803d" : "#94a3b8" }}>
                              {Number(row.credit) > 0 ? Math.round(Number(row.credit)).toLocaleString() : "-"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: "900", color: "#0f172a" }}>
                              Rs. {Math.round(Number(row.runningBalance || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Net Balance Highlight Banner */}
                <div style={{ backgroundColor: (documentData?.closing || 0) >= 0 ? "#800000" : "#15803d", color: "#ffffff", padding: "14px 20px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "800", opacity: 0.9 }}>
                      Net Outstanding Balance
                    </span>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", opacity: 0.85 }}>
                      {(documentData?.closing || 0) >= 0 ? "Amount Receivable from Party" : "Advance / Credit in Account"}
                    </p>
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "900" }}>
                    PKR {Math.round(Math.abs(documentData?.closing || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              // INVOICE / BILL DETAILS TABLE
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#1e293b", color: "#ffffff" }}>
                      <th style={{ padding: "8px 10px", textAlign: "center", width: "35px" }}>#</th>
                      <th style={{ padding: "8px 10px", textAlign: "left" }}>Item Description</th>
                      <th style={{ padding: "8px 10px", textAlign: "center" }}>Qty / Unit</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate (Rs)</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Total (Rs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>No line items recorded.</td>
                      </tr>
                    ) : (
                      rawItems.map((item: any, idx: number) => {
                        const name = item.description || item.itemName || item.name || `Item ${idx + 1}`;
                        const qty = item.cartons || item.qty || item.quantity || 1;
                        const unit = item.unit || "Pc";
                        const rate = Number(item.rate || item.ratePerCarton || item.unitPrice || 0);
                        const amt = Number(item.netAmount || item.total || (qty * rate));
                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: "700", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "8px 10px", fontWeight: "700", color: "#0f172a" }}>
                              {name}
                              {item.category && <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "6px" }}>({item.category})</span>}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: "800", color: "#800000" }}>{qty} {unit}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: "#334155" }}>{rate > 0 ? Math.round(rate).toLocaleString() : "-"}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "900", color: "#0f172a" }}>{Math.round(amt).toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Totals Summary Card */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                  <div style={{ width: "320px", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", fontSize: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#64748b", fontWeight: "700" }}>Current Bill:</span>
                      <span style={{ fontWeight: "800" }}>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                    </div>
                    {paid > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid #f1f5f9", color: "#16a34a" }}>
                        <span style={{ fontWeight: "700" }}>Amount Paid:</span>
                        <span style={{ fontWeight: "800" }}>Rs. {Math.round(paid).toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ color: "#64748b", fontWeight: "700" }}>Previous Balance:</span>
                      <span style={{ fontWeight: "800" }}>Rs. {Math.round(Math.max(0, prevBal)).toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#800000", color: "#ffffff", fontWeight: "900", fontSize: "14px" }}>
                      <span>NET TOTAL PAYABLE:</span>
                      <span>PKR {Math.round(totalBal > 0 ? totalBal : grandTotal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Footer Note */}
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "14px", marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
            <div>
              <p style={{ margin: "0", fontWeight: "700", color: "#0f172a" }}>Thank you for doing business with AL HADEED TRADERS!</p>
              <p style={{ margin: "2px 0 0 0" }}>Software by Nasr Qasim • Al Hadeed Traders ERP System</p>
            </div>
            <div style={{ textAlign: "right", fontWeight: "700" }}>
              Authorized Signature / Seal
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
