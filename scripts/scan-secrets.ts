import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const patterns = [
  /sk-[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /postgres:\/\/[^:\s]+:[^@\s]+@/,
  /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/,
  /RESEND_API_KEY\s*=\s*[^<\s][^\s]+/
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (["node_modules", ".git", ".next", "dist", "coverage"].includes(entry)) return [];
      return walk(path);
    }
    return [path];
  });
}

const files = walk(root).filter((file) => !file.endsWith("pnpm-lock.yaml"));
const findings = files.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return patterns.filter((pattern) => pattern.test(text)).map(() => file);
});

if (findings.length > 0) {
  console.error([...new Set(findings)].join("\n"));
  process.exit(1);
}

console.log("SECRET_SCAN_PASS");
