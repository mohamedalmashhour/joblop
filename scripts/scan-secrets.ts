import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const patterns = [
  { pattern: /sk-[A-Za-z0-9]{20,}/ },
  { pattern: /AKIA[0-9A-Z]{16}/ },
  { pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  {
    pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/,
    allowSyntheticFixture: true
  },
  { pattern: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/ },
  { pattern: /BREVO_API_KEY\s*=\s*[^<\s][^\s]+/ },
  { pattern: /xkeysib-[A-Za-z0-9-]{20,}/ }
];

const releaseFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  }
);
const files = releaseFiles
  .split("\0")
  .filter(Boolean)
  .map((file) => join(root, file))
  .filter((file) => existsSync(file))
  .filter((file) => !file.endsWith("pnpm-lock.yaml"));
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
  return file.endsWith(".env.example") || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
}
