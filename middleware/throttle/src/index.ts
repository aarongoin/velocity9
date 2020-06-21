import { statusCode, HttpRequest, MiddlewareCreator } from "@velocity9/server";
import { SessionContext } from "@velocity9/auth";
import { ThrottleOptions } from "./index.d";

function throttleKey(req: HttpRequest, key = "global"): string {
  return `requests/${req.remoteAddress}/${key}/${Math.trunc(
    Date.now() / 1000
  )}`;
}

const Throttle: MiddlewareCreator<ThrottleOptions> = ({
  key,
  group,
  store,
  rate = 1000,
}) => async ({ res, req, session, next }: SessionContext) => {
  if (
    group == null ||
    (session && (session.group === 0 || (session.group & group) > 0))
  ) {
    const uniqueKey = throttleKey(req, key);
    // record request count under throttle key
    const count = await store.incr(uniqueKey);
    if (count === 1) store.expire(uniqueKey, 2);
    if (count > rate) return res.sendStatus(statusCode.TooManyRequests);
  }
  next();
};

export default Throttle;
