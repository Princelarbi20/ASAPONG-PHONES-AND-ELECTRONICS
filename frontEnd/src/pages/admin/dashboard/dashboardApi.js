import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  API Configuration                                                 */
/* ------------------------------------------------------------------ */

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
export const API_BASE = /\/api\/v1$/.test(configuredApiBase)
  ? configuredApiBase
  : `${configuredApiBase}/api/v1`;

export const DASHBOARD_STATS_URL = `${API_BASE}/dashboard-stats`;
export const DASHBOARD_CHARTS_URL = `${API_BASE}/dashboard-charts`;

const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */

const REQUIRED_SECTIONS = ['summary', 'revenue', 'orders', 'products'];

export const fetchDashboardStats = async (days = 30, signal) => {
  const token = getAuthToken();

  const { data } = await axios.get(DASHBOARD_STATS_URL, {
    params: { days },
    signal,
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!data?.success || !data?.stats) {
    throw Object.assign(new Error(data?.message || 'Unexpected response from the dashboard API.'), { isShapeError: true });
  }

  const missing = REQUIRED_SECTIONS.filter((key) => !data.stats[key] || typeof data.stats[key] !== 'object');
  if (missing.length > 0) {
    console.warn('Dashboard API response has an unexpected shape:', data);
    throw Object.assign(
      new Error(
        `The dashboard API response is missing stats.${missing.join(', stats.')}. ` +
          `Received stats keys: ${Object.keys(data.stats).join(', ') || 'none'}.`
      ),
      { isShapeError: true }
    );
  }
  return data;
};

// Turns any request error into a message for the UI. Returns null for cancelled requests.
export const getErrorMessage = (error) => {
  if (axios.isCancel(error) || error?.name === 'CanceledError') return null;
  if (error?.isShapeError) return error.message;

  const status = error?.response?.status;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to view the dashboard.';
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';

  return error.response.data?.message || 'Something went wrong while loading the dashboard.';
};
