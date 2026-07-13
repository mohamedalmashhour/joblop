import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const forbiddenWorkerPayloadTerms = [
  "clientBillingRate",
  "platformMargin",
  "grossPlatformMargin",
  "commercialHourlyRate"
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (["node_modules", ".git", ".next", "dist"].includes(entry)) return [];
      return walk(path);
    }
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

const workerFiles = walk(join(root, "apps", "mobile"));
const leaks = workerFiles.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return forbiddenWorkerPayloadTerms
    .filter((term) => text.includes(term))
    .map((term) => `${file}: forbidden worker-facing term ${term}`);
});

if (leaks.length > 0) {
  console.error(leaks.join("\n"));
  process.exit(1);
}

console.log("WORKSPACE_BOUNDARY_VALIDATION_PASS");
