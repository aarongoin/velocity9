// lib exports
// JobStore.ts
export default class JobStore implements JobStoreInterface {
  private db: Redis.Redis;
  private queues: string[];
  constructor(dbOptions: Redis.RedisOptions);
  setJob(jobKey: string, job: Job<string>): Promise<unknown>;
  getJob(jobKey: string): Promise<Job<string> | null>;
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
// SessionStore.ts
export declare class SessionStore implements SessionStoreInterface {
  private db: Redis.Redis;
  constructor(dbOptions: Redis.RedisOptions);
  getSession(key: string): Promise<SessionData | null>;
  setSession(key: string, value: SessionData): Promise<unknown>;
  delSession(key: string): Promise<unknown>;
  expireSession(key: string, inSeconds: number): Promise<unknown>;
}
// ThrottleStore.ts
export declare class ThrottleStore implements ThrottleStoreInterface {
  private db: Redis.Redis;
  constructor(dbOptions: Redis.RedisOptions);
  incrementKey(key: string): Promise<number>;
  expireKey(key: string, inSeconds: number): Promise<unknown>;
}
