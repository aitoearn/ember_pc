import { useCallback, useEffect, useState } from "react";
import { requireDefaultProjectId } from "@/lib/api/project";
import {
  readDeviceExploreProfile,
  saveDeviceExploreProfile,
} from "@/lib/api/deviceExplore";
import {
  EMPTY_EXPLORE_CONFIG,
  type DeviceExploreProfile,
  type ExploreConfig,
  type ExploreRule,
} from "@/features/device-automation/explore/types";

export function useExploreProfile() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [rules, setRules] = useState<ExploreRule[]>([]);
  const [config, setConfig] = useState<ExploreConfig>(EMPTY_EXPLORE_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void requireDefaultProjectId()
      .then((id) => setWorkspaceId(id))
      .catch(() => setWorkspaceId(""));
  }, []);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setRules([]);
      setConfig(EMPTY_EXPLORE_CONFIG);
      return;
    }
    setLoading(true);
    try {
      const profile = await readDeviceExploreProfile(workspaceId);
      if (profile) {
        setRules(profile.rules);
        setConfig(profile.config);
      } else {
        setRules([]);
        setConfig(EMPTY_EXPLORE_CONFIG);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = useCallback(
    async (next: { rules: ExploreRule[]; config: ExploreConfig }) => {
      if (!workspaceId) {
        return;
      }
      setSaving(true);
      try {
        const profile: DeviceExploreProfile = {
          workspaceId,
          rules: next.rules,
          config: next.config,
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveDeviceExploreProfile(profile);
        setRules(saved.rules);
        setConfig(saved.config);
      } finally {
        setSaving(false);
      }
    },
    [workspaceId],
  );

  const saveCurrent = useCallback(async () => {
    await saveProfile({ rules, config });
  }, [config, rules, saveProfile]);

  return {
    workspaceId,
    rules,
    config,
    loading,
    saving,
    setRules,
    setConfig,
    reload,
    saveProfile,
    saveCurrent,
  };
}
