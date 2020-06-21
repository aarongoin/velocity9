import { MiddlewareCreator } from "@velocity9/server";
import { ResponseHeaders } from "./index.d";

const defaultSecureHeaders = {
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
export const SecureHeaders: MiddlewareCreator<Pick<ResponseHeaders, keyof ResponseHeaders>> = (
  headers
) => {
  const secureHeaders = {
    ...defaultSecureHeaders,
    ...headers,
  };
  return ({ res, next }) => {
    res.setHeaders(secureHeaders);
    next();
  };
};
