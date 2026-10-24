import { writeFileSync } from "node:fs";
import { seedLocalE2e } from "./tests/e2e/local/seed";

const url = process.env.DATABASE_URL;
if (!url) { console.error("SEED_FAIL no DATABASE_URL"); process.exit(1); }
seedLocalE2e(url)
  .then((r) => { writeFileSync("local-stack-seed.json", JSON.stringify(r, null, 2)); console.log("SEED_OK"); })
  .catch((e) => { console.error("SEED_FAIL", e); process.exit(1); });
