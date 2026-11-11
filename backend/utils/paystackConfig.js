// Single source of truth for Paystack settings
export const getPaystackConfig = () => {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  const baseUrl = (process.env.PAYSTACK_BASE_URL || "https://api.paystack.co")
    .trim()
    .replace(/\/+$/, "");

  if (!secretKey) {
    return { error: "PAYSTACK_SECRET_KEY is not set." };
  }
  if (secretKey.startsWith("pk_")) {
    return { error: "PAYSTACK_SECRET_KEY holds a PUBLIC key (pk_). Use the secret key (sk_)." };
  }
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) {
    return { error: "PAYSTACK_SECRET_KEY has an invalid format (quotes, spaces, or a typo?)." };
  }
  if (process.env.NODE_ENV === 'test' && !secretKey.startsWith('sk_test_')) {
    return { error: 'Test mode accepts only Paystack sandbox secret keys (sk_test_...).'};
  }

  const masked = `${secretKey.slice(0, 8)}...${secretKey.slice(-4)} (length ${secretKey.length})`;
  return { secretKey, baseUrl, masked };
};
