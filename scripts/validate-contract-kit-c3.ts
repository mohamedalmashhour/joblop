import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { type ContractKitManifest, validateContractKitManifest } from "./contract-kit-c3-policy";

void main();

async function main() {
  const manifestPath = process.env.RWOS_CONTRACT_KIT_MANIFEST;
  if (!manifestPath) {
    process.stderr.write("CONTRACT_KIT_C3_ERROR: RWOS_CONTRACT_KIT_MANIFEST is required.\n");
    process.exit(1);
  }
  const absoluteManifest = resolve(manifestPath);
  const root = dirname(absoluteManifest);
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8")) as ContractKitManifest;
  const issues = validateContractKitManifest(manifest);
  if (manifest.releaseSha !== process.env.RWOS_RELEASE_SHA) {
    issues.push("Contract Kit releaseSha must match RWOS_RELEASE_SHA.");
  }

  if (Array.isArray(manifest.files)) {
    for (const candidate of manifest.files) {
      if (
        typeof candidate !== "object" ||
        candidate === null ||
        typeof (candidate as Record<string, unknown>).path !== "string" ||
        typeof (candidate as Record<string, unknown>).sha256 !== "string"
      ) {
        continue;
      }
      const record = candidate as { path: string; sha256: string };
      const path = resolve(root, record.path);
      if (!path.startsWith(`${root}${sep}`)) continue;
      const actual = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      if (actual !== record.sha256) issues.push(`Checksum mismatch: ${record.path}.`);
    }
  }

  if (issues.length) {
    for (const issue of issues) process.stderr.write(`CONTRACT_KIT_C3_ERROR: ${issue}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `CONTRACT_KIT_C3_INTAKE_PASS version=v1.1 sourceCommit=${manifest.sourceCommit}\n`
  );
}
