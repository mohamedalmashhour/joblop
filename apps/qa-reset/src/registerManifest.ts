import { createPrismaClient } from "@rwos/database";
import { readQaResetConfig } from "./config";
import { createResetManifest } from "./manifest";
import {
  registerApprovedStagingManifest,
  supersedeApprovedStagingManifest
} from "./manifestRegistration";

const config = readQaResetConfig();
const manifest = createResetManifest(config);
if (manifest.checksum !== config.manifestChecksum) {
  throw new Error("QA_RESET_MANIFEST_CHECKSUM_MISMATCH");
}
const client = createPrismaClient(process.env.DATABASE_URL);
try {
  const superseding =
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION ===
    "supersede-approved-synthetic-staging-manifest";
  const expectedCurrentChecksum = process.env.QA_RESET_MANIFEST_SUPERSESSION_EXPECTED_CHECKSUM;
  if (superseding && !expectedCurrentChecksum) {
    throw new Error("QA_RESET_MANIFEST_SUPERSESSION_EXPECTATION_REQUIRED");
  }
  const result = superseding
    ? await supersedeApprovedStagingManifest(
        client,
        manifest,
        config.organizationOwnerAccessRoleId,
        expectedCurrentChecksum!
      )
    : await registerApprovedStagingManifest(client, manifest, config.organizationOwnerAccessRoleId);
  process.stdout.write(
    `QA_RESET_MANIFEST_REGISTERED mode=${superseding ? "supersede" : "register"} idempotent=${String(result.idempotent)} records=${manifest.records.length}\n`
  );
} finally {
  await client.$disconnect();
}
