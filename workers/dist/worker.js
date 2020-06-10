'use strict';

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

class JobWorker extends JobScheduler {
    constructor({ queues, dbOptions, workerDir }) {
        super(dbOptions);
        this.jobRunners = {};
        this.queues = queues;
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
        this.db.set(job.key, JSON.stringify(job));
        this.postMessage("completed");
    }
    failJob(job, error) {
        job.state = "complete";
        if (error)
            job.error = error;
        this.db.set(job.key, JSON.stringify(job));
        this.postMessage("failed");
    }
    getJob() {
        return __awaiter(this, void 0, void 0, function* () {
            const [, jobKey] = yield this.db.blpop(...this.queues, 1);
            if (jobKey)
                this.runJob(jobKey);
            else
                this.postMessage("idle");
        });
    }
    runJob(jobKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawJob = yield this.db.get(jobKey);
            if (rawJob) {
                const job = JSON.parse(rawJob);
                const result = yield this.getJobRunner(job.type)(job, db);
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
