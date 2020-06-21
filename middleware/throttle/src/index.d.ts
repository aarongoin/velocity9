import { MiddlewareCreator } from "@velocity9/server";

export interface ThrottleStore {
  incr(id: string): Promise<number>;
  expire(id: string, sec: number): Promise<unknown>;
}

export interface ThrottleOptions {
  store: ThrottleStore;
  key?: string; // the unique key for this throttle (usefult when applying a throttle to a subset of your app routes)
  group?: number; // the user groups this throttle applies to (else apply to all groups)
  rate?: number; // max number of requests per second before throttling an ip address (defaults to 1000 / second)
}

// lib exports:
export declare const Throttle: MiddlewareCreator<ThrottleOptions>;
