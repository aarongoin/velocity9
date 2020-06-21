import { statusCode, MiddlewareCreator } from "@velocity9/server";
import { defaultParseOptions, assertContentLength } from "./shared";
import { ParseOptions } from "./index.d";

export const ParseText: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  req
    .text()
    .then(next)
    .catch((err: Error) => res.status(statusCode.BadRequest).send(err.message));
};

export const ExpectText: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req)) {
    const contentType = req.getHeader("Content-Type");
    if (!contentType.includes("text")) {
      return res
        .status(statusCode.BadRequest)
        .send(
          `Unexpected Content-Type '${contentType}'. Expected a text MIME type.`
        );
    }
    return ParseText(options)({ res, req, next });
  }
};
