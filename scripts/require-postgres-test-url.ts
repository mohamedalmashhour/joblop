if (!process.env.RWOS_TEST_DATABASE_URL) {
  process.stderr.write("RWOS_TEST_DATABASE_URL is required for PostgreSQL concurrency validation.\n");
  process.exit(1);
}
