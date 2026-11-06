import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keyPath = path.join(__dirname, '..', '..', '..', 'al-hadeed-traders-firebase-adminsdk-fbsvc-3ea10d6b23.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const timeRes = await fetch('https://www.google.com');
  const now = Math.floor(new Date(timeRes.headers.get('date')).getTime() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const input = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claimSet));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(input);
  const sig = base64url(signer.sign(serviceAccount.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: input + '.' + sig
    })
  });
  return (await res.json()).access_token;
}

async function run() {
  const token = await getAccessToken();
  const rootUrl = 'https://firestore.googleapis.com/v1/projects/al-hadeed-traders/databases/(default)/documents';
  const res = await fetch(rootUrl + ':listCollectionIds', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageSize: 100 })
  });
  const data = await res.json();
  console.log('Collections in Firestore:', data.collectionIds);

  const collections = data.collectionIds || [];
  for (const colId of collections) {
    // Run count query
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/al-hadeed-traders/databases/(default)/documents:runAggregationQuery`;
    const countRes = await fetch(runQueryUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: {
            from: [{ collectionId: colId }]
          },
          aggregations: [{ count: {}, alias: 'total' }]
        }
      })
    });
    const countData = await countRes.json();
    const count = countData?.[0]?.result?.aggregateFields?.total?.integerValue || 0;
    console.log(`- ${colId.padEnd(25)} : ${count} docs`);
  }
}

run().catch(console.error);
