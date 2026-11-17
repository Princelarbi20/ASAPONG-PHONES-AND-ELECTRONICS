import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';

const PREHASH_PREFIX = '$bcrypt-sha256$';
const digestPassword = (password) => createHash('sha256').update(password, 'utf8').digest('base64url');

export const hashPassword = async (password, rounds = 10) =>
  `${PREHASH_PREFIX}${await bcrypt.hash(digestPassword(password), rounds)}`;

export const verifyPassword = async (password, storedHash) => {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  try {
    if (storedHash.startsWith(PREHASH_PREFIX)) {
      return bcrypt.compare(digestPassword(password), storedHash.slice(PREHASH_PREFIX.length));
    }
    if (storedHash.startsWith('$2')) return bcrypt.compare(password, storedHash);
    return false;
  } catch {
    return false;
  }
};

export const isLegacyPasswordHash = (storedHash) =>
  typeof storedHash === 'string' && storedHash.startsWith('$2');
