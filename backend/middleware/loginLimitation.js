import rateLimit from 'express-rate-limit';

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
