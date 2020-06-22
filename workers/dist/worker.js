'use strict';

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

class JobWorker extends JobScheduler {
    constructor({ jobStorePath, workerDir }) {
        super(jobStorePath);
        this.jobRunners = {};
        this.workerDir = workerDir;
        this.active = true;
        worker_threads.parentPort === null || worker_threads.parentPort === void 0 ? void 0 : worker_threads.parentPort.on("message", (cmd) => {
            if (cmd === "start")
                this.getJob();
            else {
                this.active = false;
            }
        });
    }
    postMessage(msg) {
        worker_threads.parentPort === null || worker_threads.parentPort === void 0 ? void 0 : worker_threads.parentPort.postMessage(msg);
    }
    getJobRunner(type) {
        this.jobRunners[type] =
            this.jobRunners[type] || require(`${this.workerDir}/${type}`).default;
        return this.jobRunners[type];
    }
    completeJob(job, result) {
        job.state = "complete";
        if (result)
            job.result = result;
        this.db.setJob(job.key, job);
        this.postMessage("completed");
    }
    failJob(job, error) {
        job.state = "complete";
        if (error)
            job.error = error;
        this.db.setJob(job.key, job);
        this.postMessage("failed");
    }
    getJob() {
        return __awaiter(this, void 0, void 0, function* () {
            const jobKey = yield this.db.getNextInQueue();
            if (jobKey)
                this.runJob(jobKey);
            else
                this.postMessage("idle");
        });
    }
    runJob(jobKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield this.db.getJob(jobKey);
            if (job) {
                const result = yield this.getJobRunner(job.type)(job);
                if (result.action === "complete")
                    this.completeJob(job, result.result);
                else if (result.action === "fail")
                    this.failJob(job, result.error);
                else
                    this.scheduleJob(job, result.time);
            }
            if (this.active)
                this.getJob();
            else {
                yield this.end();
                this.postMessage("stopped");
            }
        });
    }
}
new JobWorker(worker_threads.workerData);
