'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var worker_threads = require('worker_threads');

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function statsObject() {
    return {
        liveWorkers: 0,
        idleWorkers: 0,
        stoppedWorkers: 0,
        completedJobs: 0,
        failedJobs: 0,
        scheduledJobs: 0
    };
}
class JobManager {
    constructor({ jobStorePath, workerDir, maxWorkers = 4, pollRate = 1000 }) {
        this.active = false;
        this.maxWorkers = 0;
        this.workers = [];
        this.db = require(jobStorePath).default;
        this.maxWorkers = maxWorkers;
        this.pollRate = pollRate;
        this.stats = statsObject();
        this.workerData = {
            jobStorePath,
            workerDir
        };
    }
    startWorker(index) {
        const worker = new worker_threads.Worker("./worker", { workerData: this.workerData });
        this.workers.push([worker, "started"]);
        worker.on("online", () => {
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
                    this.workers[index][1] = msg;
                    break;
                case "stopped":
                    this.workers[index][1] = msg;
                    this.workers[index][0].terminate();
            }
        });
        worker.on("error", () => {
            if (this.active)
                this.startWorker(index);
        });
    }
    scheduleJobs() {
        this.db
            .pullScheduledUntil(Date.now())
            .then(jobs => {
            const todo = jobs.reduce((acc, [, job]) => {
                const [jobId, priority] = job.split(".");
                acc[priority] = acc[priority] || [];
                acc[priority].push(jobId);
                return acc;
            }, {});
            Object.entries(todo).forEach(([priority, jobs]) => this.db.addAllToQueue(+priority, jobs));
        })
            .catch(err => {
            throw err;
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.active === false)
                this.shutdown();
            const idle = this.workers.filter(([, state]) => state === "idle");
            if (idle.length > 0) {
                let jobCount = yield this.db.getQueuedLength();
                if (jobCount) {
                    for (const [worker] of idle) {
                        if (jobCount-- === 0)
                            break;
                        worker.postMessage("start");
                    }
                }
            }
            this.scheduleJobs();
            setTimeout(() => this.run(), this.pollRate);
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const running = this.workers.some(([, state]) => state !== "stopped");
            if (running)
                setTimeout(() => this.shutdown(), Math.max(this.pollRate >>> 1, 10));
            else
                yield this.db.closeConnection();
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
    return `${Date.now() & 0xfffffff}${(Math.random() * 0xffffffff) >>>
        0}`.padEnd(19, "0");
}
class JobScheduler {
    constructor(jobStorePath) {
        this.db = require(jobStorePath).default;
    }
    scheduleJob(job, time = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = job.key || `jobs/${job.type}/${jobId()}`;
            if (!job.key)
                job.key = key;
            if (!job.type)
                job.type = "global";
            if (!job.priority)
                job.priority = 1;
            job.state = time > 0 ? "scheduled" : "waiting";
            try {
                yield this.db
                    .setJob(key, job)
                    .then(() => time > 0
                    ? this.db.addToSchedule(time, `${key}.${job.priority}`)
                    : this.db.addToQueue(job.priority || 1, key));
                return key;
            }
            catch (err) {
                throw err;
            }
        });
    }
    end() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.closeConnection();
        });
    }
}

exports.JobManager = JobManager;
exports.JobScheduler = JobScheduler;
