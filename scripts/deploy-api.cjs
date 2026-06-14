const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const apiServerDir = path.join(workspaceRoot, "artifacts", "api-server");
const credentialsPath = path.join(
  workspaceRoot,
  "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json",
);
const gcloudCommand = process.platform === "win32" ? "gcloud.cmd" : "gcloud";

const projectId =
  process.env.GCLOUD_PROJECT || "mks-certificate-app-cbf64";
const region = process.env.GCLOUD_REGION || "us-central1";
const functionName = process.env.GCLOUD_FUNCTION_NAME || "mksDocumentHubApi";
const pnpmExecPath = process.env.npm_execpath;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const resolvedCommand =
      command === "pnpm" && pnpmExecPath ? process.execPath : command;
    const resolvedArgs =
      command === "pnpm" && pnpmExecPath ? [pnpmExecPath, ...args] : args;

    const child = spawn(resolvedCommand, resolvedArgs, {
      cwd: options.cwd ?? workspaceRoot,
      env: options.env ?? process.env,
      shell: process.platform === "win32" && resolvedCommand === gcloudCommand,
      stdio: options.stdio ?? "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve("");
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with ${code ?? signal ?? "unknown"}`,
        ),
      );
    });
  });
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const resolvedCommand =
      command === "pnpm" && pnpmExecPath ? process.execPath : command;
    const resolvedArgs =
      command === "pnpm" && pnpmExecPath ? [pnpmExecPath, ...args] : args;

    const child = spawn(resolvedCommand, resolvedArgs, {
      cwd: options.cwd ?? workspaceRoot,
      env: options.env ?? process.env,
      shell: process.platform === "win32" && resolvedCommand === gcloudCommand,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with ${code}\n${stderr.trim()}`,
        ),
      );
    });
  });
}

async function buildApiServer() {
  await run("pnpm", ["--filter", "@workspace/api-server", "build"]);
}

async function createDeployBundle() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mks-api-"));
  const bundleDir = path.join(tempRoot, "bundle");
  await fs.mkdir(bundleDir, { recursive: true });
  await fs.cp(path.join(apiServerDir, "dist"), path.join(bundleDir, "dist"), {
    recursive: true,
  });

  const packageJson = JSON.parse(
    await fs.readFile(path.join(apiServerDir, "package.json"), "utf8"),
  );
  packageJson.main = "./dist/functions.mjs";
  await fs.writeFile(
    path.join(bundleDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  await fs.copyFile(credentialsPath, path.join(bundleDir, "credentials.json"));

  return { tempRoot, bundleDir };
}

async function readBackendUrl() {
  return runCapture(gcloudCommand, [
    "functions",
    "describe",
    functionName,
    `--project=${projectId}`,
    `--region=${region}`,
    "--format=value(httpsTrigger.url)",
  ]);
}

async function main() {
  if (!(await fs.stat(credentialsPath).catch(() => null))) {
    throw new Error(
      `Missing Drive service account file: ${credentialsPath}`,
    );
  }

  await buildApiServer();
  const { tempRoot, bundleDir } = await createDeployBundle();

  try {
    await run(gcloudCommand, [
      "functions",
      "deploy",
      functionName,
      `--project=${projectId}`,
      `--region=${region}`,
      "--runtime=nodejs20",
      "--trigger-http",
      "--allow-unauthenticated",
      "--entry-point=api",
      "--source",
      bundleDir,
      "--set-env-vars",
      "GOOGLE_APPLICATION_CREDENTIALS=/workspace/credentials.json",
      "--no-gen2",
      "--quiet",
    ]);
    const backendUrl = await readBackendUrl();
    if (!backendUrl) {
      throw new Error("Cloud Function deployed, but no HTTPS URL was returned.");
    }

    const apiBaseUrl = `${backendUrl.replace(/\/+$/, "")}/api`;
    console.log("");
    console.log(`Backend URL: ${backendUrl}`);
    console.log(`API base URL: ${apiBaseUrl}`);
    console.log("");

    await run("pnpm", [
      "run",
      "deploy:web",
      "--",
      `--api-base=${apiBaseUrl}`,
    ]);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
