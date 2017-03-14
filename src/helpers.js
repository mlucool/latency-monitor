const debug = require('debug')('latency-monitor:LatencyMonitor');

export function isBrowser() {
    return typeof window !== 'undefined';
}

export function getEventLoopTestingFn() {
    // If process: After I/O but before other timeouts - this would also run after process.nextTick
    // FIXME: Do we ever want setImmediate??
    if (setImmediate) {
        debug('Using setImmediate for timeouts');
        return (cb) => setImmediate(cb);
    }
    debug('Using setTimeout for timeouts');
    return (cb) => setTimeout(cb, 0);
}
