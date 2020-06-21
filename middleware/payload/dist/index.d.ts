import { MiddlewareCreator } from "@velocity9/server";

export interface RequestPayloadLimitOptions {
  limit: number;
}

export interface ParseOptions {
  get?: boolean;
  post?: boolean;
  patch?: boolean;
  put?: boolean;
  delete?: boolean;
  head?: boolean;
  trace?: boolean;
}

// lib exports:
// length.ts
export declare const RequestPayloadLimit: MiddlewareCreator<RequestPayloadLimitOptions>;
// text.ts
export declare const ParseText: MiddlewareCreator<ParseOptions>;
export declare const ExpectText: MiddlewareCreator<ParseOptions>;
// json.ts
export declare const ParseJson: MiddlewareCreator<ParseOptions>;
export declare const ExpectJson: MiddlewareCreator<ParseOptions>;
//buffer.ts
export declare const ParseArrayBuffer: MiddlewareCreator<ParseOptions>;
export declare const ExpectArrayBuffer: MiddlewareCreator<ParseOptions>;
