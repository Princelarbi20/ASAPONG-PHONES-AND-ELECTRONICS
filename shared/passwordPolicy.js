const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'letmein',
  'welcome1', 'admin123', 'iloveyou', 'abc12345', '11111111', '00000000',
  '1q2w3e4r', 'P@ssw0rd'.toLowerCase(),
]);

export const passwordCharacterLength = (password) => Array.from(password).length;

export const isCommonPassword = (password) =>
  typeof password === 'string' && COMMON_PASSWORDS.has(password.toLowerCase());

export const isValidPassword = (password) =>
  typeof password === 'string' &&
  passwordCharacterLength(password) >= 8 &&
  passwordCharacterLength(password) <= 128 &&
  password.trim().length > 0 &&
  !isCommonPassword(password);

export const getPasswordStrength = (password) => {
  if (typeof password !== 'string' || !isValidPassword(password)) return 'Weak';

  const length = passwordCharacterLength(password);
  const categories = [
    /\p{Ll}/u.test(password),
    /\p{Lu}/u.test(password),
    /\p{N}/u.test(password),
    /[^\p{L}\p{N}\s]/u.test(password),
  ].filter(Boolean).length;
  const words = password.trim().split(/\s+/u).filter(Boolean).length;
  const score = (length >= 20 ? 2 : length >= 14 ? 1 : 0)
    + (categories >= 3 ? 2 : categories >= 2 ? 1 : 0)
    + (words >= 4 ? 2 : words >= 3 ? 1 : 0);

  if (score >= 5) return 'Strong';
  if (score >= 3) return 'Good';
  if (score >= 1) return 'Fair';
  return 'Weak';
};
