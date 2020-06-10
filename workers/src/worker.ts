import { parentPort, workerData } from "worker_threads";
import { JobScheduler } from "./scheduler";
import { Job, Runnable } from "./index.d";

export interface WorkerData {
  queues: string[];
  dbOptions: {};
  workerDir: string;
}

export type WorkerState = "started" | "active" | "idle" | "stopped";

export type WorkerMessage = "stopped" | "idle" | "failed" | "completed";

class JobWorker extends JobScheduler {
  queues: string[];
  workerDir: string;
  jobRunners: Record<string, Runnable<string>> = {};
  active: boolean;

  constructor({ queues, dbOptions, workerDir }: WorkerData) {
    super(dbOptions);
    this.queues = queues;
    this.workerDir = workerDir;
    this.active = true;

    parentPort?.on("message", (cmd: "stop" | "start"): void => {
      if (cmd === "start") this.getJob();
      else {
        this.active = false;
      }
    });
  }

  postMessage(msg: WorkerMessage): void {
    parentPort?.postMessage(msg);
  }

  getJobRunner(type: string): Runnable<string> {
    this.jobRunners[type] =
      this.jobRunners[type] || require(`${this.workerDir}/${type}`).default;
    return this.jobRunners[type];
  }

  completeJob<T extends string, D = undefined>(job: Job<T>, result: D): void {
    job.state = "complete";
    // @ts-ignore
    if (result) job.result = result;
    this.db.set(job.key, JSON.stringify(job));
    this.postMessage("completed");
  }

  failJob<T extends string, E = undefined>(job: Job<T>, error: E): void {
    job.state = "complete";
    // @ts-ignore
    if (error) job.error = error;
    this.db.set(job.key, JSON.stringify(job));
    this.postMessage("failed");
  }

  async getJob() {
    const [, jobKey] = await this.db.blpop(...this.queues, 1);
    if (jobKey) this.runJob(jobKey);
    else this.postMessage("idle");
  }

  async runJob(jobKey: string) {
    const rawJob = await this.db.get(jobKey);
    if (rawJob) {
      const job = JSON.parse(rawJob) as Job<string>;

      // @ts-ignore
      const result = await this.getJobRunner(job.type)(job, db);

      if (result.action === "complete") this.completeJob(job, result.result);
      else if (result.action === "fail") this.failJob(job, result.error);
      else this.scheduleJob(job, result.time);
    } else {
      // TODO: log this as an error
      null;
    }

    if (this.active) this.getJob();
    else {
      await this.end();
      this.postMessage("stopped");
    }
  }
}

new JobWorker(workerData);
