export type JobState =
  | "waiting"
  | "scheduled"
  | "running"
  | "complete"
  | "failed";

export type Job<
  Type extends string,
  Data extends {} = {},
  Result = undefined,
  Err = undefined
> = {
  key: string;
  type: Type;
  priority: number;
  data: Data;
} & (
  | {
      state: "waiting" | "scheduled" | "running";
    }
  | {
      state: "complete";
      result: Result;
    }
  | {
      state: "failed";
      error: Err;
    }
);

export type JobResult<Result = undefined, Err = undefined> =
  | {
      action: "complete";
      result?: Result;
    }
  | {
      action: "fail";
      error?: Err;
    }
  | {
      action: "reschedule";
      time: number;
    };

export type Runnable<
  Type extends string,
  Data extends {} = {},
  Result = undefined,
  Err = undefined
> = (job: Job<Type, Data, Result, Err>) => Promise<JobResult<Result, Err>>;

export interface JobSchedulerInterface {
  scheduleJob(job: Partial<Job<string>>, time?: number): Promise<string>;
  end(): void;
}

export interface JobManagerOptions {
  jobStorePath: string;
  workerDir: string;
  pollRate?: number;
  maxWorkers?: number;
}

export interface JobManagerInterface {
  start(): void;
  stop(): void;
}

export interface JobStats {
  liveWorkers: number;
  idleWorkers: number;
  stoppedWorkers: number;
  completedJobs: number;
  failedJobs: number;
  scheduledJobs: number;
}

export interface JobStoreInterface {
  setJob(jobKey: string, job: Job): Promise<unknown>;
  getJob(jobKey: string): Promise<Job | null>;
  getNextInQueue(): Promise<string | null>;
  getQueuedLength(): Promise<number>;
  addToQueue(priority: number, value: string): Promise<unknown>;
  addAllToQueue(priority: number, values: string[]): Promise<unknown>;
  addToSchedule(time: number, value: string): Promise<unknown>;
  pullScheduledUntil(time: number): Promise<string[]>;
  getScheduledLength(): Promise<number>;
  recordJobStats(stats: JobStats): Promise<unknown>;
  closeConnection(): Promise<void>;
}

export interface WorkerData {
  jobStorePath: string;
  workerDir: string;
}

export type WorkerState = "started" | "active" | "idle" | "stopped";

export type WorkerMessage = "stopped" | "idle" | "failed" | "completed";

// lib exports:
// scheduler.ts
export class JobScheduler implements JobSchedulerInterface {
  protected db;
  constructor(jobStorePath: string);
  scheduleJob(job: Partial<Job<string>>, time?: number): Promise<string>;
  async end(): Promise<void>;
}
// manager.ts
export declare class JobManager implements JobManagerInterface {
  private active;
  private maxWorkers;
  private workers;
  private pollRate;
  private workerData;
  private stats;
  private db;
  constructor(options: JobManagerOptions);
  private startWorker(index: number);
  private scheduleJobs();
  private async run();
  private async shutdown();
  start(): void;
  stop(): void;
}
// worker.ts
export declare class JobWorker extends JobScheduler {
  private workerDir;
  private jobRunners;
  private active;
  constructor(options: WorkerData);
  private postMessage(msg: WorkerMessage): void;
  private getJobRunner(type: string): Runnable<string>;
  private completeJob<T extends string, D = undefined>(
    job: Job<T>,
    result: D
  ): void;
  private failJob<T extends string, E = undefined>(job: Job<T>, error: E): void;
  private async getJob(): Promise<void>;
  private async runJob(jobKey: string): Promise<void>;
}
