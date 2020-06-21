import { Worker } from "worker_threads";
import Redis from "ioredis";
import { WorkerData, WorkerState, WorkerMessage } from "./worker";
import {
  JobStats,
  JobManagerOptions,
  JobManagerInterface,
} from "./index.d";

function statsObject(priorityLevels: number): JobStats {
  return {
    liveWorkers: 0,
    idleWorkers: 0,
    completedJobs: 0,
    failedJobs: 0,
    jobQueues: new Array(priorityLevels).fill(0),
    scheduledJobs: 0,
  };
}

export class JobManager implements JobManagerInterface {
  private active: boolean = false;
  private workers: Array<[Worker, WorkerState]> = [];

  private db: Redis.Redis;

  private maxWorkers: number = 0;
  private queues: string[] = [];
  private workerData: WorkerData;
  private stats: JobStats;

  constructor({
    priorityLevels = 5,
    maxWorkers = 4,
    dbOptions,
    workerDir,
  }: JobManagerOptions) {
    if (priorityLevels < 5) priorityLevels = 5;
    this.db = new Redis(dbOptions);
    this.maxWorkers = maxWorkers;
    this.queues = new Array(priorityLevels)
      .fill("jobs/queue/")
      .map((v, i) => `${v}${i + 1}`);

    this.stats = statsObject(priorityLevels);

    this.workerData = {
      queues: this.queues,
      dbOptions,
      workerDir,
    };
  }

  private startWorker(index: number) {
    const worker = new Worker("./worker", { workerData: this.workerData });
    this.workers.push([worker, "started"]);
    worker.on("online", () => {
      this.stats.liveWorkers++;
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
          this.stats.idleWorkers++;
          this.workers[index][1] = msg;
          break;
        case "stopped":
          if (this.workers[index][1] === "idle") this.stats.idleWorkers--;
          this.workers[index][0].terminate();
          this.stats.liveWorkers--;
      }
    });
    worker.on("error", () => {
      // TODO: log this error
      if (this.workers[index][1] === "idle") this.stats.idleWorkers--;
      this.stats.liveWorkers--;
      if (this.active) this.startWorker(index);
    });
  }

  private scheduleJobs() {
    const now = Date.now();
    this.db
      .multi()
      .zrangebyscore("jobs/queue/scheduled", 0, now)
      .zremrangebyscore("jobs/queue/scheduled", 0, now)
      .zcard("jobs/queue/scheduled")
      .exec((err, [jobs, _, [, scheduled]]) => {
        if (err) {
          // TODO: handle this error!
        } else if (jobs.length) {
          this.stats.scheduledJobs = scheduled;
          const todo = jobs
            .reduce<string[][]>(
              (acc, [, job]) => {
                const [jobId, priority] = job.split(".");
                acc[priority - 1].push(jobId);
                return acc;
              },
              this.queues.map((key) => [key])
            )
            .filter((cmd) => cmd.length > 1);
          this.db.multi(todo).exec((err) => {
            if (err) {
              // TODO: handle this error!
            }
          });
        }
      });
  }

  private async getCount(): Promise<number> {
    return new Promise((resolve) => {
      this.db
        .multi(this.queues.map((key) => ["llen", key]))
        .exec((_, results) => {
          // TODO: log this error
          const counts = results.map(([, v]) => +v);
          this.stats.jobQueues = counts;
          resolve(counts.reduce((sum, v) => sum + v, 0));
        });
    });
  }

  private async run() {
    if (this.active === false) this.shutdown();

    const idle = this.workers.filter(([, state]) => state === "idle");
    if (idle.length > 0) {
      // get the number of outstanding jobs
      let jobCount = await this.getCount();
      if (jobCount) {
        // wake up as many workers as necessary to handle these jobs
        for (const [worker] of idle) {
          if (jobCount-- === 0) break;
          worker.postMessage("start");
          this.stats.idleWorkers--;
        }
      }
    }
    this.scheduleJobs();

    // @ts-ignore - flat() is a valid array method
    this.db.xadd("jobs/stats", Object.entries(this.stats).flat());
    this.stats = statsObject(this.queues.length);

    // check back for more jobs in a second
    setTimeout(() => this.run(), 1000);
  }

  private async shutdown(): Promise<void> {
    const running = this.workers.some(([, state]) => state !== "stopped");
    if (running) setTimeout(() => this.shutdown(), 500);
    else await this.db.quit();
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
