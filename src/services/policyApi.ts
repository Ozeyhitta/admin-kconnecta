import { apiClient } from "@/services/axiosInstance";
import type { PolicyConfig } from "@/pages/policies/types";

export interface PolicyKeywordMergeResult {
  added: number;
  skipped: number;
  totalKeywords: number;
}

export async function fetchPolicyConfig(): Promise<PolicyConfig> {
  const { data } = await apiClient.get<PolicyConfig>("/api/v1/admin/policies");
  return data;
}

export async function savePolicyConfig(config: PolicyConfig): Promise<PolicyConfig> {
  const { data } = await apiClient.put<PolicyConfig>("/api/v1/admin/policies", config);
  return data;
}

export async function mergeDefaultKeywords(): Promise<PolicyKeywordMergeResult> {
  const { data } = await apiClient.post<PolicyKeywordMergeResult>(
    "/api/v1/admin/policies/merge-default-keywords"
  );
  return data;
}

export async function resetPolicyToDefault(): Promise<PolicyConfig> {
  const { data } = await apiClient.post<PolicyConfig>(
    "/api/v1/admin/policies/reset-to-default"
  );
  return data;
}
