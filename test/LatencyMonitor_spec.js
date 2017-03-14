import {expect} from 'chai';
import LatencyMonitor from '../src/LatencyMonitor';

describe('LatencyMonitor', () => {
    describe('node', () => {
        it('should be able to emit latency events in node', (cb) => {
            const monitor = new LatencyMonitor({latencyCheckIntervalMs: 10, dataEmitIntervalMs: 50});
            const startTime = process.hrtime();
            monitor.once('data', (data) => {
                expect(data).to.contain.all.keys(['events', 'minMs', 'maxMs', 'avgMs']);
                expect(toMS(process.hrtime(startTime))).to.be.at.least(49);
                cb();
            });
        });
        it('should be able handle a custom function', (cb) => {
            let wasCalled = false;
            const customFn = (lmCB) => {
                wasCalled = true;
                lmCB();
            };
            const monitor = new LatencyMonitor({
                latencyCheckIntervalMs: 10,
                dataEmitIntervalMs: 50,
                asyncTestFn: customFn
            });
            const startTime = process.hrtime();
            monitor.once('data', (data) => {
                expect(data).to.contain.all.keys(['events', 'minMs', 'maxMs', 'avgMs']);
                expect(toMS(process.hrtime(startTime))).to.be.at.least(49);
                expect(wasCalled).to.be.true; // Our custom was called
                cb();
            });
        });

        it('should allow for pull instead of push', (cb) => {
            const monitor = new LatencyMonitor({latencyCheckIntervalMs: 10, dataEmitIntervalMs: null});
            setTimeout(() => {
                const data = monitor.getSummary();
                expect(data).to.contain.all.keys(['events', 'minMs', 'maxMs', 'avgMs']);
                expect(data.events).to.be.at.least(2);
                cb();
            }, 50);
        });
    });

    describe('Browser', () => {
        const hold = process.hrtime;
        beforeEach(() => {
            global.document = {
                hidden: false
            };
            global.window = {};
            delete process.hrtime;
        });
        afterEach(() => {
            process.hrtime = hold;
            delete global.window;
            delete global.document;
        });

        it('should be able to emit latency events in a browser with performance.now', (cb) => {
            global.window.performance = {now: Date.now.bind(Date)};
            const monitor = new LatencyMonitor({latencyCheckIntervalMs: 10, dataEmitIntervalMs: 50});
            const startTime = Date.now();
            monitor.once('data', (data) => {
                expect(data).to.contain.all.keys(['events', 'minMs', 'maxMs', 'avgMs']);
                expect(Date.now() - startTime).to.be.at.least(42);
                cb();
            });
        });

        it('should be able to emit latency events in a browser without performance.now', (cb) => {
            const monitor = new LatencyMonitor({latencyCheckIntervalMs: 10, dataEmitIntervalMs: 50});
            const startTime = Date.now();
            monitor.once('data', (data) => {
                expect(data).to.contain.all.keys(['events', 'minMs', 'maxMs', 'avgMs']);
                expect(Date.now() - startTime).to.be.at.least(42);
                cb();
            });
        });
    });
});

function toMS(hrtime) {
    return (hrtime[0] * 1000) + (hrtime[1] / 1000000);
}
