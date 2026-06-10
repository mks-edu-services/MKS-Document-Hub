const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const env = { ...process.env };
const pnpmExecPath = process.env.npm_execpath;

function spawnPnpm(args, options) {
  if (pnpmExecPath) {
    return spawn(process.execPath, [pnpmExecPath, ...args], options);
  }

  return spawn("pnpm", args, options);
}

env.EXPO_PUBLIC_DOMAIN = env.EXPO_PUBLIC_DOMAIN || "mksedudoc.web.app";

if (env.REPL_ID) {
  env.EXPO_PUBLIC_REPL_ID = env.EXPO_PUBLIC_REPL_ID || env.REPL_ID;
}

const child = spawnPnpm(["exec", "expo", "export", "--platform", "web"], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
