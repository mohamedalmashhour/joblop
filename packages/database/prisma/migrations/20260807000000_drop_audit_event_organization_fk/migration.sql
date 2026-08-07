-- audit_events are append-only (BEFORE UPDATE and BEFORE DELETE triggers reject any change).
-- The organization_id foreign key used ON DELETE SET NULL, which made deleting an EmployerOrganization
-- attempt an UPDATE on audit_events and fail with "audit_events are append-only".
--
-- An append-only audit log should hold an *immutable historical snapshot* of the organization
-- reference, not a live foreign key that mutates when the organization is later removed. Drop the
-- foreign key; organization_id remains as a plain snapshot column (still indexed for lookups).
ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_organization_id_fkey";
