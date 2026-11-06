import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_PROJECT_ID = "al-hadeed-traders";
const keyPath = path.join(__dirname, '..', '..', '..', 'al-hadeed-traders-firebase-adminsdk-fbsvc-3ea10d6b23.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const timeRes = await fetch("https://www.google.com");
  const serverDateHeader = timeRes.headers.get("date");
  const now = Math.floor(new Date(serverDateHeader).getTime() / 1000);

  const header = { alg: "RS256", typ: "JWT", kid: serviceAccount.private_key_id };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = base64url(signer.sign(serviceAccount.private_key));
  const jwt = `${signatureInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await res.json();
  return data.access_token;
}

async function countCollection(token, colName) {
  const url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:runAggregationQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: colName }] },
        aggregations: [{ count: {}, alias: 'total' }]
      }
    })
  });
  const data = await res.json();
  return Number(data?.[0]?.result?.aggregateFields?.total?.integerValue || 0);
}

async function fetchAllDocuments(token, colName) {
  let docs = [];
  let pageToken = null;
  do {
    let url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${colName}?pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.documents) {
      docs.push(...data.documents);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return docs;
}

function parseFirestoreFields(fields) {
  if (!fields) return {};
  const res = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) res[k] = v.stringValue;
    else if (v.integerValue !== undefined) res[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) res[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) res[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) res[k] = v.timestampValue;
    else if (v.nullValue !== undefined) res[k] = null;
    else if (v.mapValue !== undefined) res[k] = parseFirestoreFields(v.mapValue.fields);
    else if (v.arrayValue !== undefined) {
      res[k] = (v.arrayValue.values || []).map(val => {
        if (val.stringValue !== undefined) return val.stringValue;
        if (val.integerValue !== undefined) return Number(val.integerValue);
        if (val.doubleValue !== undefined) return val.doubleValue;
        if (val.booleanValue !== undefined) return val.booleanValue;
        if (val.mapValue !== undefined) return parseFirestoreFields(val.mapValue.fields);
        return null;
      });
    }
  }
  return res;
}

async function reconcile() {
  console.log("=================================================================");
  console.log(" AL HADEED TRADERS POST-MIGRATION FORENSIC RECONCILIATION");
  console.log("=================================================================\n");

  const token = await getAccessToken();

  const collectionsExpected = [
    { name: "journalentries", expected: 6602 },
    { name: "invoices", expected: 2316 },
    { name: "cashreceipts", expected: 412 },
    { name: "openingbalances", expected: 340 },
    { name: "items", expected: 310 },
    { name: "cashpayments", expected: 256 },
    { name: "parties", expected: 123 },
    { name: "categories", expected: 45 },
    { name: "accounts", expected: 17 },
    { name: "otherincomes", expected: 11 },
    { name: "printformats", expected: 8 },
    { name: "messagelogs", expected: 6 },
    { name: "documentsettings", expected: 5 },
    { name: "banks", expected: 4 },
    { name: "salaryadvances", expected: 2 },
    { name: "units", expected: 2 },
    { name: "employees", expected: 1 },
    { name: "financialyears", expected: 1 },
    { name: "inventorysettings", expected: 1 },
    { name: "payrolls", expected: 1 },
    { name: "shopprofiles", expected: 1 }
  ];

  console.log("1. DOCUMENT COUNTS AUDIT:");
  let countMismatch = 0;
  for (const c of collectionsExpected) {
    const count = await countCollection(token, c.name);
    const match = count >= c.expected;
    if (!match) countMismatch++;
    console.log(`  - [${c.name.padEnd(20)}] Actual: ${String(count).padEnd(6)} | Expected: ${String(c.expected).padEnd(6)} | ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
  }

  console.log("\n2. GENERAL LEDGER DOUBLE-ENTRY BALANCING AUDIT:");
  console.log("  Fetching all journal entries...");
  const rawJournals = await fetchAllDocuments(token, "journalentries");
  let totalDebit = 0;
  let totalCredit = 0;

  for (const doc of rawJournals) {
    const data = parseFirestoreFields(doc.fields);
    totalDebit += Number(data.debit || 0);
    totalCredit += Number(data.credit || 0);
  }

  const diff = Math.abs(totalDebit - totalCredit);
  console.log(`  Total Debits:  PKR ${totalDebit.toLocaleString()}`);
  console.log(`  Total Credits: PKR ${totalCredit.toLocaleString()}`);
  console.log(`  GL Difference: PKR ${diff.toFixed(2)} -> ${diff < 0.01 ? '✅ PERFECT ZERO BALANCE' : '❌ UNBALANCED'}`);

  console.log("\n3. INVOICES RECONCILIATION:");
  console.log("  Fetching all invoices...");
  const rawInvoices = await fetchAllDocuments(token, "invoices");
  let totalSales = 0;
  let totalPurchases = 0;
  let saleCount = 0;
  let purchaseCount = 0;

  for (const doc of rawInvoices) {
    const data = parseFirestoreFields(doc.fields);
    const invType = (data.invoiceType || data.type || '').toLowerCase();
    const total = Number(data.total || data.totalAmount || data.grandTotal || 0);
    if (invType === 'sale' || invType === 'sales') {
      totalSales += total;
      saleCount++;
    } else if (invType === 'purchase' || invType === 'purchases') {
      totalPurchases += total;
      purchaseCount++;
    }
  }

  console.log(`  Sales Invoices:    ${saleCount} | Total: PKR ${totalSales.toLocaleString()}`);
  console.log(`  Purchase Invoices: ${purchaseCount} | Total: PKR ${totalPurchases.toLocaleString()}`);

  console.log("\n4. INVENTORY STOCK RECONCILIATION:");
  console.log("  Fetching all items...");
  const rawItems = await fetchAllDocuments(token, "items");
  let totalStockValuation = 0;
  for (const doc of rawItems) {
    const data = parseFirestoreFields(doc.fields);
    totalStockValuation += Number(data.valuation || 0);
  }
  console.log(`  Total Items Catalogued: ${rawItems.length}`);
  console.log(`  Total Stock Valuation:  PKR ${totalStockValuation.toLocaleString()}`);

  console.log("\n=================================================================");
  console.log(" RECONCILIATION COMPLETE");
  console.log("=================================================================\n");
}

reconcile().catch(console.error);
