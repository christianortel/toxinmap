import fs from "node:fs";
import path from "node:path";

let didLoadLocalEnv = false;

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/u)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    if (!process.env[parsed.key]) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function resolveProjectRoot() {
  return process.cwd();
}

export function loadLocalEnv() {
  if (didLoadLocalEnv) {
    return;
  }

  const projectRoot = resolveProjectRoot();
  const envCandidates = [
    path.join(projectRoot, ".env.local"),
    path.join(projectRoot, ".env"),
    path.join(projectRoot, ".env.example"),
  ];

  for (const candidate of envCandidates) {
    loadEnvFile(candidate);
  }

  didLoadLocalEnv = true;
}
