import { fail, ok } from "@/lib/api";
import { getDocuments, createDocument } from "@/lib/firestore/genericRepository";

export async function GET() {
  try {
    const rows = await getDocuments("salary_advances");
    rows.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return ok(rows);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = await createDocument("salary_advances", body);

    // If advance is disbursed/valid, create double-entry journal entries: Debit Advance (1130), Credit Cash in Hand (1111)
    if (row && row.status !== "Cancelled" && row.status !== "cancelled" && row.status !== "Rejected") {
      const amt = Number(row.amount) || 0;
      if (amt > 0) {
        const voucherNo = row.voucherNo || `ADV-${row._id}`;
        const date = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
        const remarks = `Salary Advance to ${row.employee || "Staff"}${row.deductionMonth ? ` (Recovery: ${row.deductionMonth})` : ""}`;

        await createDocument("journal_entries", {
          date,
          voucherNo,
          accountCode: "1130",
          accountTitle: "Salary Advance",
          debit: amt,
          credit: 0,
          remarks
        });

        await createDocument("journal_entries", {
          date,
          voucherNo,
          accountCode: "1111",
          accountTitle: "Cash in Hand",
          debit: 0,
          credit: amt,
          remarks
        });
      }
    }

    return ok(row, 201);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export const dynamic = "force-dynamic";
