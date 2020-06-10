import { status, AppRequest, MiddlewareCreator } from "@velocity9/server";

function throttleKey(req: AppRequest, key = "global"): string {
  return `requests/${req.remoteAddress}/${key}/${Math.trunc(
    Date.now() / 1000
  )}`;
}

export interface ThrottleOptions {
  key?: string; // the unique key for this throttle (usefult when applying a throttle to a subset of your app routes)
  rate: number; // max number of requests per second before throttling an ip address
  group?: number; // the user groups this throttle applies to (else apply to all groups)
}

const defaultOptions: ThrottleOptions = {
  rate: 1000
};

const Throttle: MiddlewareCreator<ThrottleOptions> = ({
  key,
  rate,
  group,
} = defaultOptions) => async ({ res, req, store }, next) => {
  if (
    group == null ||
    req.session.group === 0 ||
    (req.session.group & group) > 0
  ) {
    const uniqueKey = throttleKey(req, key);
    // record request count under throttle key
    const count = await store.session.incr(uniqueKey);
    if (count === 1) store.session.expire(uniqueKey, 2);
    if (count > rate) return res.sendStatus(status.TooManyRequests);
  }
  next();
};

export default Throttle;