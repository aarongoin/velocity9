import Redis from "ioredis";
import { Job, JobScheduler as JobSchedulerInterface } from "./index.d";

function jobId(): string {
  return `${Date.now() & 0xfffffff}${(Math.random() * 0xffffffff) >>> 0}`;
}

export class JobScheduler implements JobSchedulerInterface {
  protected db: Redis.Redis;

  constructor(dbOptions: {}) {
    this.db = new Redis(dbOptions);
  }

  scheduleJob(job: Partial<Job<string>>, time = 0): Promise<string> {
    const key = job.key || `jobs/${job.type}/${jobId()}`;
    if (!job.key) job.key = key;
    if (!job.type) job.type = "global";
    if (!job.priority) job.priority = 1;
    job.state = time > 0 ? "scheduled" : "waiting";
    return new Promise((resolve, reject) => {
      const cmd = this.db.multi().set(key, JSON.stringify(job));
      (time > 0
        ? cmd.rpush("jobs/queue/scheduled", `${key}.${job.priority}.${time}`)
        : cmd.rpush(`jobs/queue/${job.priority}`, key)
      ).exec((err: Error | null) => (err ? reject(err) : resolve(key)));
    });
  }

  async end(): Promise<void> {
    await this.db.quit();
  }
}
