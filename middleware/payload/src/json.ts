import { statusCode, MiddlewareCreator } from "@velocity9/server";
import { defaultParseOptions, assertContentLength } from "./shared";
import { ParseOptions } from "./index.d";

export const ParseJson: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  req
    .json()
    .then(next)
    .catch((err: Error) => res.status(statusCode.BadRequest).send(err.message));
};

export const ExpectJson: MiddlewareCreator<ParseOptions> = (
  options = defaultParseOptions
) => ({ res, req, next }) => {
  if (!options[req.method]) return next();
  if (assertContentLength(res, req)) {
    const contentType = req.getHeader("Content-Type");
    if (contentType !== "application/json") {
      return res
        .status(statusCode.BadGateway)
        .send(
          `Unexpected Content-Type '${contentType}'. Expected 'application/json'.`
        );
    }
    return ParseJson(options)({ res, req, next });
  }
};
