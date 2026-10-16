import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, copyFileSync } from "node:fs";
// Keep the self-contained module worker untouched by Babel. Next exports public assets.
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
copyFileSync(
  new URL("../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url),
  new URL("../public/maplibre-gl-worker.mjs", import.meta.url),
);
copyFileSync(
  new URL("../node_modules/maplibre-gl/LICENSE.txt", import.meta.url),
  new URL("../public/maplibre-license.txt", import.meta.url),
);
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
