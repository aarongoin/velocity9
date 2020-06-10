declare module "index" {
    import { MiddlewareCreator } from "@velocity9/server";
    export interface ThrottleOptions {
        key?: string;
        rate: number;
        group?: number;
    }
    const Throttle: MiddlewareCreator<ThrottleOptions>;
    export default Throttle;
}
//# sourceMappingURL=index.d.ts.map