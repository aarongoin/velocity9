import { parentPort, workerData } from "worker_threads";
import { JobScheduler } from "./scheduler";
import { Job, Runnable, WorkerData, WorkerMessage } from "./index.d";

class JobWorker extends JobScheduler {
  private workerDir: string;
  private jobRunners: Record<string, Runnable<string>> = {};
  private active: boolean;

  constructor({ jobStorePath, workerDir }: WorkerData) {
    super(jobStorePath);
    this.workerDir = workerDir;
    this.active = true;

    parentPort?.on("message", (cmd: "stop" | "start"): void => {
      if (cmd === "start") this.getJob();
      else {
        this.active = false;
      }
    });
  }

  private postMessage(msg: WorkerMessage): void {
    parentPort?.postMessage(msg);
  }

  private getJobRunner(type: string): Runnable<string> {
    this.jobRunners[type] =
      this.jobRunners[type] || require(`${this.workerDir}/${type}`).default;
    return this.jobRunners[type];
  }

  private completeJob<T extends string, D = undefined>(
    job: Job<T>,
    result: D
  ): void {
    job.state = "complete";
    // @ts-expect-error 2339
    if (result) job.result = result;
    this.db.setJob(job.key, job);
    this.postMessage("completed");
  }

  private failJob<T extends string, E = undefined>(
    job: Job<T>,
    error: E
  ): void {
    job.state = "complete";
    // @ts-expect-error 2339
    if (error) job.error = error;
    this.db.setJob(job.key, job);
    this.postMessage("failed");
  }

  private async getJob(): Promise<void> {
    const jobKey = await this.db.getNextInQueue();
    if (jobKey) this.runJob(jobKey);
    else this.postMessage("idle");
  }

  private async runJob(jobKey: string): Promise<void> {
    const job = await this.db.getJob(jobKey);
    if (job) {
      const result = await this.getJobRunner(job.type)(job);
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
