/**
 * Demo of how to use this to monitor event loop latency
 */

/* eslint-disable no-console */
const LatencyMonitor = require('../').default; // Here you would import LatencyMonitor from 'latency-monitor';

const monitor = new LatencyMonitor({latencyCheckIntervalMs: 3, dataEmitIntervalMs: 2000});
console.log('Event Loop Latency Monitor Loaded: %O', {
    latencyCheckIntervalMs: monitor.latencyCheckIntervalMs,
    dataEmitIntervalMs: monitor.dataEmitIntervalMs
});
setInterval(() => {
    let s = '';
    for (let i = 0; i < 20000; ++i) {
        s += i;
    }
    if (s === undefined) {
        console.log('This will never be logged, just making sure we deoptomize');
    }
}, 7);
monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
