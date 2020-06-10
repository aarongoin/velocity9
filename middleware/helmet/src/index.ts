import { MiddlewareCreator } from "@velocity9/server";


export interface ResponseHeaders extends Record<string, string> {
  "X-DNS-Prefetch-Control": "on" | "off";
  "Content-Security-Policy": string;
  "X-Permitted-Cross-Domain-Policies": string;
  "X-Frame-Options": "NONE" | "SAMEORIGIN" | string;
  "X-Download-Options": "noopen";
  "X-Content-Type-Options": "nosniff";
  "Referrer-Policy":
    | "no-referrer"
    | "same-origin"
    | "unsafe-url"
    | "origin"
    | "no-referrer-when-downgrade"
    | "origin-when-cross-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  "X-XSS-Protection": "0" | "1" | "1; mode=block" | string;
}

export const SetHeaders: MiddlewareCreator<Partial<ResponseHeaders>> = (
  headers
) => (res, req, next) => {
  res.setHeaders(headers);
  next();
};

const defaultSecureHeaders: Partial<ResponseHeaders> = {
  "Content-Security-Policy": "default-src 'self'",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Download-Options": "noopen",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-XSS-Protection": "1; mode=block",
};

// TODO: check out: https://helmetjs.github.io/docs/expect-ct/
// TODO: check out: https://helmetjs.github.io/docs/feature-policy/
// TODO: check out: https://helmetjs.github.io/docs/hide-powered-by/
// TODO: check out: https://helmetjs.github.io/docs/hsts/

export const SecureHeaders: MiddlewareCreator<Partial<ResponseHeaders>> = (
  headers
) => {
  const secureHeaders: Partial<ResponseHeaders> = {
    ...defaultSecureHeaders,
    ...headers,
  };
  return (res, req, next) => {
    res.setHeaders(secureHeaders);
    next();
  };
};
