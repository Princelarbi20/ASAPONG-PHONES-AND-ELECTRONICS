import axiosInstance from './axios';

let csrfToken = null;
let csrfTokenExpiresAt = 0;
const CSRF_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const CSRF_TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

// Added back to satisfy main.jsx import without throwing errors
export const configureApiSecurity = () => {
  // axiosInstance handles credentials and headers natively via interceptors below
  return axiosInstance;
};

export const getCsrfToken = async () => {
    if (csrfToken && Date.now() < csrfTokenExpiresAt - CSRF_TOKEN_REFRESH_MARGIN_MS) return csrfToken;

    try {
        const response = await axiosInstance.get('/csrf-token');
        csrfToken = response.data?.csrfToken || null;
        const issuedAt = Number.parseInt(csrfToken?.split('.')?.[0] || '', 36);
        csrfTokenExpiresAt = Number.isFinite(issuedAt) ? issuedAt + CSRF_TOKEN_TTL_MS : 0;
        return csrfToken;
    } catch {
        csrfToken = null;
        csrfTokenExpiresAt = 0;
        return null;
    }
};

export const withCsrf = async (config = {}) => {
    const token = await getCsrfToken();
    return {
        ...config,
        headers: {
            ...(config.headers || {}),
            ...(token ? { 'X-CSRF-Token': token } : {}),
        },
    };
};

export default axiosInstance;
