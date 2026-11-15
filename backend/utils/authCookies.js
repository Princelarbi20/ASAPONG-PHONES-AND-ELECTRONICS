const parseExpiryToMs = (value) => {
    if (!value) return 15 * 60 * 1000;

    const match = value.match(/^(\d+)([smhd])$/i);
    if (!match) return 15 * 60 * 1000;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's':
            return amount * 1000;
        case 'm':
            return amount * 60 * 1000;
        case 'h':
            return amount * 60 * 60 * 1000;
        case 'd':
            return amount * 24 * 60 * 60 * 1000;
        default:
            return 15 * 60 * 1000;
    }
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
    res.clearCookie('accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });
};
