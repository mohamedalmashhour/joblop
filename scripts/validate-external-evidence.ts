import { readFile } from "node:fs/promises";

import {
  externalEvidenceGates,
  type ExternalEvidenceGate,
  validateExternalEvidence
} from "./launch-evidence-policy";

void main();

async function main() {
  const gate = process.env.RWOS_EVIDENCE_GATE as ExternalEvidenceGate | undefined;
  const path = process.env.RWOS_EVIDENCE_PATH;
  if (!gate || !externalEvidenceGates.includes(gate)) {
    process.stderr.write(
      `EVIDENCE_VALIDATION_ERROR: RWOS_EVIDENCE_GATE must be one of: ${externalEvidenceGates.join(", ")}.\n`
    );
    process.exit(1);
  }
  if (!path) {
    process.stderr.write("EVIDENCE_VALIDATION_ERROR: RWOS_EVIDENCE_PATH is required.\n");
    process.exit(1);
  }

  const evidence = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  const issues = validateExternalEvidence(gate, evidence, process.env.RWOS_RELEASE_SHA);
  if (issues.length) {
    for (const issue of issues) process.stderr.write(`EVIDENCE_VALIDATION_ERROR: ${issue}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `EXTERNAL_EVIDENCE_VALIDATION_PASS gate=${gate} releaseSha=${process.env.RWOS_RELEASE_SHA}\n`
  );
}
