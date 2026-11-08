// Canadian province / territory codes the job alert accepts (Québec first: Joblop's home market).
export const JOB_ALERT_PROVINCES = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU"] as const;
export type JobAlertProvince = (typeof JOB_ALERT_PROVINCES)[number];
