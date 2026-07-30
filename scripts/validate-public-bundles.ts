import { readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { findPublicCredentialLeaks } from "./public-bundle-policy";
import { validateEnvironmentInventory } from "./environment-classification";
import { discoverFiles } from "./filesystem-discovery";

const root = resolve(import.meta.dirname, "..");
const buildRoots = ["apps/mobile/dist", "apps/employer/.next/static", "apps/admin/.next/static"];
const ignoredSourceDirectories = new Set([
  ".expo",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "test-results",
  "tmp"
]);
const publicManifestFiles = filesFromFilesystem(
  ["apps/employer/.next", "apps/admin/.next"],
  "public-manifest-roots",
  true
).filter(
  (path) =>
    /(?:^|\/)(?:BUILD_ID|[^/]*manifest[^/]*)\.(?:json|js)$/.test(path) &&
    !path.includes("/.next/server/")
);
const sourceFiles = [
  ...filesFromFilesystem(
    ["apps/mobile", "apps/employer", "apps/admin"],
    "public-source-roots",
    true,
    ignoredSourceDirectories
  ),
  ...filesFromFilesystem(buildRoots, "public-build-roots", true),
  ...publicManifestFiles
];
const inventoryFiles = [
  ...filesFromFilesystem(
    ["apps", "packages", "scripts"],
    "environment-inventory-roots",
    true,
    ignoredSourceDirectories
  ),
  ".env.example"
].filter((path) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
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

function filesFromFilesystem(
  paths: readonly string[],
  label: string,
  requireFiles: boolean,
  excludedDirectoryNames?: ReadonlySet<string>
) {
  return discoverFiles({
    repositoryRoot: root,
    roots: paths,
    excludedDirectoryNames,
    requireFiles,
    label
  });
}
