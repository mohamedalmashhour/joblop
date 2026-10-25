-- Runtime identities may manipulate application data but never own schema objects or migrations.
-- The migration identity remains the only role allowed to create or alter database structures.

-- Ensure the least-privilege runtime role exists. Self-hosted (docker-compose) creates rwos_app in
-- its Postgres init; managed providers (e.g. Render) do not run init scripts, so create it here if
-- absent. NOLOGIN by default — it only receives grants; environments that need it to log in set a
-- password out of band. Idempotent, so it is a no-op where the role already exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rwos_app') THEN
    CREATE ROLE rwos_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO rwos_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO rwos_app;

GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public
TO rwos_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rwos_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO rwos_app;
