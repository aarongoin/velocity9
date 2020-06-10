import { status, MiddlewareCreator } from "@velocity9/server";

interface SessionData {
  id: string;
  csrf: string;
  user_id: null | number;
  group: number;
  started: number; // timestamp of when session was started
}

export type SessionInstance<S extends SessionData = SessionData> = S & {
  update(data: Partial<Omit<SessionData, "id" | "started">>): Promise<void>;
  destroy(): Promise<unknown>;
};

// session db should conform to this interface
export interface SessionStore {
  set(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<string>;
  del(key: string): Promise<unknown>;
  expire(key: string, time: number): Promise<unknown>;
}

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function hash(len = 32) {
  let id = "";
  while (len--) {
    id += alphabet[Math.random() * 62 >> 0]
  }
  return id
}

function createSession(from: SessionData, store: SessionStore): SessionInstance {
  return {
    ...from,
    update: async (data) => {
      const keys = Object.keys(data).filter(
        (key) =>
          key !== "update" && key !== "destroy" && data[key] !== this[key]
      );
      if (keys.length) {
        for (const key of keys) this[key] = data[key];
        const { update, destroy, ...session } = this;
        await store.set(`sessions/${this.id}`, JSON.stringify(session));
      }
      return Promise.resolve();
    },
    destroy: () => store.del(`sessions/${this.id}`),
  };
}

async function newSession(store: SessionStore): Promise<SessionInstance> {
  const id = hash();
  const session = {
    id,
    csrf: hash(),
    user_id: null,
    group: 0,
    started: Date.now(),
  };
  await store.set(`sessions/${id}`, JSON.stringify(session));
  return createSession(session, store);
}

async function getSession(id: string, store: SessionStore): Promise<SessionInstance | null> {
  const session = JSON.parse(await store.get(`sessions/${id}`));
  return session ? createSession(session, store) : null;
}

export interface SessionOptions {
  store: SessionStore; // interface wrapping db that stores sessions
  domain?: string;
  useCsrfToken?: boolean;
  idleTimeout?: number; // time in seconds
  maxLength?: number; // time in seconds
  autoRenew?: boolean; // whether or not session should be renewed upon every request
}

export const Session: MiddlewareCreator<SessionOptions> = ({
  domain,
  useCsrfToken = true,
  idleTimeout = 1800, // 30 minutes
  maxLength = 604800, // 1 week
  autoRenew = true, // will reset the idleTimeout every request but will not override maxLength
  store,
}) => async (res, req, next) => {
  let isNewSession = false;
  if (req.cookies.session_id) {
    req.session = await getSession(req.cookies.session_id, store);
    // should session be forced to expire?
    if (
      maxLength &&
      req.session &&
      Date.now() - req.session.started > maxLength
    ) {
      req.session.destroy();
      req.session = null;
    }
  }
  if (!req.cookies.session_id || !req.session) {
    isNewSession = true;
    req.session = await newSession(store);
  }
  if (autoRenew || isNewSession) {
    store.expire(`sessions/${req.session.id}`, idleTimeout);
    domain = domain || req.getHeader("host");
    res.setCookie("session_id", req.session.id, {
      domain,
      maxAge: idleTimeout,
      sameSite: "strict",
      secure: true,
    });
    if (useCsrfToken)
      res.setCookie("csrf-token", req.session.csrf, {
        domain,
        maxAge: idleTimeout,
        sameSite: "strict",
      });
  }
  if (
    useCsrfToken &&
    !isNewSession &&
    req.session.csrf !==
      (req.getHeader("x-csrf-token") || req.params.csrf_token)
  ) {
    // TODO: log this csrf attempt
    return res.sendStatus(status.Forbidden);
  }
  next();
};
