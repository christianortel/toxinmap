import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [, , scriptPath, ...scriptArgs] = process.argv;

if (!scriptPath) {
  console.error("Usage: node scripts/local/run-ts.mjs <script.ts> [...args]");
  process.exit(1);
}

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const absoluteScriptPath = path.resolve(projectRoot, scriptPath);
const registerLoaderPath = path.resolve(path.dirname(currentFilePath), "register-ts-path-loader.mjs");

const child = spawn(
  process.execPath,
  [
    "--experimental-strip-types",
    "--import",
    pathToFileURL(registerLoaderPath).href,
    absoluteScriptPath,
    ...scriptArgs,
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
    shell: false,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`TypeScript runner terminated by signal ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
