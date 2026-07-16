import { useCallback, useEffect, useState } from "react";
import { listDeviceExploreRuns } from "@/lib/api/deviceExplore";
import type { ExploreRun } from "../types";

export function useExploreRuns(workspaceId: string) {
  const [runs, setRuns] = useState<ExploreRun[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setRuns([]);
      return;
    }
    setLoading(true);
    try {
      const listed = await listDeviceExploreRuns(workspaceId, { limit: 30 });
      setRuns(listed);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { runs, loading, reload };
}
