import axios from 'axios';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

const axiosInstance = axios.create({
  // Uses Vite's proxy '/api' during local development, 
  // or falls back to your Render backend URL in production.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
});

const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(
      import.meta.env.MODE === 'development' ? '/api' : 'https://asapong-phones.onrender.com/', 
      {
        withCredentials: true,
      }
    );
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
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;