import { createPrismaClient } from "@rwos/database";
import { readQaResetConfig } from "./config";
import { createResetManifest } from "./manifest";
import { registerApprovedStagingManifest } from "./manifestRegistration";

const config = readQaResetConfig();
const manifest = createResetManifest(config);
if (manifest.checksum !== config.manifestChecksum) {
  throw new Error("QA_RESET_MANIFEST_CHECKSUM_MISMATCH");
}
const client = createPrismaClient(process.env.DATABASE_URL);
try {
  const result = await registerApprovedStagingManifest(
    client,
    manifest,
    config.organizationOwnerAccessRoleId
  );
  process.stdout.write(
    `QA_RESET_MANIFEST_REGISTERED idempotent=${String(result.idempotent)} records=${manifest.records.length}\n`
  );
} finally {
  await client.$disconnect();
}
