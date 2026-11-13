import jwt from 'jsonwebtoken';
import { setAuthCookies } from './authCookies.js';

export const issueAuthTokens = (res, account, accountType) => {
  const identity = {
    id: String(account._id),
    email: account.email,
    role: account.role,
    accountType,
    ver: account.tokenVersion || 0,
  };

  const accessToken = jwt.sign(identity, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE,
    algorithm: 'HS256',
  });
  const refreshToken = jwt.sign(identity, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE,
    algorithm: 'HS256',
  });

  setAuthCookies(res, accessToken, refreshToken);
  return identity;
};
