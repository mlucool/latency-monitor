/**
 * Demo of how to measure latency stats for a simple ping, pong with promises
 */
/* eslint-disable no-console */
const LatencyMonitor = require('../').default; // Here you would import LatencyMonitor from 'latency-monitor';

const monitor = new LatencyMonitor({latencyCheckIntervalMs: 3, dataEmitIntervalMs: 2000, asyncTestFn: pinger});
console.log('Event Loop Latency Monitor Loaded: %O', {
    latencyCheckIntervalMs: monitor.latencyCheckIntervalMs,
    dataEmitIntervalMs: monitor.dataEmitIntervalMs
});

monitor.on('data', (summary) => console.log('Ping Pong Latency: %O', summary));

function pong() {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, Math.random() * 10); // Randomly wait 0-10ms to resolve
    });
}

function pinger(cb) {
    pong().then(cb).catch(cb);
}

setInterval(() => {}, 10000); // Just so we don't exit
