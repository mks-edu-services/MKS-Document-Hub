const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawn } = require("node:child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const appDir = path.join(workspaceRoot, "artifacts", "mks-app");
const distDir = path.join(appDir, "dist");
const firebaseJsonPath = path.join(workspaceRoot, "firebase.json");
const siteId = process.env.FIREBASE_HOSTING_SITE || "mksedudoc";
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(workspaceRoot, "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json");
const apiBaseArg = process.argv.find((value) => value.startsWith("--api-base="));
const apiBaseUrl = apiBaseArg ? apiBaseArg.split("=", 2)[1] : process.env.EXPO_PUBLIC_API_BASE_URL;

function spawnNodeCommand(args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: node ${args.join(" ")} (exit ${code})`));
    });
  });
}

function spawnPythonCommand(args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.env.PYTHON || process.env.PYTHON_EXECUTABLE || "python";
    const child = spawn(pythonExecutable, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${pythonExecutable} ${args.join(" ")} (exit ${code})`));
    });
  });
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

async function loadServiceAccount() {
  const raw = await fs.readFile(serviceAccountPath, "utf8");
  return JSON.parse(raw);
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(serviceAccount.private_key, {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.hosting",
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
    throw new Error(`Failed to mint access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function runExpoExport() {
  await spawnNodeCommand(
    [path.join(appDir, "scripts", "export-web.js")],
    appDir,
    {
      EXPO_PUBLIC_DOMAIN: "mksedudoc.web.app",
      ...(apiBaseUrl ? { EXPO_PUBLIC_API_BASE_URL: apiBaseUrl } : {}),
    },
  );
}

function transformHostingConfig(firebaseJson) {
  const hosting = Array.isArray(firebaseJson.hosting) ? firebaseJson.hosting[0] : firebaseJson.hosting;
  if (!hosting) {
    throw new Error("firebase.json is missing a hosting configuration.");
  }

  const config = {};
  if (Array.isArray(hosting.headers)) {
    config.headers = hosting.headers.map((entry) => ({
      glob: entry.source,
      headers: Object.fromEntries((entry.headers ?? []).map((header) => [header.key, header.value])),
    }));
  }
  if (Array.isArray(hosting.redirects)) {
    config.redirects = hosting.redirects.map((entry) => ({
      glob: entry.source,
      statusCode: entry.type === "temporary" ? 302 : entry.type === "permanent" ? 301 : entry.statusCode,
      location: entry.destination,
    }));
  }
  if (Array.isArray(hosting.rewrites)) {
    config.rewrites = hosting.rewrites.map((entry) => ({
      glob: entry.source,
      path: entry.destination,
    }));
  }
  if (typeof hosting.cleanUrls === "boolean") {
    config.cleanUrls = hosting.cleanUrls;
  }
  if (typeof hosting.trailingSlash === "string") {
    config.trailingSlashBehavior = hosting.trailingSlash === "REMOVE" ? "REMOVE" : "ADD";
  }
  return config;
}

async function readFirebaseConfig() {
  const raw = await fs.readFile(firebaseJsonPath, "utf8");
  return JSON.parse(raw);
}

async function firebaseRequest(accessToken, method, url, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function uploadFile(accessToken, uploadUrl, fileHash, contents) {
  const response = await fetch(`${uploadUrl}/${fileHash}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: contents,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${fileHash}: ${response.status} ${await response.text()}`);
  }
}

function collectFiles(rootDir, currentDir = rootDir) {
  const entries = [];
  return fs.readdir(currentDir, { withFileTypes: true }).then(async (dirents) => {
    for (const entry of dirents) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        const nested = await collectFiles(rootDir, fullPath);
        entries.push(...nested);
      } else if (entry.isFile()) {
        const relative = `/${path.relative(rootDir, fullPath).replace(/\\/g, "/")}`;
        const raw = await fs.readFile(fullPath);
        const gzipped = zlib.gzipSync(raw);
        const hash = crypto.createHash("sha256").update(gzipped).digest("hex");
        entries.push({ relative, fullPath, raw, gzipped, hash });
      }
    }
    return entries;
  });
}

async function deployHosting() {
  const serviceAccount = await loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(serviceAccount.private_key, {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.hosting",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  await spawnPythonCommand(
    [path.join(workspaceRoot, "scripts", "firebase-hosting-deploy.py")],
    workspaceRoot,
    {
      FIREBASE_ASSERTION: assertion,
      FIREBASE_SITE_ID: siteId,
      FIREBASE_CONFIG_PATH: firebaseJsonPath,
      DEPLOY_DIST_DIR: distDir,
    },
  );
}

async function main() {
  console.log("Step 1/2: Building web app...");
  await runExpoExport();

  console.log("Step 2/2: Deploying to Firebase Hosting via REST API...");
  await deployHosting();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
