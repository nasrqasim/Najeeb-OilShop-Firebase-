import { fail, ok } from "@/lib/api";
import { getDocuments, getDocumentById, updateDocument } from "@/lib/firestore/genericRepository";

const IN_TYPES = new Set([
  "purchase",
  "import_purchase",
  "non_tax_purchase",
  "sale_return",
  "non_tax_sale_return",
  "add_stock",
  "grn",
]);

const OUT_TYPES = new Set([
  "sale",
  "non_tax_sale",
  "pos",
  "pos_counter_sale",
  "purchase_return",
  "non_tax_purchase_return",
  "reduce_stock",
  "challan",
]);

function parseLocalDate(value: string, endOfDay = false): Date {
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  else dt.setHours(0, 0, 0, 0);
  return dt;
}

function resolveLineItemId(line: { itemId?: unknown }): string {
  const id = line.itemId;
  if (!id) return "";
  if (typeof id === "object" && id !== null) {
    if ("_id" in (id as object)) return String((id as { _id: unknown })._id);
    if (typeof (id as any).toString === "function") return (id as any).toString();
  }
  return String(id);
}

function getLineCartonQty(line: any, litersInCtn: number, gallonsInCtn: number): number {
  const cartons = Number(line.cartons) || 0;
  if (cartons > 0) return cartons;

  const liters = Number(line.liters) || 0;
  if (liters > 0 && litersInCtn > 0) {
    return Number((liters / litersInCtn).toFixed(4));
  }

  const gallons = Number(line.gallons) || 0;
  if (gallons > 0 && gallonsInCtn > 0) {
    return Number((gallons / gallonsInCtn).toFixed(4));
  }

  const qty = Number(line.qty) || 0;
  return qty > 0 ? qty : 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    if (!itemId) return fail("itemId is required");

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? parseLocalDate(from) : null;
    const toDate = to ? parseLocalDate(to, true) : null;

    const itemObj = await getDocumentById("items", itemId);
    if (!itemObj) return fail("Item not found", 404);

    const gallonsInCtn = Number(itemObj.gallonsInCtn || 0);
    const litersInCtn = Number(itemObj.litersInCtn || 0);
    
    // Immutable original opening balance at item creation
    let originalOpeningStock = Number(
      itemObj.openingStockCartons ?? 
      itemObj.openingStock ?? 
      itemObj.initialStock ?? 
      itemObj.stockQtyCartons ?? 
      0
    );

    // Ensure openingStockCartons is persisted so it never recalculates or changes
    if (itemObj.openingStockCartons === undefined) {
      updateDocument("items", itemId, { openingStockCartons: originalOpeningStock }).catch(console.error);
    }

    const [allInvoices, parties, locations] = await Promise.all([
      getDocuments("invoices"),
      getDocuments("parties"),
      getDocuments("locations"),
    ]);

    const partyMap = new Map(parties.map((p: any) => [String(p._id), p]));
    const locMap = new Map(locations.map((l: any) => [String(l._id), l.name]));

    const matchingInvoices = allInvoices.filter((inv: any) => {
      if (inv.status === "cancelled" || inv.status === "Cancelled") return false;
      if (!Array.isArray(inv.lines)) return false;
      return inv.lines.some((l: any) => resolveLineItemId(l) === itemId);
    });

    matchingInvoices.sort((a: any, b: any) => new Date(a.date || a.createdAt || 0).getTime() - new Date(b.date || b.createdAt || 0).getTime());

    const allTxRows: Array<{
      date: Date;
      refNo: string;
      type: string;
      location: string;
      partyName: string;
      in: number;
      out: number;
      rate: number;
      total: number;
      balance?: number;
    }> = [];

    // Push original opening balance row at inception
    const pRate = Number(itemObj?.purchaseRate || 0);
    const itemCreatedAt = itemObj?.createdAt ? new Date(itemObj.createdAt) : new Date("2024-01-01");
    if (originalOpeningStock > 0) {
      allTxRows.push({
        date: itemCreatedAt,
        refNo: "Opening",
        type: "OPENING BALANCE",
        location: "",
        partyName: "Opening Stock",
        in: originalOpeningStock,
        out: 0,
        rate: pRate,
        total: originalOpeningStock * pRate,
      });
    }

    // Add each matching transaction
    for (const inv of matchingInvoices) {
      const invType = String(inv.type || "");
      const isIn = IN_TYPES.has(invType);
      const isOut = OUT_TYPES.has(invType);
      if (!isIn && !isOut) continue;

      const partyObj = inv.partyId ? partyMap.get(String(inv.partyId)) : null;
      let partyName = invType.toLowerCase().includes("sale") ? "Walk-in (Cash) Customer" : "Cash Vendor";
      if (partyObj) {
        partyName = partyObj.name || partyObj.companyName || partyName;
      }

      for (const line of inv.lines || []) {
        if (resolveLineItemId(line) !== itemId) continue;

        const qty = getLineCartonQty(line, litersInCtn, gallonsInCtn);
        if (qty <= 0) continue;

        allTxRows.push({
          date: new Date(inv.date || inv.createdAt || Date.now()),
          refNo: inv.invoiceNo || "",
          type: invType.replace(/_/g, " ").toUpperCase(),
          location: (inv.locationId ? locMap.get(String(inv.locationId)) : null) || "Main Warehouse",
          partyName,
          in: isIn ? qty : 0,
          out: isOut ? qty : 0,
          rate: Number(line.rate) || 0,
          total: Number(line.netAmount) || qty * (Number(line.rate) || 0),
        });
      }
    }

    // Sort all rows chronologically (Opening balance always first)
    allTxRows.sort((a, b) => {
      if (a.refNo === "Opening") return -1;
      if (b.refNo === "Opening") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Compute continuous running balance
    let running = 0;
    allTxRows.forEach(r => {
      running += (r.in - r.out);
      r.balance = Math.max(0, Number(running.toFixed(4)));
    });

    // Determine Opening Balance for requested date range
    let periodOpeningBalance = originalOpeningStock;
    if (fromDate) {
      const beforeRows = allTxRows.filter(r => new Date(r.date) < fromDate);
      if (beforeRows.length > 0) {
        periodOpeningBalance = beforeRows[beforeRows.length - 1].balance || 0;
      } else {
        periodOpeningBalance = originalOpeningStock;
      }
    }

    // Filter rows for the requested period
    const periodRows = allTxRows.filter(r => {
      const d = new Date(r.date);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    // Summary calculations: Closing = Opening + Total In - Total Out
    const totalIn = Number(periodRows.filter(r => r.refNo !== "Opening").reduce((s, r) => s + r.in, 0).toFixed(4));
    const totalOut = Number(periodRows.reduce((s, r) => s + r.out, 0).toFixed(4));
    const closingBalance = Math.max(0, Number((periodOpeningBalance + totalIn - totalOut).toFixed(4)));

    return ok({
      rows: periodRows,
      openingBalance: periodOpeningBalance,
      totalIn,
      totalOut,
      closingBalance,
      gallonsInCtn,
      litersInCtn,
    });
  } catch (e) {
    return fail((e as Error).message);
  }
}

export const dynamic = "force-dynamic";
