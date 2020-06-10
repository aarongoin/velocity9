import { status, ResponseData, RequestData, MiddlewareCreator } from "@velocity9/server";

type Encoding = "gzip" | "deflate" | "br";

const AnyEncoding = "br, gzip, deflate";

export interface CompressionOptions {
  encoding: Encoding;
  strict: boolean; // ensure that only this encoding is used and error when it's not
}

class Inflator extends RequestData {
  _encoding: Encoding;
  constructor(encoding: Encoding, wrap: RequestData) {
    super(wrap._source);
    this._encoding = encoding;
  }
  push(chunk: any, encoding?: string): boolean {
    // TODO: hook up to node's zlib
    // TODO: inflate chunk using this._encoding
    return super.push(chunk, encoding);
  }
}

class Deflator extends ResponseData {
  _encoding: Encoding;
  constructor(encoding: Encoding, wrap: ResponseData) {
    super(wrap._sink);
    this._encoding = encoding;
  }
  _write(chunk, _, cb) {
    // TODO: hook up to node's zlib
    // TODO: deflate chunk using this._encoding
    super._write(chunk, _, cb);
  }
}

export const Inflate: MiddlewareCreator<CompressionOptions> = ({
  encoding,
  strict,
}) => (res, req, next) => {
  const encoded = req.getHeader("Content-Encoding");
  if (encoded) {
    if (strict && encoded !== encoding)
      return res
        .setHeader("Accept-Encoding", encoding)
        .sendStatus(status.UnsupportedMediaType);
    // @ts-ignore
    req.body = new Inflator(encoded, req.body);
    res.setHeader("Accept-Encoding", strict ? encoding : AnyEncoding);
  }
  next();
};

export const Deflate: MiddlewareCreator<CompressionOptions> = ({
  encoding,
  strict,
}) => (res, req, next) => {
  // @ts-ignore
  res.body = new Deflator(encoding, res.body);
  res.setHeader("Content-Encoding", encoding);
  res.setHeader("Accept-Encoding", strict ? encoding : AnyEncoding);
  next();
};
