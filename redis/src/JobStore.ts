import Redis from "ioredis";
import { Job, JobStats, JobStoreInterface } from "@velocity9/workers";

export default class JobStore implements JobStoreInterface {
  private db: Redis.Redis;
  private queues: string[];

  constructor(dbOptions: Redis.RedisOptions) {
    this.db = new Redis(dbOptions);
    this.queues = new Array(5)
      .fill("jobs/queue/")
      .map((v, i) => `${v}${i + 1}`);
  }

  setJob(jobKey: string, job: Job<string>): Promise<unknown> {
    return this.db.set(jobKey, JSON.stringify(job));
  }

  getJob(jobKey: string): Promise<Job<string> | null> {
    return this.db.get(jobKey).then(job => (job ? JSON.parse(job) : null));
  }

  getNextInQueue(): Promise<string | null> {
    return this.db.blpop(...this.queues, 1).then(([, jobKey]) => jobKey);
  }

  getQueuedLength(): Promise<number> {
    return this.db
      .multi(this.queues.map(key => ["llen", key]))
      .exec((err, counts) => {
        if (err) {
          throw err;
        } else return counts.reduce((sum, [, count]) => +count + sum, 0);
      });
  }

  addToQueue(priority: number, value: string): Promise<unknown> {
    return this.db.rpush(this.queues[priority - 1], value);
  }

  addAllToQueue(priority: number, values: string[]): Promise<unknown> {
    return this.db.rpush(this.queues[priority - 1], ...values);
  }

  addToSchedule(time: number, value: string): Promise<unknown> {
    return this.db.zadd("jobs/queue/scheduled", time, value);
  }

  pullScheduledUntil(time: number): Promise<string[]> {
    return this.db
      .multi()
      .zrangebyscore("jobs/queue/scheduled", 0, time)
      .zremrangebyscore("jobs/queue/scheduled", 0, time)
      .exec((err, [jobs, _]) => {
        if (err) {
          throw err;
        } else return jobs.map(([, v]) => v);
      });
  }

  getScheduledLength(): Promise<number> {
    return this.db.zcard("jobs/queue/scheduled");
  }

  recordJobStats(stats: JobStats): Promise<unknown> {
    // @ts-expect-error 2339 - flat() ACTUALLY does exist!
    return this.db.xadd("jobs/stats", Object.entries(stats).flat());
  }

  closeConnection(): Promise<void> {
    return this.db.quit().then(() => undefined);
  }
}
