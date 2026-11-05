import { fail, ok } from "@/lib/api";
import { getDocumentById, updateDocument, deleteDocument, createDocument } from "@/lib/firestore/genericRepository";
import { deleteJournalEntriesByVoucherNo } from "@/services/posting/invoicePostingHelper";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const existing = await getDocumentById("salary_loans", params.id);
    const row = await updateDocument("salary_loans", params.id, body);
    if (!row) return fail("Not found", 404);

    // Sync journal entries
    const oldVoucherNo = existing?.voucherNo || `LOAN-${params.id}`;
    const newVoucherNo = row.voucherNo || oldVoucherNo;
    await deleteJournalEntriesByVoucherNo(oldVoucherNo);
    if (newVoucherNo !== oldVoucherNo) {
      await deleteJournalEntriesByVoucherNo(newVoucherNo);
    }

    if (row.status !== "Cancelled" && row.status !== "cancelled" && row.status !== "Rejected") {
      const amt = Number(row.amount) || 0;
      if (amt > 0) {
        const date = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
        const remarks = `Salary Loan to ${row.employee || "Staff"}${row.installments ? ` (${row.installments} Installments)` : ""}`;

        await createDocument("journal_entries", {
          date,
          voucherNo: newVoucherNo,
          accountCode: "1140",
          accountTitle: "Employee Loan",
          debit: amt,
          credit: 0,
          remarks
        });

        await createDocument("journal_entries", {
          date,
          voucherNo: newVoucherNo,
          accountCode: "1111",
          accountTitle: "Cash in Hand",
          debit: 0,
          credit: amt,
          remarks
        });
      }
    }

    return ok(row);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getDocumentById("salary_loans", params.id);
    if (existing?.voucherNo) {
      await deleteJournalEntriesByVoucherNo(existing.voucherNo);
    }
    await deleteJournalEntriesByVoucherNo(`LOAN-${params.id}`);
    await deleteDocument("salary_loans", params.id);
    return ok({ deleted: true });
  } catch (e) {
    return fail((e as Error).message);
  }
}
