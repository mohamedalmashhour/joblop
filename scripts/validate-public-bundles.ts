import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, relative, resolve } from "node:path";
import { findPublicCredentialLeaks } from "./public-bundle-policy";
import { validateEnvironmentInventory } from "./environment-classification";

const root = resolve(import.meta.dirname, "..");
const buildRoots = [
  "apps/mobile/dist",
  "apps/employer/.next/static",
  "apps/admin/.next/static"
].filter((path) => existsSync(resolve(root, path)));
const publicManifestFiles = filesFromRg(["apps/employer/.next", "apps/admin/.next"]).filter(
  (path) =>
    /(?:^|\/)(?:BUILD_ID|[^/]*manifest[^/]*)\.(?:json|js)$/.test(path) &&
    !path.includes("/.next/server/")
);
const sourceFiles = [
  ...filesFromRg(["apps/mobile", "apps/employer", "apps/admin"]),
  ...filesFromRg(buildRoots),
  ...publicManifestFiles
];
const inventoryFiles = [...filesFromRg(["apps", "packages", "scripts"]), ".env.example"].filter(
  (path) =>
    existsSync(resolve(root, path)) &&
    !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path) &&
    !path.includes("/dist/") &&
    !path.includes("/.next/")
);
const allowedExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".map",
  ".css",
  ".svg",
  ".txt",
  ".xml",
  ".webmanifest"
]);
const artifacts = sourceFiles.flatMap((path) => {
  const absolute = resolve(root, path);
  if (!allowedExtensions.has(extname(path)) || statSync(absolute).size > 5_000_000) return [];
  return [{ path, content: readFileSync(absolute, "utf8") }];
});
const issues = findPublicCredentialLeaks(artifacts);
const environmentInventory = validateEnvironmentInventory(
  inventoryFiles
    .filter((path) => !path.includes("/dist/") && !path.includes("/.next/"))
    .flatMap((path) => {
      const absolute = resolve(root, path);
      if (!allowedExtensions.has(extname(path)) && !path.endsWith(".env.example")) return [];
      if (statSync(absolute).size > 5_000_000) return [];
      return [{ path, content: readFileSync(absolute, "utf8") }];
    })
);
issues.push(...environmentInventory.issues);
if (issues.length) {
  for (const issue of issues) process.stderr.write(`PUBLIC_BUNDLE_POLICY_ERROR: ${issue}\n`);
  process.exit(1);
}
process.stdout.write(
  `PUBLIC_BUNDLE_CREDENTIAL_SCAN_PASS artifacts=${artifacts.length} classified_environment_names=${environmentInventory.classified.size}\n`
);

function filesFromRg(paths: readonly string[]) {
  if (!paths.length) return [];
  const result = spawnSync("rg", ["--files", ...paths], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0 && result.status !== 1) {
    throw new Error("PUBLIC_BUNDLE_FILE_DISCOVERY_FAILED");
  }
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((path) => relative(root, resolve(root, path)));
}
