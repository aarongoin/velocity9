import { Worker } from "worker_threads";
import {
  JobStats,
  JobManagerOptions,
  JobManagerInterface,
  JobStoreInterface,
  WorkerData,
  WorkerState,
  WorkerMessage
} from "./index.d";

function statsObject(): JobStats {
  return {
    liveWorkers: 0,
    idleWorkers: 0,
    stoppedWorkers: 0,
    completedJobs: 0,
    failedJobs: 0,
    scheduledJobs: 0
  };
}

export class JobManager implements JobManagerInterface {
  private active = false;
  private maxWorkers = 0;
  private workers: Array<[Worker, WorkerState]> = [];
  private pollRate: number;
  private workerData: WorkerData;
  private stats: JobStats;
  private db: JobStoreInterface;

  constructor({
    jobStorePath,
    workerDir,
    maxWorkers = 4,
    pollRate = 1000
  }: JobManagerOptions) {
    this.db = require(jobStorePath).default;
    this.maxWorkers = maxWorkers;
    this.pollRate = pollRate;
    this.stats = statsObject();

    this.workerData = {
      jobStorePath,
      workerDir
    };
  }

  private startWorker(index: number) {
    const worker = new Worker("./worker", { workerData: this.workerData });
    this.workers.push([worker, "started"]);
    worker.on("online", () => {
      this.workers[index][1] = "active";
    });
    worker.on("message", (msg: WorkerMessage): void => {
      switch (msg) {
        case "completed":
          this.stats.completedJobs++;
          break;
        case "failed":
          this.stats.failedJobs++;
          break;
        case "idle":
          this.workers[index][1] = msg;
          break;
        case "stopped":
          this.workers[index][1] = msg;
          this.workers[index][0].terminate();
      }
    });
    worker.on("error", () => {
      // TODO: log this error
      if (this.active) this.startWorker(index);
    });
  }

  private scheduleJobs() {
    this.db
      .pullScheduledUntil(Date.now())
      .then(jobs => {
        const todo = jobs.reduce<Record<string, string[]>>((acc, [, job]) => {
          const [jobId, priority] = job.split(".");
          acc[priority] = acc[priority] || [];
          acc[priority].push(jobId);
          return acc;
        }, {});
        Object.entries(todo).forEach(([priority, jobs]) =>
          this.db.addAllToQueue(+priority, jobs)
        );
      })
      .catch(err => {
        // TODO: handle this error!
        throw err;
      });
  }

  private async run() {
    if (this.active === false) this.shutdown();

    const idle = this.workers.filter(([, state]) => state === "idle");
    if (idle.length > 0) {
      // get the number of outstanding jobs
      let jobCount = await this.db.getQueuedLength();
      if (jobCount) {
        // wake up as many workers as necessary to handle these jobs
        for (const [worker] of idle) {
          if (jobCount-- === 0) break;
          worker.postMessage("start");
        }
      }
    }
    this.scheduleJobs();

    // check back for more jobs in a second
    setTimeout(() => this.run(), this.pollRate);
  }

  private async shutdown(): Promise<void> {
    const running = this.workers.some(([, state]) => state !== "stopped");
    if (running)
      setTimeout(() => this.shutdown(), Math.max(this.pollRate >>> 1, 10));
    else await this.db.closeConnection();
  }

  start(): void {
    this.active = true;
    while (this.workers.length < this.maxWorkers)
      this.startWorker(this.workers.length);
    this.run();
  }

  stop(): void {
    this.active = false;
    for (const [worker] of this.workers) worker.postMessage("stop");
  }
}
