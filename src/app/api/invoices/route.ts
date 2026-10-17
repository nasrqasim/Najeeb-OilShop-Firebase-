import { fail, ok } from "@/lib/api";
import { getAllInvoices, createInvoice } from "@/lib/firestore/invoicesRepository";
import { getAllParties } from "@/lib/firestore/partiesRepository";
import { generateInvoiceJournalEntries, recalculatePartyBalance } from "@/services/posting/invoicePostingHelper";
import { normalizeInvoicePayload } from "@/lib/invoicePayload";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const partyId = searchParams.get("partyId");

    const [allInvoices, allParties] = await Promise.all([
      getAllInvoices(type || undefined),
      getAllParties()
    ]);

    const partyMap = new Map(allParties.map((p: any) => [String(p._id || p.id), p]));

    let rows = allInvoices.map((inv: any) => {
      const rawPid = String(inv.partyId?._id || inv.partyId?.id || inv.partyId || inv.vendorId || inv.customerId || inv.party || "");
      const matchedParty = rawPid ? partyMap.get(rawPid) : null;

      const partyObj = matchedParty
        ? {
            _id: matchedParty._id || matchedParty.id,
            name: matchedParty.name,
            companyName: matchedParty.companyName || matchedParty.name,
            type: matchedParty.type,
            phone: matchedParty.phone
          }
        : (typeof inv.partyId === "object" && inv.partyId !== null ? inv.partyId : null);

      const resolvedPartyName = matchedParty?.companyName || matchedParty?.name || inv.partyName || inv.customerName || inv.vendorName || (partyObj?.companyName || partyObj?.name);

      return {
        ...inv,
        partyId: partyObj || inv.partyId,
        partyName: resolvedPartyName,
        customerName: inv.customerName || (matchedParty?.type === "Customer" ? resolvedPartyName : resolvedPartyName),
        vendorName: inv.vendorName || (matchedParty?.type === "Vendor" ? resolvedPartyName : resolvedPartyName)
      };
    });

    if (partyId) {
      rows = rows.filter((r: any) => String(r.partyId?._id || r.partyId?.id || r.partyId) === String(partyId));
    }

    // Sort newest invoices first
    rows.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

    return ok(rows);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const normalizedRole = (role || "").toLowerCase().replace(/\s+/g, "");

    const body = await req.json();
    const payload = normalizeInvoicePayload(body);

    if (normalizedRole === "sales_user" || normalizedRole === "salesuser") {
      if (payload.type !== "sale" && payload.type !== "sale_return" && payload.type !== "pos") {
        return fail("Permission denied (Restricted invoice type)", 403);
      }
    }

    const row = await createInvoice(payload);
    try {
      await generateInvoiceJournalEntries(row);
    } catch (journalErr) {
      console.warn("Journal entry creation skipped or non-fatal error:", journalErr);
    }

    if (row.partyId) {
      try {
        await recalculatePartyBalance(row.partyId);
      } catch (balErr) {
        console.warn("recalculatePartyBalance error:", balErr);
      }
    }

    return ok(row, 201);
  } catch (e) {
    return fail((e as Error).message);
  }
}
