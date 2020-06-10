'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var worker_threads = require('worker_threads');
var Redis = _interopDefault(require('ioredis'));

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function statsObject(priorityLevels) {
    return {
        liveWorkers: 0,
        idleWorkers: 0,
        completedJobs: 0,
        failedJobs: 0,
        jobQueues: new Array(priorityLevels).fill(0),
        scheduledJobs: 0,
    };
}
class JobManager {
    constructor({ priorityLevels = 5, maxWorkers = 4, dbOptions, workerDir, }) {
        this.active = false;
        this.workers = [];
        this.maxWorkers = 0;
        this.queues = [];
        if (priorityLevels < 5)
            priorityLevels = 5;
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
    startWorker(index) {
        const worker = new worker_threads.Worker("./worker", { workerData: this.workerData });
        this.workers.push([worker, "started"]);
        worker.on("online", () => {
            this.stats.liveWorkers++;
            this.workers[index][1] = "active";
        });
        worker.on("message", (msg) => {
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
                    if (this.workers[index][1] === "idle")
                        this.stats.idleWorkers--;
                    this.workers[index][0].terminate();
                    this.stats.liveWorkers--;
            }
        });
        worker.on("error", () => {
            if (this.workers[index][1] === "idle")
                this.stats.idleWorkers--;
            this.stats.liveWorkers--;
            if (this.active)
                this.startWorker(index);
        });
    }
    scheduleJobs() {
        const now = Date.now();
        this.db
            .multi()
            .zrangebyscore("jobs/queue/scheduled", 0, now)
            .zremrangebyscore("jobs/queue/scheduled", 0, now)
            .zcard("jobs/queue/scheduled")
            .exec((err, [jobs, _, [, scheduled]]) => {
            if (err) ;
            else if (jobs.length) {
                this.stats.scheduledJobs = scheduled;
                const todo = jobs
                    .reduce((acc, [, job]) => {
                    const [jobId, priority] = job.split(".");
                    acc[priority - 1].push(jobId);
                    return acc;
                }, this.queues.map((key) => [key]))
                    .filter((cmd) => cmd.length > 1);
                this.db.multi(todo).exec((err) => {
                });
            }
        });
    }
    getCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                this.db
                    .multi(this.queues.map((key) => ["llen", key]))
                    .exec((_, results) => {
                    const counts = results.map(([, v]) => +v);
                    this.stats.jobQueues = counts;
                    resolve(counts.reduce((sum, v) => sum + v, 0));
                });
            });
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.active === false)
                this.shutdown();
            const idle = this.workers.filter(([, state]) => state === "idle");
            if (idle.length > 0) {
                let jobCount = yield this.getCount();
                if (jobCount) {
                    for (const [worker] of idle) {
                        if (jobCount-- === 0)
                            break;
                        worker.postMessage("start");
                        this.stats.idleWorkers--;
                    }
                }
            }
            this.scheduleJobs();
            this.db.xadd("jobs/stats", Object.entries(this.stats).flat());
            this.stats = statsObject(this.queues.length);
            setTimeout(() => this.run(), 1000);
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const running = this.workers.some(([, state]) => state !== "stopped");
            if (running)
                setTimeout(() => this.shutdown(), 500);
            else
                yield this.db.quit();
        });
    }
    start() {
        this.active = true;
        while (this.workers.length < this.maxWorkers)
            this.startWorker(this.workers.length);
        this.run();
    }
    stop() {
        this.active = false;
        for (const [worker] of this.workers)
            worker.postMessage("stop");
    }
}

function jobId() {
    return `${Date.now() & 0xfffffff}${(Math.random() * 0xffffffff) >>> 0}`;
}
class JobScheduler {
    constructor(dbOptions) {
        this.db = new Redis(dbOptions);
    }
    scheduleJob(job, time = 0) {
        const key = job.key || `jobs/${job.type}/${jobId()}`;
        if (!job.key)
            job.key = key;
        if (!job.type)
            job.type = "global";
        if (!job.priority)
            job.priority = 1;
        job.state = time > 0 ? "scheduled" : "waiting";
        return new Promise((resolve, reject) => {
            const cmd = this.db.multi().set(key, JSON.stringify(job));
            (time > 0
                ? cmd.rpush("jobs/queue/scheduled", `${key}.${job.priority}.${time}`)
                : cmd.rpush(`jobs/queue/${job.priority}`, key)).exec((err) => (err ? reject(err) : resolve(key)));
        });
    }
    end() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.quit();
        });
    }
}

exports.JobManager = JobManager;
exports.JobScheduler = JobScheduler;
