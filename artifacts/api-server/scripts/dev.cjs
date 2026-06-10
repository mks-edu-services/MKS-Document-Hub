const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const env = { ...process.env, NODE_ENV: "development" };
const pnpmExecPath = process.env.npm_execpath;

function spawnPnpm(args, options) {
  if (pnpmExecPath) {
    return spawn(process.execPath, [pnpmExecPath, ...args], options);
  }

  return spawn("pnpm", args, options);
}

function runBuildThenStart() {
  const build = spawnPnpm(["run", "build"], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });

  build.on("exit", (code) => {
    if (code !== 0) {
      process.exit(code ?? 1);
      return;
    }

    const start = spawnPnpm(["run", "start"], {
      cwd: projectRoot,
      env,
      stdio: "inherit",
    });

    start.on("exit", (startCode, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exit(startCode ?? 0);
    });
  });
}

runBuildThenStart();
