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

// lib exports:
export declare const SecureHeaders: MiddlewareCreator<Pick<ResponseHeaders, keyof ResponseHeaders>>;