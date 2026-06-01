import { getLoggedInAdmin } from "@/lib/currentAdminUser";
import { createDefaultPolicyConfig } from "./defaults";
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
  summary: string,
  before: unknown,
  after: unknown
): PolicyConfig => {
  const admin = getLoggedInAdmin();
  const entry: PolicyAuditEntry = {
    id: crypto.randomUUID(),
    section,
    adminLabel: admin?.email ?? admin?.id ?? "Admin",
    changedAt: new Date().toISOString(),
    summary,
    beforeJson: JSON.stringify(before, null, 2),
    afterJson: JSON.stringify(after, null, 2),
  };
  const auditLog = [entry, ...config.auditLog].slice(0, 200);
  return { ...config, auditLog };
};
