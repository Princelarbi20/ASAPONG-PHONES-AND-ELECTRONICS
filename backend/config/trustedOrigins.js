const isProduction = () => process.env.NODE_ENV === 'production';

export const getTrustedOrigins = () => {
  const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error('FRONTEND_ORIGIN must contain valid absolute origins.');
      }

      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, '')) {
        throw new Error('FRONTEND_ORIGIN values must be origins without paths or credentials.');
      }
      if (isProduction() && parsed.protocol !== 'https:') {
        throw new Error('Production FRONTEND_ORIGIN values must use HTTPS.');
      }

      return parsed.origin;
    });

  if (!configuredOrigins.length) throw new Error('FRONTEND_ORIGIN must contain at least one trusted origin.');

  if (!isProduction()) configuredOrigins.push('http://localhost:5173');
  return [...new Set(configuredOrigins)];
};

export const isTrustedOrigin = (origin, trustedOrigins = getTrustedOrigins()) =>
  !origin || trustedOrigins.includes(origin);
