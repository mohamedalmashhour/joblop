-- AlterTable: the worker's self-declared tax classification, set at sign-up and read by payroll.
-- employee -> payroll with source deductions + T4 at year-end; contractor (travailleur autonome) ->
-- paid gross, no deductions, T4A. Defaults to 'employee' so existing workers and writers are
-- unaffected; payroll already branches its deductions and employer costs on this value.
ALTER TABLE "worker_identities" ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'employee';
