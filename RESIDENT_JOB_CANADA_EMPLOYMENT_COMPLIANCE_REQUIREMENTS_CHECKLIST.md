# Resident Job Canada Employment-Compliance Requirements Checklist

Status: READY FOR COUNSEL REVIEW

This document is a requirements checklist for counsel and compliance review. It is not legal advice and does not authorize implementation.

No code, schema, migration, service, API, permission, payment integration, payroll calculation, finance calculation, escrow logic, provider integration, push, merge, or deployment is authorized by this checklist.

Resident Workforce OS is CAD/Canada-first. The compliance layer must remain HR-owned and must not be delegated to the shared Money Engine. The shared Money Engine may provide currency-aware money mechanics only after the ADR-0002 contract gate clears.

## 1. Official Source References To Verify

The compliance layer and counsel gate should verify requirements against official sources before implementation:

- CRA, Employee or Self-employed: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4110/employee-self-employed.html
- CRA, Employers' Guide - Payroll Deductions and Remittances: https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4001/employers-guide-payroll-deductions-remittances.html
- CRA, pensionable and insurable earnings: https://www.canada.ca/en/revenue-agency/services/tax/canada-pension-plan-cpp-employment-insurance-ei-rulings/cpp-ei-explained/canada-pension-plan-employment-insurance-explained-10.html
- CRA, income tax deductions: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/income-tax.html
- Revenu Quebec, source deductions and employer contributions: https://www.revenuquebec.ca/en/businesses/source-deductions-and-employer-contributions/conditions-for-making-source-deductions-and-paying-contributions/employers-are-you-required-to-make-source-deductions-and-pay-contributions/
- Revenu Quebec, formulas for source deductions and contributions: https://www.revenuquebec.ca/en/online-services/forms-and-publications/current-details/tp-1015-f-v/
- Retraite Quebec, QPP employer role and contribution figures: https://www.retraitequebec.gouv.qc.ca/en/professionals-employers/your-role-quebec-pension-plan
- Government of Canada, minimum wage database: https://minwage-salairemin.service.canada.ca/en/index.html
- Government of Canada, federal pay, deductions, and minimum wage: https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/pay-deductions.html
- Government of Canada, federal hours of work and overtime: https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/work-hours.html

## 2. Counsel Gate Checklist

Before any payroll, invoice, employer funding, held-funds, escrow, or worker payout implementation, counsel must confirm:

- supported launch jurisdictions
- jurisdiction source of truth
- province of employment rules
- legal employer responsibility
- worker classification categories
- payroll withholding ownership
- pay-statement and recordkeeping requirements
- minimum wage and overtime rules
- vacation pay, statutory holiday, leave, and termination boundaries
- Quebec-specific deductions and contributions where applicable
- contractor payment and reporting boundary
- held-funds or escrow terminology
- payment timing and payout eligibility
- retention and audit requirements
- whether external payroll provider review is required

## 3. Worker Classification

The platform must distinguish:

- employee
- contractor/self-employed worker
- temporary worker
- applicant
- platform user

Counsel must approve:

- classification criteria
- who determines classification
- when classification is captured
- how classification changes are audited
- whether classification is per worker, per organization, per assignment, or per jurisdiction
- fail-closed behavior for missing classification
- whether non-arm's-length, agency, or staffing intermediary relationships require special handling

Engineering acceptance criteria:

- missing classification blocks payroll and payout eligibility
- classification does not come from AI
- classification is not inferred from job title alone
- classification is versioned and auditable
- classification does not alter historical Timesheet evidence

## 4. CRA Payroll Withholding

For employees outside Quebec-specific provincial administration, the compliance layer must support counsel-approved handling of:

- federal income tax withholding
- provincial or territorial income tax withholding
- CPP contributions, including employer and employee shares where applicable
- EI premiums, including employer and employee responsibilities where applicable
- province of employment determination
- TD1 and provincial/territorial TD1 handling
- payroll program account requirements
- remittance frequency and due dates
- T4/T4A reporting boundary
- corrections before filing
- penalties/interest risk if required deductions are missed

Engineering acceptance criteria:

- withholding calculations remain HR-owned
- missing province of employment fails closed
- missing worker classification fails closed
- missing deduction policy fails closed
- shared Money Engine never determines tax or employment status

## 5. Quebec Payroll and Contributions

For Quebec, counsel must confirm handling of:

- Quebec income tax source deductions
- QPP contributions
- QPIP premiums
- EI premiums, including Quebec-specific rate interactions
- Health Services Fund contribution
- labour standards contribution
- Workforce Skills Development and Recognition Fund where applicable
- Revenu Quebec source-deduction formulas
- Quebec establishment or attachment rules
- Quebec-specific reporting and remittance obligations

Current official reference points to verify before implementation:

