# GitHub Actions Runtime Maintenance Recommendation

Evidence run: `30559416868`

Release: `a4ef2680b6d1291454e126efc32704112cc83388`

Status: **NON-BLOCKING MAINTENANCE — DO NOT UPGRADE BLINDLY**

Foundation Validation passed. GitHub emitted a warning that `actions/checkout@v4`,
`actions/setup-node@v4` and `pnpm/action-setup@v4` target the deprecated Actions Node 20 runtime and
are currently forced to run on Node 24 by the hosted runner.

This warning concerns the JavaScript runtime used by the actions themselves. It does not change the
application matrix, which intentionally installs Node `20.20.2` for repository commands.

## Recommended maintenance

1. Inventory newer stable major versions of all three actions from their official repositories.
2. Review release notes, immutable tag/commit provenance, permissions and cache behavior.
3. Test the three upgrades together on a temporary non-default branch.
4. Require clean dependency installation, Prisma generation, `pnpm validate` and static-container
   validation.
5. Confirm the installed application Node remains `20.20.2` until a separate application-runtime
   decision changes `package.json`, Dockerfiles and local/CI evidence together.
6. Merge only after the replacement run has no runtime-deprecation warning and no permission or
   cache regression.

Do not suppress the warning, add `continue-on-error`, float action references to unreviewed
branches, or change application Node merely to silence an Actions-runtime warning.
