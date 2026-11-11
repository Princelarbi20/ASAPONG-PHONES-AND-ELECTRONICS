export const parseExpiryToMs = (value) => {
    const match = typeof value === 'string' && value.match(/^([1-9]\d*)([smhd])$/i);
    if (!match) throw new Error('Token expiry must use a positive duration such as 15m, 12h, or 7d.');

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    const milliseconds = amount * multipliers[unit];
    if (!Number.isSafeInteger(milliseconds)) throw new Error('Token expiry is outside the supported range.');
    return milliseconds;
};

const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge,
});

export const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, cookieOptions(parseExpiryToMs(process.env.ACCESS_TOKEN_EXPIRE)));
    res.cookie('refreshToken', refreshToken, cookieOptions(parseExpiryToMs(process.env.REFRESH_TOKEN_EXPIRE)));
};

export const clearAuthCookies = (res) => {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
    };
    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
};
