import { apiClient } from "@/services/axiosInstance";
import type { PolicyConfig } from "@/pages/policies/types";

export async function fetchPolicyConfig(): Promise<PolicyConfig> {
  const { data } = await apiClient.get<PolicyConfig>("/api/v1/admin/policies");
  return data;
}

export async function savePolicyConfig(config: PolicyConfig): Promise<PolicyConfig> {
  const { data } = await apiClient.put<PolicyConfig>("/api/v1/admin/policies", config);
  return data;
}
