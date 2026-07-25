import { defineConfig, env } from "prisma/config";

const localValidationDatabaseUrl =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/resident_job_phase01_validation";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ? env("DATABASE_URL") : localValidationDatabaseUrl
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  }
});
