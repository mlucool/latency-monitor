/* global window */
import EventEmitter from 'events';
import lodashGet from 'lodash/get';
import isFunction from 'lodash/isFunction';
import * as helpers from './helpers';
import VisibilityChangeEmitter from './VisibilityChangeEmitter';

const debug = require('debug')('latency-monitor:LatencyMonitor');

/**
 * @typedef {Object} SummaryObject
 * @property {Number} events How many events were called
 * @property {Number} minMS What was the min time for a cb to be called
 * @property {Number} maxMS What was the max time for a cb to be called
 * @property {Number} avgMs What was the average time for a cb to be called
 * @property {Number} lengthMs How long this interval was in ms
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

        that.asyncTestFn = asyncTestFn || helpers.getEventLoopTestingFn();

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

        that._latencyData = that._initLatencyData();

        // We check for isBrowser because of browsers set max rates of timeouts when a page is hidden,
        // so we fall back to another library
        // See: http://stackoverflow.com/questions/6032429/chrome-timeouts-interval-suspended-in-background-tabs
        if (helpers.isBrowser()) {
            that._visibilityChangeEmitter = new VisibilityChangeEmitter();
            that._visibilityChangeEmitter.on('visibilityChange', (pageInFocus) => {
                if (pageInFocus) {
                    that._startTimers();
                } else {
                    that._emitSummary();
                    that._stopTimers();
                }
            });
        }

        if (!that._visibilityChangeEmitter || that._visibilityChangeEmitter.isVisible()) {
            that._startTimers();
        }
    }

    /**
     * Start internal timers
     * @private
     */
    _startTimers() {
        // Timer already started, ignore this
        if (this._checkIntervalID) {
            return;
        }
        this._checkIntervalID = setInterval(() => this._checkLatency(), this.latencyCheckIntervalMs);
        if (isFunction(this._checkIntervalID.unref)) {
            this._checkIntervalID.unref(); // Doesn't block exit
        }
        if (this.dataEmitIntervalMs) {
            this._emitIntervalID = setInterval(() => this._emitSummary(), this.dataEmitIntervalMs);
            if (isFunction(this._emitIntervalID.unref)) {
                this._emitIntervalID.unref(); // Doesn't block exit
            }
        }
    }

    /**
     * Stop internal timers
     * @private
     */
    _stopTimers() {
        if (this._checkIntervalID) {
            clearInterval(this._checkIntervalID);
            this._checkIntervalID = undefined;
        }
        if (this._emitIntervalID) {
            clearInterval(this._emitIntervalID);
            this._emitIntervalID = undefined;
        }
    }

    /**
     * Emit summary only if there were events. It might not have any events if it was forced via a page hidden/show
     * @private
     */
    _emitSummary() {
        const summary = this.getSummary();
        if (summary.events > 0) {
            this.emit('data', summary);
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
                : Number.POSITIVE_INFINITY,
            lengthMs: this.getDeltaMS(this._latencyData.startTime)
        };
        this._latencyData = this._initLatencyData(); // Clear

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

    _initLatencyData() {
        return {
            startTime: this.now(),
            minMs: Number.POSITIVE_INFINITY,
            maxMs: Number.NEGATIVE_INFINITY,
            events: 0,
            totalMs: 0
        };
    }
}

export default LatencyMonitor;
