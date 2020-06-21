import { Readable, Writable } from "stream";
import {
  HttpResponse as UwsResponse,
  HttpRequest as UwsRequest,
  AppOptions as UwsOptions,
  RecognizedString,
  us_listen_socket
} from "uws";

export type Methods =
  | "get"
  | "post"
  | "patch"
  | "put"
  | "delete"
  | "head"
  | "trace";

export type StatusCode =
  | 100
  | 101
  | 103
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 300
  | 301
  | 302
  | 303
  | 304
  | 307
  | 308
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 511;

export interface HttpRequest<Data = undefined> {
  readonly params: Record<string, unknown>;
  readonly cookies: Record<string, string>;
  readonly body: Readable;
  readonly bodyUsed: boolean;
  readonly data: null | Data;
  readonly method: Methods;
  readonly url: string;
  readonly remoteAddress: string;
  getHeader(name: string): string;
  getHeaders(): Record<string, string>;
  arrayBuffer(valid: boolean): Promise<ArrayBuffer>;
  text(valid: boolean): Promise<string>;
  json(): Promise<Data>;
}

export interface CookieOptions {
  expires: string; // GMT datestring, ex. "Sun, 24 May 2020 06:28:36 GMT"
  maxAge: number;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict";
}

export interface HttpResponse {
  readonly body: Writable;
  readonly open: boolean;
  readonly done: Promise<"sent" | "aborted">;
  setHeader(name: string, value: string): HttpResponse;
  setCookie(
    name: string,
    value: string,
    options: null | Partial<CookieOptions>
  ): HttpResponse;
  setHeaders(headers: Record<string, string>): HttpResponse;
  status(code: number): HttpResponse;
  sendStatus(code: number): void;
  attach(filepath: string): void;
  redirect(path: string): void;
  json<Data>(body: Data): void;
  send(body?: RecognizedString): void;
  end(): void;
}

export type Handler = (context: RouteContext) => void;

export interface RouteContext<
  Response extends HttpResponse = HttpResponse,
  Request extends HttpRequest = HttpRequest
> extends AppContext {
  res: Response;
  req: Request;
  next(): void;
}

export interface Middleware<
  Response extends HttpResponse = HttpResponse,
  Request extends HttpRequest = HttpRequest
> {
  (context: RouteContext<Response, Request>): unknown;
}

export interface MiddlewareCreator<
  Options extends Record<string, unknown> = undefined,
  Response extends HttpResponse = HttpResponse,
  Request extends HttpRequest = HttpRequest
> {
  (options: Options): Middleware<Response, Request>;
}

export interface Route {
  use(middleware: Middleware): Route;
  get(handler: Handler): Route;
  post(handler: Handler): Route;
  put(handler: Handler): Route;
  del(handler: Handler): Route;
  head(handler: Handler): Route;
  trace(handler: Handler): Route;
  any(handler: Handler): void;
}

export interface AppOptions {
  ssl: UwsOptions | null;
}
export interface AppContext extends Record<string, unknown> {
  db?: Record<string, unknown>;
}
export interface Context extends Record<string, unknown> {
  db?: Record<string, unknown>;
}
export type Attachment<
  PreContext extends AppContext = {},
  PostContext extends PreContext = PreContext
> = (
  context: PreContext
) => undefined | null | ((context: PostContext) => unknown);

export interface AppInterface {
  attach(attachment: Context | Attachment): void;
  use(middleware: Middleware): AppInterface;
  route(pattern: string): Route;
  stop(): void;
  start(host: string, port: number): Promise<us_listen_socket>;
}

export interface Log {
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  critical(message: string): void;
}

// lib exports
// App.ts
export declare class App implements AppInterface {
  private core;
  private listenSocket;
  private context;
  private attachments;
  private middlewares;
  constructor({ ssl }?: Partial<AppOptions>);
  attach(attachment: Context | Attachment): void;
  stop(): void;
  use(middleware: Middleware): App;
  route(pattern: string): Route;
  start(host: string, port: number): Promise<us_listen_socket>;
}
// log.ts
export declare const log: Log;
// request.ts
declare type OnData = (
  handler: (chunk: ArrayBuffer, isLast: boolean) => void
) => unknown;
export declare class AppRequest<Data = undefined> implements HttpRequest<Data> {
  private req;
  private headers;
  readonly cookies: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly body: Readable;
  readonly bodyUsed: boolean;
  readonly data: null | Data;
  readonly method: Methods;
  readonly url: string;
  readonly remoteAddress: string;
  constructor(req: UwsRequest, body: OnData, remote: ArrayBuffer);
  getHeader(name: string): string;
  getHeaders(): Record<string, string>;
  arrayBuffer(valid?: boolean): Promise<ArrayBuffer>;
  text(valid?: boolean): Promise<string>;
  json(): Promise<Data>;
}
// response.ts
export declare class AppResponse implements HttpResponse {
  private res;
  private statusCode;
  private headers;
  private cookies;
  readonly body: Writable;
  readonly open = true;
  readonly done: Promise<"sent" | "aborted">;
  private close;
  constructor(res: UwsResponse);
  private writeHeaders;
  private writeCookies;
  private finalizeHeader;
  setHeader(name: string, value: string): AppResponse;
  setHeaders(headers: Record<string, string>): AppResponse;
  setCookie(
    name: string,
    value: string,
    options?: null | Partial<CookieOptions>
  ): AppResponse;
  status(code: StatusCode): AppResponse;
  sendStatus(code: StatusCode): void;
  attach(filepath: string): void;
  redirect(path: string): void;
  json<B>(body: B): void;
  send(body?: RecognizedString): void;
  end(): void;
}
// status.ts
declare type StatusName =
  | "Continue"
  | "SwitchingProtocol"
  | "EarlyHints"
  | "OK"
  | "Created"
  | "Accepted"
  | "NonAuthoritativeInformation"
  | "NoContent"
  | "ResetContent"
  | "PartialContent"
  | "MultipleChoice"
  | "MovedPermanently"
  | "Found"
  | "SeeOther"
  | "NotModified"
  | "TemporaryRedirect"
  | "PermanentRedirect"
  | "BadRequest"
  | "Unauthorized"
  | "PaymentRequired"
  | "Forbidden"
  | "NotFound"
  | "MethodNotAllowed"
  | "NotAcceptable"
  | "ProxyAuthenticationRequired"
  | "RequestTimeout"
  | "Conflict"
  | "Gone"
  | "LengthRequired"
  | "PreconditionFailed"
  | "PayloadTooLarge"
  | "URITooLong"
  | "UnsupportedMediaType"
  | "RangeNotSatisfiable"
  | "ExpectationFailed"
  | "ImaTeapot"
  | "TooEarly"
  | "UpgradeRequired"
  | "PreconditionRequired"
  | "TooManyRequests"
  | "RequestHeaderFieldsTooLarge"
  | "UnavailableForLegalReasons"
  | "InternalServerError"
  | "NotImplemented"
  | "BadGateway"
  | "ServiceUnavailable"
  | "GatewayTimeout"
  | "HTTPVersionNotSupported"
  | "NetworkAuthenticationRequired";
export declare const statusMessage: Record<StatusCode, string>;
export declare const statusCode: Record<StatusName, StatusCode>;
