import Redis from "ioredis";
import { ThrottleStoreInterface } from "@velocity9/throttle";

export default class ThrottleStore implements ThrottleStoreInterface {
  private db: Redis.Redis;

  constructor(dbOptions: Redis.RedisOptions) {
    this.db = new Redis(dbOptions);
  }

  incrementKey(key: string): Promise<number> {
    return this.db.incr(key);
  }

  expireKey(key: string, inSeconds: number): Promise<unknown> {
    return this.db.expire(key, inSeconds);
  }
}
