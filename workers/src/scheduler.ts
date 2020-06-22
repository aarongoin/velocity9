import { Job, JobSchedulerInterface, JobStoreInterface } from "./index.d";

function jobId(): string {
  return `${Date.now() & 0xfffffff}${(Math.random() * 0xffffffff) >>>
    0}`.padEnd(19, "0");
}

export class JobScheduler implements JobSchedulerInterface {
  protected db: JobStoreInterface;

  constructor(jobStorePath: string) {
    this.db = require(jobStorePath).default;
  }

  async scheduleJob(job: Partial<Job<string>>, time = 0): Promise<string> {
    const key = job.key || `jobs/${job.type}/${jobId()}`;
    if (!job.key) job.key = key;
    if (!job.type) job.type = "global";
    if (!job.priority) job.priority = 1;
    job.state = time > 0 ? "scheduled" : "waiting";
    try {
      await this.db
        .setJob(key, job)
        .then(() =>
          time > 0
            ? this.db.addToSchedule(time, `${key}.${job.priority}`)
            : this.db.addToQueue(job.priority || 1, key)
        );
      return key;
    } catch (err) {
      throw err;
    }
  }

  async end(): Promise<void> {
    await this.db.closeConnection();
  }
}
