import axiosInstance from './axios';

let csrfToken = null;

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
