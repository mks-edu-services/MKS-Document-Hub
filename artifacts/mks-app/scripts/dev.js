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

if (env.REPLIT_EXPO_DEV_DOMAIN) {
  env.EXPO_PACKAGER_PROXY_URL = `https://${env.REPLIT_EXPO_DEV_DOMAIN}`;
}

if (env.REPLIT_DEV_DOMAIN) {
  env.EXPO_PUBLIC_DOMAIN = env.EXPO_PUBLIC_DOMAIN || env.REPLIT_DEV_DOMAIN;
  env.REACT_NATIVE_PACKAGER_HOSTNAME =
    env.REACT_NATIVE_PACKAGER_HOSTNAME || env.REPLIT_DEV_DOMAIN;
}

if (env.REPL_ID) {
  env.EXPO_PUBLIC_REPL_ID = env.EXPO_PUBLIC_REPL_ID || env.REPL_ID;
}

const port = env.PORT || "8081";

const child = spawnPnpm(["exec", "expo", "start", "--localhost", "--port", port], {
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
