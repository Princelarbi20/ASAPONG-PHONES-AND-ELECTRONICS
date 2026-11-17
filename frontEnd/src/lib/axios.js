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

// Cloudinary can resize and negotiate format/quality at delivery time. Other
// image hosts and local assets are left untouched.
export const optimizeProductImageUrl = (assetUrl, width = 640) => {
  if (!assetUrl) return assetUrl;
  try {
    const url = new URL(assetUrl);
    if (url.hostname !== 'res.cloudinary.com') return assetUrl;
    const marker = '/image/upload/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return assetUrl;
    const tail = url.pathname.slice(markerIndex + marker.length);
    const firstSegment = tail.split('/')[0];
    if (/^(?:f_|q_|w_|h_|c_|dpr_)/.test(firstSegment)) return assetUrl;
    const safeWidth = Math.max(200, Math.min(1600, Math.round(width)));
    url.pathname = `${url.pathname.slice(0, markerIndex + marker.length)}f_auto,q_auto,w_${safeWidth},c_limit/${tail}`;
    return url.toString();
  } catch {
    return assetUrl;
  }
};

const axiosInstance = axios.create({
  
  baseURL: API_ENDPOINT_BASE,
  withCredentials: true,
  timeout: 20_000,
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
      // Auth forms already fetch a signed token with withCsrf(). In a
      // cross-origin production deployment the API cookie is not readable by
      // the storefront, so prefer the supplied header before fetching again.
      let csrfToken = config.headers?.get?.('X-CSRF-Token')
        || config.headers?.['X-CSRF-Token']
        || getCookie('csrfToken');
      if (!csrfToken && !config.csrfPrepared) {
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
