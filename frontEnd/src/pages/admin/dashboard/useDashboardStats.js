import { useCallback, useEffect, useState } from "react";
import { fetchDashboardStats, getErrorMessage } from "./dashboardApi";

export const RANGE_OPTIONS = [7, 30, 90];

// Loads /dashboard-stats and reloads automatically whenever the selected range changes.
const useDashboardStats = (initialDays = 30) => {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchDashboardStats(days, controller.signal)
      .then((response) => {
        setData(response);
        setUpdatedAt(new Date());
      })
      .catch((err) => {
        const message = getErrorMessage(err);
        if (message) setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // a newer request (range change, refresh, unmount) cancels the previous one
    return () => controller.abort();
  }, [days, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  return { days, setDays, data, loading, error, updatedAt, refetch };
};

export default useDashboardStats;
