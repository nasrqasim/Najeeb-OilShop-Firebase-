import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_PROJECT_ID = "al-hadeed-traders";
const keyPath = path.join(__dirname, '..', '..', '..', 'al-hadeed-traders-firebase-adminsdk-fbsvc-3ea10d6b23.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

const SOURCE_BACKUP_DIR = path.join(__dirname, '..', '..', '..', 'AL_HADEED_TRADERS_COMPLETE_BACKUP', 'collections');
const PRE_BACKUP_DIR = path.join(__dirname, 'backups', 'pre_migration_test_data');

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  let now = Math.floor(Date.now() / 1000);
  try {
    const timeRes = await fetch("https://www.google.com");
    const serverDateHeader = timeRes.headers.get("date");
    if (serverDateHeader) {
      now = Math.floor(new Date(serverDateHeader).getTime() / 1000);
    }
  } catch (e) {
    // fallback to local time
  }

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
  if (!data.access_token) {
    throw new Error("Failed to obtain OAuth access token: " + JSON.stringify(data));
  }
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 3000 * 1000;
  return cachedToken;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: "NULL_VALUE" };

  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return { timestampValue: new Date(val).toISOString() };
    }
    return { stringValue: val };
  }

  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }

  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }

  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }

  if (typeof val === 'object') {
    if (val.$oid && typeof val.$oid === 'string') {
      return { stringValue: val.$oid };
    }
    if (val.$date) {
      let d;
      if (typeof val.$date === 'string' || typeof val.$date === 'number') {
        d = new Date(val.$date);
      } else if (val.$date.$numberLong) {
        d = new Date(Number(val.$date.$numberLong));
      }
      if (d && !isNaN(d.getTime())) {
        return { timestampValue: d.toISOString() };
      }
    }
    if (val.$numberDecimal !== undefined) return { doubleValue: Number(val.$numberDecimal) };
    if (val.$numberLong !== undefined) return { integerValue: String(val.$numberLong) };
    if (val.$numberInt !== undefined) return { integerValue: String(val.$numberInt) };

    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map(toFirestoreValue)
        }
      };
    }

    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === '_id') continue;
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }

  return { stringValue: String(val) };
}

function getDocumentId(doc) {
  if (!doc) return null;
  let rawId = doc._id;
  if (rawId === undefined || rawId === null) return null;
  if (typeof rawId === 'object' && rawId.$oid) return String(rawId.$oid);
  if (typeof rawId === 'object' && rawId.toString) return String(rawId.toString());
  return String(rawId);
}

