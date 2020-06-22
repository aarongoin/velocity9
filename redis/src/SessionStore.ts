import Redis from "ioredis";
import { SessionData, SessionStoreInterface } from "@velocity9/auth";

export default class SessionStore implements SessionStoreInterface {
  private db: Redis.Redis;

  constructor(dbOptions: Redis.RedisOptions) {
    this.db = new Redis(dbOptions);
  }

  getSession(key: string): Promise<SessionData | null> {
    return this.db
      .get(key)
      .then(session => (session ? JSON.parse(session) : null));
  }

  setSession(key: string, value: SessionData): Promise<unknown> {
    return this.db.set(key, JSON.stringify(value));
  }

  delSession(key: string): Promise<unknown> {
    return this.db.del(key);
  }

  expireSession(key: string, inSeconds: number): Promise<unknown> {
    return this.db.expire(key, inSeconds);
  }
}
