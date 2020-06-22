import {
  RouteContext,
  HttpRequest,
  HttpResponse,
  MiddlewareCreator
} from "@velocity9/server";

export interface SessionData<D = unknown> extends Record<string, unknown> {
  id: string;
  csrf: string;
  user_id: null | number;
  group: number;
  data?: D;
  started: number; // timestamp of when session was started
}

export interface SessionInstance<D = unknown> extends SessionData<D> {
  update(data: Partial<Omit<SessionData<D>, "id" | "started">>): Promise<void>;
  destroy(): Promise<unknown>;
}

// session db should conform to this interface
export interface SessionStoreInterface {
  getSession(key: string): Promise<SessionData | null>;
  setSession(key: string, value: SessionData): Promise<unknown>;
  delSession(key: string): Promise<unknown>;
  expireSession(key: string, inSeconds: number): Promise<unknown>;
}

export interface SessionOptions {
  domain?: string;
  useCsrfToken?: boolean;
  idleTimeout?: number; // time in seconds
  maxLength?: number; // time in seconds
  autoRenew?: boolean; // whether or not session should be renewed upon every request
}

export interface AuthorizeOptions {
  group: number;
  redirect?: string;
}

export interface SessionContext
  extends Pick<
    RouteContext<HttpResponse, HttpRequest>,
    "req" | "res" | "next"
  > {
  session?: null | SessionInstance;
  db?: RouteContext.db & { session: SessionStoreInterface };
}

// lib exports

export declare const Session: MiddlewareCreator<SessionOptions>;
export declare const Authorize: MiddlewareCreator<AuthorizeOptions>;
export declare const AllGroups = 4294967295;
