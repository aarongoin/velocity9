'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const defaultSecureHeaders = {
    "Content-Security-Policy": "default-src 'self'",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Download-Options": "noopen",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-XSS-Protection": "1; mode=block",
};
const SecureHeaders = (headers) => {
    const secureHeaders = Object.assign(Object.assign({}, defaultSecureHeaders), headers);
    return ({ res, next }) => {
        res.setHeaders(secureHeaders);
        next();
    };
};

exports.SecureHeaders = SecureHeaders;
