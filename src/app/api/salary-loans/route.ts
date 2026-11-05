import { fail, ok } from "@/lib/api";
import { getDocuments, createDocument } from "@/lib/firestore/genericRepository";

export async function GET() {
  try {
    const rows = await getDocuments("salary_loans");
    rows.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return ok(rows);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const row = await createDocument("salary_loans", body);

    // If loan is approved/disbursed, create double-entry journal entries: Debit Loan (1140), Credit Cash in Hand (1111)
    if (row && row.status !== "Cancelled" && row.status !== "cancelled" && row.status !== "Rejected") {
      const amt = Number(row.amount) || 0;
      if (amt > 0) {
        const voucherNo = row.voucherNo || `LOAN-${row._id}`;
        const date = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
        const remarks = `Salary Loan to ${row.employee || "Staff"}${row.installments ? ` (${row.installments} Installments)` : ""}`;

        await createDocument("journal_entries", {
          date,
          voucherNo,
          accountCode: "1140",
          accountTitle: "Employee Loan",
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
