import { getLoggedInAdmin } from "@/lib/currentAdminUser";
import { computePolicyDiff, generateSummary } from "./diffPolicy";
import type { PolicyAuditEntry, PolicyConfig } from "./types";

export const appendAuditEntry = (
  config: PolicyConfig,
  section: string,
  _summary: string,
  before: PolicyConfig,
  after: PolicyConfig
): PolicyConfig => {
  const admin = getLoggedInAdmin();
  const { auditLog: _bl, ...cleanBefore } = before;
  const { auditLog: _al, ...cleanAfter } = after;
  const diffs = computePolicyDiff(cleanBefore as PolicyConfig, cleanAfter as PolicyConfig);
  const entry: PolicyAuditEntry = {
    id: crypto.randomUUID(),
    section,
    adminLabel: admin?.email ?? admin?.id ?? "Admin",
    changedAt: new Date().toISOString(),
    summary: generateSummary(diffs),
    diffs,
    beforeJson: JSON.stringify(cleanBefore, null, 2),
    afterJson: JSON.stringify(cleanAfter, null, 2),
  };
  const auditLog = [entry, ...config.auditLog].slice(0, 200);
  return { ...config, auditLog };
};
