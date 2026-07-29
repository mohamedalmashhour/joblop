import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const patterns = [
  { pattern: /sk-[A-Za-z0-9]{20,}/ },
  { pattern: /AKIA[0-9A-Z]{16}/ },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  {
    pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/,
    allowSyntheticFixture: true
  },
  { pattern: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/ },
  { pattern: /RESEND_API_KEY\s*=\s*[^<\s][^\s]+/ }
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
  return patterns
    .filter(
      ({ pattern, allowSyntheticFixture }) =>
        pattern.test(text) && !(allowSyntheticFixture && isSyntheticCredentialFixture(file))
    )
    .map(() => file);
});

if (findings.length > 0) {
  console.error([...new Set(findings)].join("\n"));
  process.exit(1);
}

console.log("SECRET_SCAN_PASS");

function isSyntheticCredentialFixture(file: string) {
  return (
    file.endsWith(".env.example") ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}
