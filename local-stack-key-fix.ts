// LOCAL in-place repair: work group / role definition KEYS must use underscores
// (slugs use hyphens; slug<->key round-trips via s/-/_/). The extra-seed created
// hyphenated keys ("wg-care-xxxx", "role-psw-xxxx"), so the create path's
// workGroupSlugToKey/roleDefinitionIdentifierToKey produced an underscore key that
// no row had -> work_group_not_found -> 403. Normalize any hyphenated keys in place.
// The API re-queries each request, so no reboot needed.
//   Run on the Mac:  cd "/Volumes/Danny SSD/Codex/resident-workforce-os" \
//     && DATABASE_URL="postgresql://$USER@localhost:5432/$(sed -n 's/^DB: //p' local-stack-info.txt)" \
//        node --import tsx local-stack-key-fix.ts
import { createPrismaClient } from "@rwos/database";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("KEY_FIX_FAIL no DATABASE_URL"); process.exit(1); }
  const c: any = createPrismaClient(url);

  const wgs = await c.workGroup.findMany({ where: { key: { contains: "-" } } });
  for (const w of wgs) {
    const nk = w.key.replace(/-/g, "_");
    await c.workGroup.update({ where: { id: w.id }, data: { key: nk } });
    console.log("WG_KEY_FIX", JSON.stringify({ id: w.id, from: w.key, to: nk }));
  }

  const roles = await c.roleDefinition.findMany({ where: { key: { contains: "-" } } });
  for (const r of roles) {
    const nk = r.key.replace(/-/g, "_");
    await c.roleDefinition.update({ where: { id: r.id }, data: { key: nk } });
    console.log("ROLE_KEY_FIX", JSON.stringify({ id: r.id, from: r.key, to: nk }));
  }

  console.log("KEY_FIX_DONE", JSON.stringify({ workGroupsFixed: wgs.length, rolesFixed: roles.length }));
}

main().catch((e) => { console.error("KEY_FIX_ERROR", e); process.exit(1); });
