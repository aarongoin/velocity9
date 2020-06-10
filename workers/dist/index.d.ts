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

export interface JobScheduler {
  scheduleJob(job: Partial<Job<string>>, time?: number): Promise<string>;
  end(): void;
}

export interface JobManagerOptions {
  priorityLevels?: number;
  maxWorkers?: number;
  dbOptions: {};
  workerDir: string;
}

export interface JobManager {
  start(): void;
  stop(): void;
}