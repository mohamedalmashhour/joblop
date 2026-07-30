ALTER TABLE "employer_payment_methods"
ADD COLUMN "method_kind" TEXT NOT NULL DEFAULT 'mastercard';

ALTER TABLE "employer_payment_methods"
ADD CONSTRAINT "employer_payment_methods_kind_check"
CHECK ("method_kind" IN ('mastercard', 'acss_debit'));
