import rateLimit from 'express-rate-limit';

const limiterMessage = (message) => ({ success: false, message });

export const authAttemptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: limiterMessage('Too many authentication attempts. Please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
});

export const otpAttemptLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: limiterMessage('Too many verification attempts. Please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
});

export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: limiterMessage('Too many registration attempts. Please try again later.'),
    standardHeaders: true,
    legacyHeaders: false,
});

 export const apiLimiter = rateLimit({
    windowMs: 50 * 60 * 1000, 
    max: 5,                   
    message: {
        success: false,
        message: "Too many login attempts, please try again after 50 minutes."
    },
    standardHeaders: true,    
    legacyHeaders: false,
});
