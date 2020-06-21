import { statusCode, HttpRequest, HttpResponse } from "@velocity9/server";
import { ParseOptions } from "./index.d";

export function getContentLength(req: HttpRequest): number {
  const len = +req.getHeader("Content-Length");
  return Number.isNaN(len) ? 0 : len;
}

export function assertContentLength(
  res: HttpResponse,
  req: HttpRequest
): boolean {
  const len = getContentLength(req);
  if (len === 0) {
    res.sendStatus(statusCode.LengthRequired);
    return false;
  }
  return true;
}

export const defaultParseOptions: ParseOptions = {
  post: true,
  patch: true,
  put: true,
};
