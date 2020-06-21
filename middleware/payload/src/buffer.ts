import { statusCode, MiddlewareCreator } from "@velocity9/server";
import { defaultParseOptions, assertContentLength } from "./shared";
import { ParseOptions } from "./index.d";

export const ParseArrayBuffer: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  req
    .arrayBuffer()
    .then(next)
    .catch((err: Error) => res.status(statusCode.BadRequest).send(err.message));
};

export const ExpectArrayBuffer: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req))
    return ParseArrayBuffer(options)({ res, req, next });
};
