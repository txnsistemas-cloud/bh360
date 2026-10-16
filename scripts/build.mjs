import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const compatibility = fileURLToPath(
  new URL("./windows-realpath.cjs", import.meta.url),
);
const next = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const options =
  process.platform === "win32"
    ? `${process.env.NODE_OPTIONS ?? ""} --require=${JSON.stringify(compatibility)}`
    : process.env.NODE_OPTIONS;
const args = process.argv.includes("--dev")
  ? [next, "dev", "--webpack", "--hostname", "127.0.0.1"]
  : [next, "build", "--webpack"];
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, ...(options ? { NODE_OPTIONS: options } : {}) },
});
process.exit(result.status ?? 1);