// 1. Export current Firestore data as a safeguard
async function backupCurrentFirestoreData() {
  console.log("\n--- [STEP 1] Safeguard: Backing up existing destination Firestore data ---");
  if (!fs.existsSync(PRE_BACKUP_DIR)) {
    fs.mkdirSync(PRE_BACKUP_DIR, { recursive: true });
  }

  const token = await getAccessToken();
  const listColUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:listCollectionIds`;
  const colRes = await fetch(listColUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageSize: 100 })
  });
  const colData = await colRes.json();
  const collections = colData.collectionIds || [];

  for (const colName of collections) {
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

    fs.writeFileSync(path.join(PRE_BACKUP_DIR, `${colName}.json`), JSON.stringify(docs, null, 2));
    console.log(`  Backed up [${colName}]: ${docs.length} docs`);
  }
  console.log(" Safeguard backup complete in:", PRE_BACKUP_DIR);
}

// 2. Safe Purge of Target Collections (make 0 existing test data)
async function purgeCollections(collectionNames) {
  console.log("\n--- [STEP 2] Purging existing test records across target collections (Make 0) ---");
  const token = await getAccessToken();
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:commit`;

  for (const colName of collectionNames) {
    let docPaths = [];
    let pageToken = null;
    do {
      let url = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${colName}?pageSize=300`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.documents) {
        for (const doc of data.documents) {
          // If it's users collection, do not purge superadmin if we want to retain auth
          if (colName === 'users') {
            const docId = doc.name.split('/').pop();
            const email = doc.fields?.email?.stringValue || '';
            const username = doc.fields?.username?.stringValue || '';
            if (docId === 'superadmin' || email === 'superadmin@erp.com' || username === 'superadmin') {
              continue; // keep active superadmin
            }
          }
          docPaths.push(doc.name);
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (docPaths.length === 0) {
      console.log(`  [${colName}] already 0 documents.`);
      continue;
    }

    console.log(`  Deleting ${docPaths.length} test docs in [${colName}]...`);
    const batchSize = 250;
    for (let i = 0; i < docPaths.length; i += batchSize) {
      const slice = docPaths.slice(i, i + batchSize);
      const writes = slice.map(name => ({ delete: name }));
      const commitRes = await fetch(commitUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes })
      });
      if (!commitRes.ok) {
        const errText = await commitRes.text();
        console.error(`  Error deleting in [${colName}]:`, errText);
      }
    }
    console.log(`  Purged [${colName}].`);
  }
}

// 3. Dependency-ordered import of all source collections
const MIGRATION_ORDER = [
  // Stage A: System & Master Configurations
  "shopprofiles.json",
  "documentsettings.json",
  "financialyears.json",
  "inventorysettings.json",
  "printformats.json",
  "units.json",
  "categories.json",
  "accounts.json",
  "banks.json",
  "employees.json",
  
  // Stage B: Master Catalogs
  "parties.json",
  "items.json",
  "users.json",

  // Stage C: Opening Balances
  "openingbalances.json",

  // Stage D & E: Transactions
  "invoices.json",
  "cashreceipts.json",
  "cashpayments.json",
  "otherincomes.json",
  "salaryadvances.json",
  "payrolls.json",
  "messagelogs.json",

  // Stage G: GL Ledgers
  "journalentries.json"
];

async function importAllHistoricalData() {
  console.log("\n--- [STEP 3] Executing Full Forensic Data Migration (10,467 Records) ---");
  const token = await getAccessToken();
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents:commit`;

  let totalMigrated = 0;

  for (const fileName of MIGRATION_ORDER) {
    const colName = fileName.replace('.json', '');
    const filePath = path.join(SOURCE_BACKUP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`  [MISSING] Backup file not found: ${filePath}`);
      continue;
    }

    const docsList = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n>>> Importing [${colName}] (${docsList.length} records)...`);

    if (docsList.length === 0) continue;

    const batchSize = 250;
    for (let i = 0; i < docsList.length; i += batchSize) {
      const slice = docsList.slice(i, i + batchSize);
      const writes = [];

      for (const rawDoc of slice) {
        const docId = getDocumentId(rawDoc);
        if (!docId) {
          console.error(`  Missing _id in [${colName}]`);
          continue;
        }

        const docPath = `projects/${EXPECTED_PROJECT_ID}/databases/(default)/documents/${colName}/${docId}`;
        const fields = {};

        for (const [k, v] of Object.entries(rawDoc)) {
          if (k === '_id') continue;
          fields[k] = toFirestoreValue(v);
        }

        writes.push({
          update: {
            name: docPath,
            fields
          }
        });
      }

      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        attempts++;
        try {
          const res = await fetch(commitUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${await getAccessToken()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ writes })
          });

          if (res.ok) {
            success = true;
          } else {
            const err = await res.text();
            console.error(`  Commit failed (attempt ${attempts}):`, err.slice(0, 200));
            await new Promise(r => setTimeout(r, 2000 * attempts));
          }
        } catch (e) {
          console.error(`  Fetch exception (attempt ${attempts}):`, e.message);
          await new Promise(r => setTimeout(r, 2000 * attempts));
        }
      }

      if (success) {
        totalMigrated += writes.length;
        process.stdout.write(`  [${colName}] Uploaded ${Math.min(i + batchSize, docsList.length)}/${docsList.length} records\r`);
      } else {
        throw new Error(`Fatal failure migrating chunk in ${colName}`);
      }
    }
    console.log(`\n  [OK] Completed [${colName}]: ${docsList.length} documents.`);
  }

  console.log(`\n=== TOTAL DOCUMENTS WRITTEN TO FIRESTORE: ${totalMigrated} ===`);
}

async function main() {
  const targetCollections = MIGRATION_ORDER.map(f => f.replace('.json', ''));
  
  await backupCurrentFirestoreData();
  await purgeCollections(targetCollections);
  await importAllHistoricalData();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
