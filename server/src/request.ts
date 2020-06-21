import { StringDecoder } from "string_decoder";
import { Readable } from "stream";
import { HttpRequest as UwsRequest } from "uws";
import { Methods, HttpRequest } from "./index.d";

type OnData = (
  handler: (chunk: ArrayBuffer, isLast: boolean) => void
) => unknown;

class RequestData extends Readable {
  _source: OnData;
  constructor(_source: OnData) {
    super();
    this._source = _source;
  }
  private _startRead() {
    const emptyBuffer = Buffer.from([]);
    this._source((chunk, isLast) => {
      // due to the way uWebSockets works, we have to copy the chunk it gives us unless it's the last chunk
      if (isLast) {
        this.push(chunk);
        this.push(null);
      } else {
        // use emptyBuffer to force Node.js to copy the chunk
        this.push(
          Buffer.concat(
            [Buffer.from(chunk, 0, chunk.byteLength), emptyBuffer],
            chunk.byteLength
          ),
          "utf8"
        );
      }
    });
  }
  _read() {
    this._startRead();
  }
}

export class AppRequest<Data = undefined> implements HttpRequest<Data> {
  private req: UwsRequest;
  private headers: Record<string, string> = {};
  readonly cookies: Record<string, string> = {};
  readonly params: Record<string, unknown> = {};
  readonly body: Readable;
  readonly bodyUsed: boolean = false;
  readonly data: null | Data = null;
  readonly method: Methods;
  readonly url: string;
  readonly remoteAddress: string;

  constructor(req: UwsRequest, body: OnData, remote: ArrayBuffer) {
    this.req = req;
    this.body = new RequestData(body);
    this.remoteAddress = new StringDecoder("utf8").end(Buffer.from(remote));
    this.method = req.getMethod().toLocaleLowerCase() as Methods;
    this.url = req.getUrl();
    // parse cookies
    for (const cookie of req.getHeader("cookie").split("; ")) {
      const [name, value] = cookie.split("=");
      this.cookies[name] = value;
    }
  }

  getHeader(name: string): string {
    const lower = name.toLowerCase();
    if (this.headers[lower] === undefined)
      this.headers[lower] = this.req.getHeader(lower);
    return this.headers[lower];
  }

  getHeaders(): Record<string, string> {
    this.req.forEach((name: string, value: string) => {
      this.headers[name] = value;
    });
    return this.headers;
  }

  arrayBuffer(valid = true): Promise<ArrayBuffer> {
    // short-circuit if we've already parsed the data
    if (valid && this.data)
      return Promise.resolve((this.data as unknown) as ArrayBuffer);
    return new Promise(resolve => {
      let buffer = new Buffer(0);
      const len = +this.getHeader("Content-Length");
      if (!Number.isNaN(len) && len > 0) {
        let chunk;
        while (null !== (chunk = this.body.read())) {
          buffer = Buffer.concat(
            [chunk, buffer],
            buffer.byteLength + chunk.byteLength
          );
        }
      }
      // @ts-expect-error 2540 - bodyUsed is only read-only to external users
      this.bodyUsed = true;
      // @ts-expect-error 2540 - data is only read-only to external users
      if (valid) this.data = buffer.buffer;
      resolve(buffer.buffer);
    });
  }

  text(valid = true): Promise<string> {
    // short-circuit if we've already parsed the data
    if (valid && this.data)
      return Promise.resolve((this.data as unknown) as string);
    return this.arrayBuffer(false).then(buffer => {
      const str = new StringDecoder("utf8").end(Buffer.from(buffer));
      // @ts-expect-error 2540 - data is only read-only to external users
      if (valid) this.data = str;
      return str;
    });
  }

  json(): Promise<Data> {
    // short-circuit if we've already parsed the data
    if (this.data) return Promise.resolve(this.data);
    return this.text(false).then(str => {
      try {
        // @ts-expect-error 2540 - data is only read-only to external users
        this.data = JSON.parse(str);
      } catch (err) {
        throw err;
      }
      return this.data as Data;
    });
  }
}
