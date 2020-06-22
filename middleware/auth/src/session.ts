import { statusCode, MiddlewareCreator } from "@velocity9/server";
import {
  SessionInstance,
  SessionData,
  SessionOptions,
  SessionStoreInterface,
  SessionContext
} from "./index.d";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function hash(len = 32) {
  let id = "";
  while (len--) {
    id += alphabet[(Math.random() * 62) >> 0];
  }
  return id;
}

function createSession<D = unknown>(
  from: SessionData<D>,
  store: SessionStoreInterface
): SessionInstance {
  return {
    ...from,
    update: async data => {
      // @ts-expect-error 2683 - `this` is the session instance
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { update, destroy, ...session } = this as SessionInstance;
      const keys = Object.keys(data).filter(key => data[key] !== session[key]);
      if (keys.length) {
        for (const key of keys) session[key] = data[key];
        await store.setSession(`sessions/${session.id}`, session);
      }
      return Promise.resolve();
    },
    // @ts-expect-error 2683 - `this` is the session instance
    destroy: () => store.delSession(`sessions/${this.id}`)
  };
}

async function newSession(store: SessionStoreInterface): Promise<SessionInstance> {
  const id = hash();
  const session = {
    id,
    csrf: hash(),
    user_id: null,
    group: 0,
    started: Date.now()
  };
  await store.setSession(`sessions/${id}`, session);
  return createSession(session, store);
}

async function getSession(
  id: string,
  store: SessionStoreInterface
): Promise<SessionInstance | null> {
  const session = await store.getSession(`sessions/${id}`);
  return session ? createSession(session, store) : null;
}

export const Session: MiddlewareCreator<SessionOptions> = ({
  domain,
  useCsrfToken = true,
  idleTimeout = 1800, // 30 minutes
  maxLength = 604800, // 1 week
  autoRenew = true // will reset the idleTimeout every request but will not override maxLength
}) => async (context: SessionContext) => {
  const { req, res, next, db } = context;
  if (process.env.NODE_ENV === "development") {
    if (!db)
      throw new Error(
        "Cannot use session middleware without access to a session db."
      );
  }
  let isNewSession = false;
  if (req.cookies.session_id) {
    context.session = await getSession(req.cookies.session_id, db.session);
    // should session be forced to expire?
    if (
      maxLength &&
      context.session &&
      Date.now() - context.session.started > maxLength
    ) {
      context.session.destroy();
      context.session = null;
    }
  }
  if (!req.cookies.session_id || !context.session) {
    isNewSession = true;
    context.session = await newSession(db.session);
  }
  if (autoRenew || isNewSession) {
    db.session.expireSession(`sessions/${context.session.id}`, idleTimeout);
    domain = domain || req.getHeader("host");
    res.setCookie("session_id", context.session.id, {
      domain,
      maxAge: idleTimeout,
      sameSite: "strict",
      secure: true
    });
    if (useCsrfToken)
      res.setCookie("csrf-token", context.session.csrf, {
        domain,
        maxAge: idleTimeout,
        sameSite: "strict"
      });
  }
  if (
    useCsrfToken &&
    !isNewSession &&
    context.session.csrf !==
      (req.getHeader("x-csrf-token") || req.params.csrf_token)
  ) {
    // TODO: log this csrf attempt
    return res.sendStatus(statusCode.Forbidden);
  }
  next();
};
