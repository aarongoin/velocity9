import { status, MiddlewareCreator } from "@velocity9/server";

function getContentLength(req): number {
  const len = +req.getHeader("Content-Length");
  return Number.isNaN(len) ? 0 : len;
}

function assertContentLength(res, req): boolean {
  const len = getContentLength(req);
  if (len === 0) {
    res.sendStatus(status.LengthRequired);
    return false;
  }
  return true;
}

export const RequestPayloadLimit: MiddlewareCreator<number> = (limit) => (
  res,
  req,
  next
) => {
  const len = getContentLength(req);
  if (len > limit) return res.sendStatus(status.PayloadTooLarge);
  next();
};

interface ParseOptions {
  get?: boolean;
  post?: boolean;
  patch?: boolean;
  put?: boolean;
  delete?: boolean;
  head?: boolean;
  trace?: boolean;
}

const defaultParseOptions: ParseOptions = {
  post: true,
  patch: true,
  put: true,
};

export const ParseArrayBuffer: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next) => {
  if (!options[req.method]) return next();
  req.arrayBuffer().then(next);
};

export const ExpectArrayBuffer: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next, db) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req))
    return ParseArrayBuffer(options)(res, req, next, db);
};

export const ParseJson: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next) => {
  if (!options[req.method]) return next();
  req
    .json()
    .then(next)
    .catch((err: Error) => res.status(400).send(err.message));
};

export const ExpectJson: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next, db) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req)) {
    const contentType = req.getHeader("Content-Type");
    if (contentType !== "application/json") {
      return res
        .status(400)
        .send(
          `Unexpected Content-Type '${contentType}'. Expected 'application/json'.`
        );
    }
    return ParseJson(options)(res, req, next, db);
  }
};

export const ParseText: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next) => {
  if (!options[req.method]) return next();
  req.text().then(next);
};

export const ExpectText: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => (res, req, next, db) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req)) {
    const contentType = req.getHeader("Content-Type");
    if (!contentType.includes("text")) {
      return res
        .status(400)
        .send(
          `Unexpected Content-Type '${contentType}'. Expected a text MIME type.`
        );
    }
    return ParseText(options)(res, req, next, db);
  }
};
