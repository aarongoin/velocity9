import path from "path";
import { Writable } from "stream";
import { HttpResponse as UwsResponse, RecognizedString } from "uws";
import { statusMessage } from "./status";
import mimeType from "./mime";
import { HttpResponse, CookieOptions, StatusCode } from "./index.d";

function cookie(
  name: string,
  value: string,
  options: null | Partial<CookieOptions>
): string {
  if (options === null) return `${name}=${value}`;

  let attributes = "";
  if (options.expires) attributes = `${attributes}; Expires=${options.expires}`;
  if (options.maxAge) attributes = `${attributes}; Max-Age=${options.maxAge}`;
  if (options.path) attributes = `${attributes}; Path=${options.path}`;
  if (options.domain) attributes = `${attributes}; Domain=${options.domain}`;
  if (options.sameSite)
    attributes = `${attributes}; SameSite=${
      options.sameSite === "lax" ? "Lax" : "Strict"
    }`;
  if (options.httpOnly) attributes = `${attributes}; HttpOnly`;
  if (options.secure) attributes = `${attributes}; Secure`;

  return attributes ? `${name}=${value}; ${attributes}` : `${name}=${value}`;
}

class ResponseData extends Writable {
  _sink: UwsResponse;
  constructor(_sink: UwsResponse) {
    super();
    this._sink = _sink;
  }
  // @ts-expect-error 7006
  _write(chunk, _, cb) {
    this._sink.write(chunk);
    cb(null);
  }
}

export class AppResponse implements HttpResponse {
  private res: UwsResponse;
  private statusCode: StatusCode = 200;
  private headers: Record<string, string> = {};
  private cookies: Record<string, [string, null | Partial<CookieOptions>]> = {};

  readonly body: Writable;

  readonly open = true;

  readonly done: Promise<"sent" | "aborted">;
  private close: null | ((reason: "sent" | "aborted") => void) = null;

  constructor(res: UwsResponse) {
    this.res = res;
    this.body = new ResponseData(res);
    this.done = new Promise(resolve => {
      this.close = resolve;
    });
    this.res.onAborted(() => {
      // @ts-expect-error 2540 - open is only read-only to external users
      this.open = false;
      if (this.close) this.close("aborted");
    });
  }

  private writeHeaders(): void {
    for (const [header, value] of Object.entries(this.headers))
      this.res.writeHeader(header, value);
  }

  private writeCookies(): void {
    for (const [name, [value, options]] of Object.entries(this.cookies))
      this.res.writeHeader("Set-Cookie", cookie(name, value, options));
  }

  private finalizeHeader(): void {
    this.res.writeStatus(statusMessage[this.statusCode]);
    this.writeHeaders();
    this.writeCookies();
  }

  setHeader(name: string, value: string): AppResponse {
    this.headers[name] = value;
    return this;
  }

  setHeaders(headers: Record<string, string>): AppResponse {
    for (const [name, value] of Object.entries(headers))
      this.headers[name] = value;
    return this;
  }

  setCookie(
    name: string,
    value: string,
    options: null | Partial<CookieOptions> = null
  ): AppResponse {
    this.cookies[name] = [value, options];
    return this;
  }

  status(code: StatusCode): AppResponse {
    if (process.env.NODE_ENV === "development") {
      if (!statusMessage[code])
        throw new Error(`No response exists for status code ${code}`);
    }
    this.statusCode = code;
    return this;
  }

  sendStatus(code: StatusCode): void {
    if (process.env.NODE_ENV === "development") {
      if (!statusMessage[code])
        throw new Error(`No response exists for status code ${code}`);
    }
    this.statusCode = code;
    this.end();
  }

  attach(filepath: string): void {
    const filename = path.extname(filepath);
    this.headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    this.headers["Content-Type"] =
      mimeType[filename.split(".")[1] || "bin"] || "application/octet-stream";
  }

  redirect(path: string): void {
    this.headers["Redirect"] = path || "/";
    this.end();
  }

  json<B>(body: B): void {
    const json = JSON.stringify(body);
    this.headers["Content-Type"] = "application/json";
    this.send(json);
  }

  send(body?: RecognizedString): void {
    // @ts-expect-error 2540 - open is only read-only to external users
    this.open = false;
    this.res.cork(() => {
      this.finalizeHeader();
      this.res.end(body);
    });
  }

  end(): void {
    this.finalizeHeader();
    // @ts-expect-error 2540 - open is only read-only to external users
    this.open = false;
    this.res.close();
    if (this.close) this.close("sent");
  }
}
