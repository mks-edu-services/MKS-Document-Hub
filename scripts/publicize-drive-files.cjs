const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const repoRoot = path.resolve(__dirname, "..");
const defaultServiceAccountPath = path.join(
  repoRoot,
  "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json",
);
const projectId = process.env.FIREBASE_PROJECT_ID || "mks-certificate-app-cbf64";
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
  defaultServiceAccountPath;
const collectionId = process.env.FIRESTORE_COLLECTION || "documents";
const limit = Number(process.env.LIMIT || "0") || null;
const dryRun =
  process.argv.includes("--dry-run") ||
  process.env.DRY_RUN === "1" ||
  process.env.DRY_RUN === "true";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

async function main() {
  const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, "utf8"));
  const firestoreToken = await mintToken(serviceAccount, FIRESTORE_SCOPE);
  const driveToken = await mintToken(serviceAccount, DRIVE_SCOPE);
  const documents = await fetchCollectionDocuments(firestoreToken, collectionId);

  const fileIds = new Map();
  for (const doc of documents) {
    collectFileId(fileIds, doc.driveFileId);
    collectFileId(fileIds, doc.scanFileId);
    collectFileId(fileIds, doc.driveFileUrl);
    collectFileId(fileIds, doc.scanFileUrl);
    collectFileId(fileIds, doc.scanPreviewUrl);
    if (limit && fileIds.size >= limit) break;
  }

  const ids = [...fileIds.values()];
  console.log(`Found ${ids.length} unique Drive file IDs from ${documents.length} Firestore documents.`);
  if (dryRun) {
    ids.forEach((id) => console.log(id));
    console.log("Dry run complete. No permissions changed.");
    return;
  }

  let granted = 0;
  let skipped = 0;
  for (const fileId of ids) {
    try {
      const changed = await makePublic(driveToken, fileId);
      if (changed) {
        granted += 1;
        console.log(`public: ${fileId}`);
      } else {
        skipped += 1;
        console.log(`already-public-or-shared: ${fileId}`);
      }
    } catch (error) {
      console.error(`failed: ${fileId} — ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("");
  console.log(`Completed. granted=${granted}, skipped=${skipped}, total=${ids.length}`);
}

function collectFileId(map, value) {
  const fileId = extractDriveFileId(value);
  if (!fileId || map.has(fileId)) return;
  map.set(fileId, fileId);
}

function extractDriveFileId(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /\/document\/d\/([a-zA-Z0-9_-]+)/i,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(input) && !input.includes(" ")) {
    return input;
  }

  return "";
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(privateKey, payload) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${encodedHeader}.${encodedPayload}.${base64Url(signature)}`;
}

async function mintToken(serviceAccount, scope) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(serviceAccount.private_key, {
    iss: serviceAccount.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mint access token (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchCollectionDocuments(accessToken, collectionName) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`,
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to list ${collectionName}: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    for (const doc of payload.documents ?? []) {
      const id = doc.name.split("/").pop();
      const fields = {};
      for (const [key, value] of Object.entries(doc.fields ?? {})) {
        fields[key] = decodeFirestoreValue(value);
      }
      documents.push({ id, ...fields });
    }
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return documents;
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue ?? "";
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map((entry) => decodeFirestoreValue(entry));
  }
  if ("mapValue" in value) {
    const result = {};
    for (const [key, nested] of Object.entries(value.mapValue?.fields ?? {})) {
      result[key] = decodeFirestoreValue(nested);
    }
    return result;
  }
  return null;
}

async function makePublic(accessToken, fileId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      }),
    },
  );

  if (response.ok) return true;

  const text = await response.text();
  if (response.status === 409 || response.status === 400) {
    const lowered = text.toLowerCase();
    if (lowered.includes("already") || lowered.includes("permission")) {
      return false;
    }
  }

  throw new Error(`Drive permission update failed (${response.status}): ${text}`);
}
