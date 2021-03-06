/* Copyright (C) 2016 NooBaa */
'use strict';

const cluster = require('cluster');

class Speedometer {

    constructor(name) {
        this.name = name || 'Speed';
        this.num_bytes = 0;
        this.last_bytes = 0;
        this.start_time = Date.now();
        this.last_time = this.start_time;
        this.worker_mode = cluster.isWorker;
        if (cluster.isMaster) {
            cluster.on('message', (worker, bytes) => this.update(bytes));
            cluster.on('exit', worker => {
                if (!Object.keys(cluster.workers).length) {
                    this.clear_interval();
                    this.report();
                    // process.exit();
                }
            });
        }
    }

    fork(count) {
        for (var i = 0; i < count; ++i) {
            const worker = cluster.fork();
            console.warn('Worker start', worker.process.pid);
        }
    }

    update(bytes) {
        this.num_bytes += bytes;
        if (!this.interval) this.set_interval();
    }

    set_interval(delay_ms) {
        this.clear_interval();
        this.interval = setInterval(() => this.report(), delay_ms || 1000);
        this.interval.unref();
    }

    clear_interval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    report(min_delay_ms) {
        const now = Date.now();
        if (min_delay_ms && now - this.last_time < min_delay_ms) {
            return;
        }
        if (this.worker_mode) {
            process.send(this.num_bytes - this.last_bytes);
        } else {
            const speed = (this.num_bytes - this.last_bytes) /
                (now - this.last_time) * 1000 / 1024 / 1024;
            const avg_speed = this.num_bytes /
                (now - this.start_time) * 1000 / 1024 / 1024;
            console.log(this.name + ': ' +
                speed.toFixed(1) + ' MB/sec' +
                ' (average ' + avg_speed.toFixed(1) + ')');
        }
        this.last_bytes = this.num_bytes;
        this.last_time = now;
    }
}

module.exports = Speedometer;
