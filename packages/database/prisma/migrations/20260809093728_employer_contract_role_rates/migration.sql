-- CreateEnum
CREATE TYPE "EmployerContractStatus" AS ENUM ('draft', 'signed', 'active', 'superseded');

-- CreateTable
CREATE TABLE "employer_contracts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "status" "EmployerContractStatus" NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "signed_by_user_id" UUID,
    "signed_at" TIMESTAMPTZ(3),
    "activated_at" TIMESTAMPTZ(3),
    "effective_from" TIMESTAMPTZ(3),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_role_rates" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "work_group_id" UUID NOT NULL,
    "role_definition_id" UUID NOT NULL,
    "hourly_rate_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_role_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employer_contracts_organization_status_idx" ON "employer_contracts"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employer_contracts_organization_version_key" ON "employer_contracts"("organization_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "contract_role_rates_contract_role_key" ON "contract_role_rates"("contract_id", "role_definition_id");

-- AddForeignKey
ALTER TABLE "employer_contracts" ADD CONSTRAINT "employer_contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_role_rates" ADD CONSTRAINT "contract_role_rates_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "employer_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
