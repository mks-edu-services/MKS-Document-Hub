const fs = require("fs");

const userAgent = process.env.npm_config_user_agent || "";

fs.rmSync("package-lock.json", { force: true });
fs.rmSync("yarn.lock", { force: true });

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
