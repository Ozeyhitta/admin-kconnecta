import { getLoggedInAdmin } from "@/lib/currentAdminUser";
import { createDefaultPolicyConfig } from "./defaults";
import { computePolicyDiff, generateSummary } from "./diffPolicy";
import type { PolicyAuditEntry, PolicyConfig } from "./types";

const STORAGE_KEY = "kconnecta_admin_policies_v1";

export const loadPolicyConfig = (): PolicyConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultPolicyConfig();
    const parsed = JSON.parse(raw) as PolicyConfig;
    return { ...createDefaultPolicyConfig(), ...parsed };
  } catch {
    return createDefaultPolicyConfig();
  }
};

export const savePolicyConfig = (config: PolicyConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const appendAuditEntry = (
  config: PolicyConfig,
  section: string,
  _summary: string,
  before: PolicyConfig,
  after: PolicyConfig
): PolicyConfig => {
  const admin = getLoggedInAdmin();
  // Strip auditLog from snapshots to prevent recursive JSON bloat
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