- Revenu Quebec states that remuneration paid to employees reporting to, attached to, or paid from a Quebec establishment may require source deductions and employer contributions.
- Retraite Quebec states that QPP is funded by employers and workers, with 2026 figures including a $3,500 basic exemption, MPE of $74,600, YAMPE of $85,000, and employer/worker half-share contribution treatment.
- Retraite Quebec worker-facing guidance states QPP generally applies to workers aged 18 and over when annual employment income exceeds $3,500.

Engineering acceptance criteria:

- Quebec rules are separate from non-Quebec CRA deduction rules
- QPP/QPIP labels are not collapsed into CPP/EI
- Quebec unsupported-policy state fails closed
- counsel approval is recorded before enabling Quebec payroll

## 6. Minimum Wage

The compliance layer must support:

- federal minimum wage for federally regulated workers
- provincial or territorial minimum wage for provincially regulated workers
- higher-of rule where federal rules require comparison with provincial/territorial minimum wage
- effective dates
- occupation-specific rates
- tipped-worker rates where applicable
- student/young-worker special rates where applicable
- on-call/reporting-pay rules where applicable
- room and board or special exemption rules where applicable

Current official reference points to verify before implementation:

- Government of Canada minimum wage database lists current and forthcoming general minimum wage rates by jurisdiction.
- Federal labour standards state that federally regulated employees receive at least the federal minimum wage, and if the province or territory where the employee usually works has a higher rate, the higher rate applies.
- As of the current source reviewed, the federal minimum wage effective April 1, 2026 is $18.15/hour.
- Quebec's general minimum wage effective May 1, 2026 is listed as $16.60/hour in Government of Quebec materials and the Government of Canada minimum wage database.

Engineering acceptance criteria:

- minimum wage policy has jurisdiction and effective date
- below-minimum output fails closed
- effective-date mismatch fails closed
- missing occupation-specific rule fails closed where applicable
- rate updates require policy update and audit

## 7. Overtime and Hours of Work

The compliance layer must support counsel-approved handling of:

- daily overtime thresholds
- weekly overtime thresholds
- averaging agreements
- modified work schedules
- maximum hours
- breaks and rest periods
- shift-change notice rules
- holiday and statutory-pay effects
- industry-specific exemptions
- union or collective agreement overrides where applicable
- multi-assignment aggregation across the same legal employer where required

Current official reference point:

- Federal labour standards describe standard hours, overtime, maximum hours, averaging, modified schedules, breaks, rest periods, and recordkeeping for federally regulated workplaces.

Engineering acceptance criteria:

- overtime policy is jurisdiction-specific
- overtime cannot be inferred solely from one shift if cross-period aggregation is required
- missing workweek definition fails closed
- missing averaging/modified schedule policy fails closed where applicable
- Timesheet remains source evidence; compliance calculation never mutates attendance or timesheet history

## 8. Contractor Boundary

Counsel must confirm:

- contractor classification criteria
- whether contractors are paid through accounts payable rather than payroll
- whether GST/HST/QST registration status matters
- whether employer-billed transport hour, mileage, and gas charges treated as platform revenue create GST/HST/QST obligations
- whether the standard +1hr transport charge for all jobs and the outside-Montreal actual travel-duration charge are separately valid employer-billed revenue components
- whether GST/HST/QST applies to the full billable invoice subtotal, including worked hours, standard +1hr transport, outside-Montreal travel duration, mileage, and gas
- whether worker travel amounts paid differently from employer-billed transport/mileage/gas charges affect worker classification, wage treatment, taxable benefits, reimbursements, or contractor-payment treatment
- reporting obligations such as T4A where applicable
- platform responsibility versus employer responsibility
- whether minimum wage/overtime rules apply or are excluded
- whether misclassification risk requires manual review

Engineering acceptance criteria:

- contractor route is not treated as employee payroll
- contractor route does not bypass worker classification
- contractor payments are not executed before provider/payment authorization
- contractor reporting is not inferred from employee withholding rules

## 9. Privacy and Security Requirements

The compliance layer must protect:

- SIN/social identifiers
- tax forms
- bank/payment details
- payroll deductions
- worker classification evidence
- immigration/work authorization evidence if later introduced
- health or disability information
- investigation or misconduct material

Engineering acceptance criteria:

- least-privilege access
- masked values by default
- no payroll secrets in logs
- no provider credentials in fixtures
- audit records preserve actor, action, source record, policy version, timestamp, and result
- AI never determines classification, deductions, overtime, minimum wage compliance, payroll approval, or payout execution

## 10. Acceptance Criteria For Reopening Money Implementation

Money implementation may reopen only when:

- contract kit has landed
- conformance suite runs green on HR fixtures
- S1-S7 suite runs green on HR fixtures
- counsel gate has accepted the compliance checklist for the target launch jurisdiction
- owner approves the first implementation item
- stop conditions are explicitly defined

## Final Status

CANADA EMPLOYMENT-COMPLIANCE REQUIREMENTS CHECKLIST READY FOR COUNSEL REVIEW
