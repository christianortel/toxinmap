import path from "node:path";
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFilePath), "..", "..");

function resolveWithExistingExtension(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? basePath;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolvedPath = resolveWithExistingExtension(
      path.resolve(projectRoot, "src", specifier.slice(2)),
    );
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }

  const isRelativeFileSpecifier =
    (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) &&
    !path.extname(specifier);
  if (isRelativeFileSpecifier && context.parentURL?.startsWith("file:")) {
    const parentFilePath = fileURLToPath(context.parentURL);
    const resolvedPath = resolveWithExistingExtension(
      path.resolve(path.dirname(parentFilePath), specifier),
    );
    return nextResolve(pathToFileURL(resolvedPath).href, context);
  }

  return nextResolve(specifier, context);
}
