import {
  statusCode,
  MiddlewareCreator,
} from "@velocity9/server";
import { getContentLength } from "./shared";
import { RequestPayloadLimitOptions } from "./index.d";

export const RequestPayloadLimit: MiddlewareCreator<RequestPayloadLimitOptions> = ({
  limit,
}) => ({ res, req, next }) => {
  const len = getContentLength(req);
  if (len > limit) return res.sendStatus(statusCode.PayloadTooLarge);
  next();
};