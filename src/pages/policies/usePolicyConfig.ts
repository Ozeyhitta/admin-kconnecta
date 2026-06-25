import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizePolicyConfig } from "./defaults";
import { appendAuditEntry } from "./storage";
import {
  fetchPolicyConfig,
  resetPolicyToDefault,
  savePolicyConfig as savePolicyApi,
} from "@/services/policyApi";
import type { PolicyConfig } from "./types";

export const usePolicyConfig = () => {
  const [config, setConfig] = useState<PolicyConfig | null>(null);
  const savedRef = useRef<PolicyConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const remote = await fetchPolicyConfig();
        if (cancelled) return;

        const normalized = normalizePolicyConfig(remote);
        setConfig(normalized);
        savedRef.current = normalized;
        setApiReady(true);
        setDirty(false);
      } catch (err) {
        if (!cancelled) {
          setApiReady(false);
          setConfig(null);
          setLoadError(
            err instanceof Error ? err.message : "Không tải được cấu hình từ API"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    (patch: Partial<PolicyConfig>) => {
      if (!apiReady) return;
      setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
      setDirty(true);
    },
    [apiReady]
  );

  const replace = useCallback(
    (next: PolicyConfig) => {
      if (!apiReady) return;
      setConfig(next);
      setDirty(true);
    },
    [apiReady]
  );

  const save = useCallback(
    async (section: string, summary: string) => {
      if (!config || !apiReady) {
        throw new Error("Không kết nối Admin API");
      }
      const withAudit = appendAuditEntry(
        config,
        section,
        summary,
        savedRef.current ?? config,
        config
      );
      const saved = await savePolicyApi(withAudit);
      const final = normalizePolicyConfig(saved);
      setConfig(final);
      savedRef.current = final;
      setDirty(false);
      setLastSaved(new Date());
    },
    [apiReady, config]
  );

  const resetToDefaults = useCallback(async () => {
    if (!apiReady) {
      throw new Error("Không kết nối Admin API");
    }
    const fresh = normalizePolicyConfig(await resetPolicyToDefault());
    setConfig(fresh);
    savedRef.current = fresh;
    setDirty(false);
    setLastSaved(new Date());
  }, [apiReady]);

  const weightTotal = useMemo(() => {
    if (!config) return 0;
    const w = config.recommendation.weights;
    return w.engagement + w.friends + w.trending + w.newContent;
  }, [config]);

  return {
    config,
    update,
    replace,
    save,
    resetToDefaults,
    dirty,
    lastSaved,
    weightTotal,
    loading,
    apiReady,
    loadError,
  };
};
