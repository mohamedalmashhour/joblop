// Regenerates packages/design-system/tokens.css from the TypeScript token source so the CSS
// variables never drift from `jlCssVariables`. Run: node --import tsx scripts/generate-design-tokens-css.ts
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { jlCssVariables } from "../packages/design-system/src/index";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "packages", "design-system", "tokens.css");

const body = Object.entries(jlCssVariables)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n");

const css = `/* GENERATED from packages/design-system/src/index.ts (jlCssVariables) — do not edit by hand.
   Regenerate with: node --import tsx scripts/generate-design-tokens-css.ts
   The SINGLE source of truth for JobLop brand tokens. @import this in each app globals.css. */
:root {
${body}
}
`;

writeFileSync(out, css);
console.log(`Wrote ${out} (${Object.keys(jlCssVariables).length} variables)`);
