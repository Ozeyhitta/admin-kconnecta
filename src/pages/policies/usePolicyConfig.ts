import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDefaultPolicyConfig } from "./defaults";
import { appendAuditEntry, loadPolicyConfig, savePolicyConfig } from "./storage";
import { fetchPolicyConfig, savePolicyConfig as savePolicyApi } from "@/services/policyApi";
import type { PolicyConfig } from "./types";

const mergeWithDefaults = (remote: PolicyConfig): PolicyConfig => ({
  ...createDefaultPolicyConfig(),
  ...remote,
});

export const usePolicyConfig = () => {
  const [config, setConfig] = useState<PolicyConfig>(() => loadPolicyConfig());
  const savedRef = useRef<PolicyConfig>(loadPolicyConfig());
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchPolicyConfig();
        if (cancelled) return;
        const merged = mergeWithDefaults(remote);
        setConfig(merged);
        savedRef.current = merged;
        savePolicyConfig(merged);
        setApiReady(true);
      } catch {
        if (!cancelled) {
          setApiReady(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<PolicyConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const replace = useCallback((next: PolicyConfig) => {
    setConfig(next);
    setDirty(true);
  }, []);

  const save = useCallback(
    async (section: string, summary: string) => {
      const withAudit = appendAuditEntry(
        config,
        section,
        summary,
        savedRef.current,
        config
      );
      let final = withAudit;
      try {
        if (apiReady) {
          const saved = await savePolicyApi(withAudit);
          final = { ...mergeWithDefaults(saved), auditLog: withAudit.auditLog };
        }
      } catch {
        // Giữ bản local nếu API lỗi
      }
      setConfig(final);
      savePolicyConfig(final);
      savedRef.current = final;
      setDirty(false);
      setLastSaved(new Date());
    },
    [apiReady, config]
  );

  const resetToDefaults = useCallback(async () => {
    const fresh = createDefaultPolicyConfig();
    try {
      if (apiReady) {
        await savePolicyApi(fresh);
      }
    } catch {
      /* local fallback */
    }
    setConfig(fresh);
    savedRef.current = fresh;
    savePolicyConfig(fresh);
    setDirty(false);
    setLastSaved(new Date());
  }, [apiReady]);

  const weightTotal = useMemo(() => {
    const w = config.recommendation.weights;
    return w.engagement + w.friends + w.trending + w.newContent;
  }, [config.recommendation.weights]);

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
  };
};
