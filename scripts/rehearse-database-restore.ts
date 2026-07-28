import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateDatabaseRehearsalInput } from "./database-rehearsal-policy";

void main();

async function main() {
  const startedAt = new Date();
  const { source, target } = validateDatabaseRehearsalInput({
    sourceDatabaseUrl: process.env.RWOS_REHEARSAL_SOURCE_DATABASE_URL,
    targetDatabaseUrl: process.env.RWOS_REHEARSAL_TARGET_DATABASE_URL,
    targetIdentity: process.env.RWOS_REHEARSAL_TARGET_IDENTITY,
    confirmation: process.env.RWOS_REHEARSAL_CONFIRM
  });
  const workingDirectory = await mkdtemp(join(tmpdir(), "rwos-restore-rehearsal-"));
  const dumpPath = join(workingDirectory, "rwos.dump");

  try {
    await run("psql", [
      target.href,
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--command",
      "SELECT 1 FROM rwos_restore_rehearsal_guard WHERE disposable_target = TRUE;"
    ]);
    await run("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      `--file=${dumpPath}`,
      source.href
    ]);
    await run("pg_restore", [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      `--dbname=${target.href}`,
      dumpPath
    ]);
    await run(
      "pnpm",
      [
        "--filter",
        "@rwos/database",
        "exec",
        "prisma",
        "migrate",
        "status",
        "--schema",
        "prisma/schema.prisma"
      ],
      { DATABASE_URL: target.href }
    );
    await run("psql", [
      target.href,
      "--no-psqlrc",
      "--tuples-only",
      "--command",
      'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;'
    ]);

    const dump = await readFile(dumpPath);
    const completedAt = new Date();
    console.log(
      JSON.stringify({
        status: "restore_rehearsal_passed",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationSeconds: Math.ceil((completedAt.getTime() - startedAt.getTime()) / 1000),
        targetDatabase: target.pathname.slice(1),
        dumpSha256: createHash("sha256").update(dump).digest("hex")
      })
    );
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function run(command: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
      shell: false
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`RWOS_REHEARSAL_COMMAND_FAILED:${command}:${code ?? signal}`));
    });
  });
}
