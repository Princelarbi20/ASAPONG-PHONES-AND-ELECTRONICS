const isNonLocalHost = (hostname) => !['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());

const isHttpsPublicUrl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && isNonLocalHost(url.hostname);
  } catch {
    return false;
  }
};

// Render does not guarantee NODE_ENV is set by the application. An explicitly
// configured HTTPS storefront origin is therefore also treated as production.
export const isProductionDeployment = () =>
  String(process.env.NODE_ENV || '').toLowerCase() === 'production'
  || isHttpsPublicUrl(process.env.RENDER_EXTERNAL_URL)
  || String(process.env.FRONTEND_ORIGIN || '').split(',').some(isHttpsPublicUrl);

export const isCrossSiteCookieDeployment = isProductionDeployment;
