import axios from 'axios';

let csrfToken = null;

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const apiBase = /\/api\/v1$/.test(configuredApiBase)
  ? configuredApiBase
  : /\/api$/.test(configuredApiBase)
    ? `${configuredApiBase}/v1`
    : `${configuredApiBase}/api/v1`;

// Point at the versioned API root in both local proxy and deployed setups.
const axiosInstance = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

// Added back to satisfy main.jsx import without throwing errors
export const configureApiSecurity = () => {
  // axiosInstance handles credentials and headers natively via interceptors below
  return axiosInstance;
};

export const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    try {
        const response = await axiosInstance.get('/csrf-token');
        csrfToken = response.data?.csrfToken || null;
        return csrfToken;
    } catch {
        return null;
    }
};

// Attach interceptors directly to axiosInstance
axiosInstance.interceptors.request.use(async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (!['get', 'head', 'options'].includes(method)) {
        const token = await getCsrfToken();
        config.headers = config.headers || {};
        if (token) config.headers['X-CSRF-Token'] = token;
    }

    const authorization = config.headers?.Authorization || config.headers?.authorization;
    if (authorization === 'Bearer null' || authorization === 'Bearer undefined') {
        delete config.headers.Authorization;
        delete config.headers.authorization;
    }
    return config;
});

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
