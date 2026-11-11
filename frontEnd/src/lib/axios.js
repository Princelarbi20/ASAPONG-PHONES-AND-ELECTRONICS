import axios from 'axios';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not defined');
}

const configuredApiBase = API_BASE_URL.replace(/\/$/, '');
export const API_ORIGIN = configuredApiBase.replace(/\/api(?:\/v1)?$/, '');
export const API_ENDPOINT_BASE = /\/api\/v1$/.test(configuredApiBase)
  ? configuredApiBase
  : /\/api$/.test(configuredApiBase)
    ? `${configuredApiBase}/v1`
    : `${configuredApiBase}/api/v1`;

export const resolveApiAssetUrl = (assetPath) => {
  if (!assetPath) return '';
  if (/^(?:https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  return `${API_ORIGIN}/${String(assetPath).replace(/^\/+/, '')}`;
};

const axiosInstance = axios.create({
  // VITE_API_BASE_URL may be an origin, /api, or /api/v1.
  // Normalize every API call to the backend's versioned route prefix.
  baseURL: API_ENDPOINT_BASE,
  withCredentials: true,
});

const fetchCsrfToken = async () => {
  try {
    const response = await axiosInstance.get('/csrf-token');
    return response.data?.csrfToken || null;
  } catch {
    return null;
  }
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const method = config.method?.toUpperCase() || 'GET';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      let csrfToken = getCookie('csrfToken');
      if (!csrfToken) {
        csrfToken = await fetchCsrfToken();
      }
      if (csrfToken) {
        config.headers = {
          ...(config.headers || {}),
          'X-CSRF-Token': csrfToken,
        };
      }
    }
    const authorization = config.headers?.Authorization || config.headers?.authorization;
    if (authorization === 'Bearer null' || authorization === 'Bearer undefined') {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
