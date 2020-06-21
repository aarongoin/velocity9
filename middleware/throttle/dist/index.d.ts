import { MiddlewareCreator } from "@velocity9/server";

interface ThrottleStore {
  incr(id: string): number;
  expire(id: string, sec: number): void;
}

export interface ThrottleOptions {
  store: ThrottleStore;
  key?: string; // the unique key for this throttle (usefult when applying a throttle to a subset of your app routes)
  rate: number; // max number of requests per second before throttling an ip address
  group?: number; // the user groups this throttle applies to (else apply to all groups)
}

// lib exports:
export declare const Throttle: MiddlewareCreator<ThrottleOptions>;
