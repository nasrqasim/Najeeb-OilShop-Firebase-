import { fail, ok } from "@/lib/api";
import { getAllCashReceipts, createCashReceipt } from "@/lib/firestore/paymentsRepository";
import { getAllParties } from "@/lib/firestore/partiesRepository";
import { getDocuments } from "@/lib/firestore/genericRepository";
import { recalculatePartyBalance, postCashReceiptJournalEntries } from "@/services/posting/invoicePostingHelper";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";

    const [allReceipts, allParties, allAccounts] = await Promise.all([
      getAllCashReceipts(),
      getAllParties(),
      getDocuments("accounts")
    ]);

    const partyMap = new Map(allParties.map((p: any) => [String(p._id || p.id), p]));
    const accountMap = new Map(allAccounts.map((a: any) => [String(a._id || a.id), a]));

    let rows = allReceipts.map((r: any) => {
      const rawPid = String(r.partyId?._id || r.partyId?.id || r.partyId || r.party || "");
      const matchedParty = rawPid ? partyMap.get(rawPid) : null;

      const partyObj = matchedParty
        ? {
            _id: matchedParty._id || matchedParty.id,
            name: matchedParty.name,
            companyName: matchedParty.companyName || matchedParty.name,
            type: matchedParty.type
          }
        : (typeof r.partyId === "object" && r.partyId !== null ? r.partyId : null);

      const resolvedPartyName = matchedParty?.companyName || matchedParty?.name || r.partyName || r.party || (partyObj?.companyName || partyObj?.name);

      const rawAid = String(r.cashAccountId?._id || r.cashAccountId || "");
      const matchedAcc = rawAid ? accountMap.get(rawAid) : null;
      const displayCashAcc = matchedAcc ? (matchedAcc.name || matchedAcc.title) : (r.cashAccountTitle || r.cashAccount || "Cash in Hand");

      return {
        ...r,
        partyId: partyObj || r.partyId,
        party: resolvedPartyName,
        partyName: resolvedPartyName,
        cashAccountTitle: displayCashAcc,
        cashAccount: displayCashAcc
      };
    });

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r: any) => {
        const num = r.receiptNumber || "";
        const ref = r.reference || "";
        const narr = r.narration || "";
        const amt = String(r.amount || "");
        const rType = r.receiptType || "";
        const partyName = r.party || r.partyName || "";
        
        return num.toLowerCase().includes(q) ||
               ref.toLowerCase().includes(q) ||
               narr.toLowerCase().includes(q) ||
               amt.includes(q) ||
               rType.toLowerCase().includes(q) ||
               partyName.toLowerCase().includes(q);
      });
    }

    // Sort newest receipts first
    rows.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

    return ok(rows);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.receiptNumber || body.receiptNumber === "Auto-generated") {
      const all = await getAllCashReceipts();
      let attempt = all.length + 1;
      let candidate = `CRV-${attempt.toString().padStart(5, "0")}`;
      body.receiptNumber = candidate;
    }

    if (body.receiptType === "multi" && Array.isArray(body.partyLines)) {
      body.amount = body.partyLines.reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
      body.netAmount = body.amount;
    }
    if (body.receiptType === "petty" && Array.isArray(body.contraLines)) {
      body.amount = body.contraLines.reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
      body.netAmount = body.amount;
    }

    const payload = {
      ...body,
      partyReceiptType: body.partyReceiptType || "Standard"
    };

    const row = await createCashReceipt(payload);
    const partyId = row.partyId?.toString?.() || row.partyId;
    if (row.status === "Posted" || !row.status) {
      await postCashReceiptJournalEntries(row);
      if (partyId) {
        await recalculatePartyBalance(String(partyId));
      }
    }
    return ok(row, 201);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export const dynamic = "force-dynamic";
