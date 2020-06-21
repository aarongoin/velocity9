import { RedisOptions } from "ioredis";

export type JobState =
  | "waiting"
  | "scheduled"
  | "running"
  | "complete"
  | "failed";

export type Job<
  Type extends string,
  Data extends {} = {},
  Result extends any = undefined,
  Err extends any = undefined
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
  Result extends any = undefined,
  Err extends any = undefined
> = (job: Job<Type, Data, Result, Err>) => Promise<JobResult<Result, Err>>;

export interface JobSchedulerInterface {
  scheduleJob(job: Partial<Job<string>>, time?: number): Promise<string>;
  end(): void;
}

export interface JobManagerOptions {
  priorityLevels?: number;
  maxWorkers?: number;
  dbOptions: {};
  workerDir: string;
}

export interface JobManagerInterface {
  start(): void;
  stop(): void;
}

export interface JobStats {
  liveWorkers: number;
  idleWorkers: number;
  completedJobs: number;
  failedJobs: number;
  jobQueues: number[];
  scheduledJobs: number;
}

// lib exports:
// scheduler.ts
export class JobScheduler implements JobSchedulerInterface {
  protected db;
  constructor(dbOptions: RedisOptions);
  scheduleJob(job: Partial<Job<string>>, time = 0): Promise<string>;
  async end(): Promise<void>;
}
// manager.ts
export declare class JobManager implements JobManagerInterface {
  private active;
  private workers;
  private db;
  private maxWorkers;
  private queues;
  private workerData;
  private stats;
  constructor(options: JobManagerOptions);
  private startWorker(index: number);
  private scheduleJobs();
  private async getCount();
  private async run();
  private async shutdown();
  start(): void;
  stop(): void;
}
