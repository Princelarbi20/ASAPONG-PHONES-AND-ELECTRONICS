import axios from 'axios';

let csrfToken = null;

// Create the dedicated axios instance matching your Vite proxy setup
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
        const response = await axiosInstance.get('/v1/csrf-token');
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