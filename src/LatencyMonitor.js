/* global window */
import EventEmitter from 'events';
import lodashGet from 'lodash/get';
import isFunction from 'lodash/isFunction';

const debug = require('debug')('latency-monitor:LatencyMonitor');

/**
 * @typedef {Object} SummaryObject
 * @property {Number} events How many events were called
 * @property {Number} minMS What was the min time for a cb to be called
 * @property {Number} maxMS What was the max time for a cb to be called
 * @property {Number} avgMs What was the average time for a cb to be called
 */

/**
 * A class to monitor latency of any async function which works in a browser or node. This works by periodically calling
 * the asyncTestFn and timing how long it takes the callback to be called. It can also periodically emit stats about this.
 * This can be disabled and stats can be pulled via setting dataEmitIntervalMs = 0.
 *
 * The default implementation is an event loop latency monitor. This works by firing periodic events into the event loop
 * and timing how long it takes to get back.
 *
 * @example
 * const monitor = new LatencyMonitor();
 * monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
 *
 * @example
 * const monitor = new LatencyMonitor({latencyCheckIntervalMs: 1000, dataEmitIntervalMs: 60000, asyncTestFn:ping});
 * monitor.on('data', (summary) => console.log('Ping Pong Latency: %O', summary));
 */
class LatencyMonitor extends EventEmitter {
    /**
     * @param {Number} [latencyCheckIntervalMs=500] How often to add a latency check event (ms)
     * @param {Number} [dataEmitIntervalMs=5000] How often to summarize latency check events. null or 0 disables event firing
     * @param {function} [asyncTestFn] What cb-style async function to use
     */
    constructor({latencyCheckIntervalMs, dataEmitIntervalMs, asyncTestFn} = {}) {
        super();
        const that = this;

        // 0 isn't valid here, so its ok to use ||
        that.latencyCheckIntervalMs = latencyCheckIntervalMs || 500; // 0.5s
        that.dataEmitIntervalMs = (dataEmitIntervalMs === null || dataEmitIntervalMs === 0) ? undefined
            : dataEmitIntervalMs || 5 * 1000; // 5s
        debug('latencyCheckIntervalMs: %s dataEmitIntervalMs: %s',
            that.latencyCheckIntervalMs, that.dataEmitIntervalMs);
        if (dataEmitIntervalMs) {
            debug('Expecting ~%s events per summary', that.latencyCheckIntervalMs / that.dataEmitIntervalMs);
        } else {
            debug('Not emitting summaries');
        }

        that.asyncTestFn = asyncTestFn || getEventLoopTestingFn();

        // If process: use high resolution timer
        if (process && process.hrtime) {
            debug('Using process.hrtime for timing');
            that.now = process.hrtime;
            that.getDeltaMS = (startTime) => {
                const hrtime = that.now(startTime);
                return (hrtime[0] * 1000) + (hrtime[1] / 1000000);
            };
            // Let's try for a timer that only monotonically increases
        } else if (lodashGet(window, 'performance.now')) {
            debug('Using performance.now for timing');
            that.now = window.performance.now.bind(window.performance);
            that.getDeltaMS = (startTime) => Math.round(that.now() - startTime);
        } else {
            debug('Using Date.now for timing');
            that.now = Date.now;
            that.getDeltaMS = (startTime) => that.now() - startTime;
        }

        that._latencyData = initLatencyData();
        const checkInterval = setInterval(() => that._checkLatency(), that.latencyCheckIntervalMs);
        if (isFunction(checkInterval.unref)) {
            checkInterval.unref(); // Doesn't block exit
        }
        if (that.dataEmitIntervalMs) {
            const emitInterval = setInterval(() => that.emit('data', that.getSummary()), that.dataEmitIntervalMs);
            if (isFunction(emitInterval.unref)) {
                emitInterval.unref(); // Doesn't block exit
            }
        }
    }

    /**
     * Calling this function will end the collection period. If a timing event was already fired and somewhere in the queue,
     * it will not count for this time period
     * @returns {SummaryObject}
     */
    getSummary() {
        // We might want to adjust for the number of expected events
        // Example: first 1 event it comes back, then such a long blocker that the next emit check comes
        // Then this fires - looks like no latency!!
        const latency = {
            events: this._latencyData.events,
            minMs: this._latencyData.minMs,
            maxMs: this._latencyData.maxMs,
            avgMs: this._latencyData.events ? this._latencyData.totalMs / this._latencyData.events
                : Number.POSITIVE_INFINITY
        };
        this._latencyData = initLatencyData(); // Clear

        debug('Summary: %O', latency);
        return latency;
    }

    /**
     * Checks latency of the event loop by sending an event to it. It will attempt to cut in front of over events
     * via setImmediate (i.e. in node) but otherwise will revert to setTimeout, which will wait for the event loop to clear.
     *
     * @private
     */
    _checkLatency() {
        const that = this;

        const startTime = that.now();
        that.asyncTestFn(() => {
            const deltaMS = that.getDeltaMS(startTime);
            that._latencyData.events++;
            that._latencyData.minMs = Math.min(that._latencyData.minMs, deltaMS);
            that._latencyData.maxMs = Math.max(that._latencyData.maxMs, deltaMS);
            that._latencyData.totalMs += deltaMS;
            debug('MS: %s Data: %O', deltaMS, that._latencyData);
        });
    }
}

function initLatencyData() {
    return {
        minMs: Number.POSITIVE_INFINITY,
        maxMs: Number.NEGATIVE_INFINITY,
        events: 0,
        totalMs: 0
    };
}

function getEventLoopTestingFn() {
    // If process: After I/O but before other timeouts - this would also run after process.nextTick
    // FIXME: Do we ever want setImmediate??
    if (setImmediate) {
        debug('Using setImmediate for timeouts');
        return (cb) => setImmediate(cb);
    }
    debug('Using setTimeout for timeouts');
    return (cb) => setTimeout(cb, 0);
}

export default LatencyMonitor;
