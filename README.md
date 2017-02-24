# latency-monitor

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]  [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency Status][depstat-image]][depstat-url]

> A monitor that periodically times how long it takes for a callback to be called. Think event loop latency.


## Usage
This tool allows you to time and get summaries of how long async functions took. By default, it assumes you want to measure
event loop latency, but as [this example]() shows, you can use it for a simple ping pong setup with Promises too.
This code works in both browsers and node.js and will do its best effort to use as accurate a timer as possible.

Example event loop monitor (default).
```javascript
import LatencyMonitor from 'latency-monitor';

const monitor = new LatencyMonitor();
console.log('Event Loop Latency Monitor Loaded: %O', {
    latencyCheckIntervalMs: monitor.latencyCheckIntervalMs,
    dataEmitIntervalMs: monitor.dataEmitIntervalMs
});
monitor.on('data', (summary) => console.log('Event Loop Latency: %O', summary));
/*
 * In console you will see something like this:
 * Event Loop Latency Monitor Loaded:
 *   {dataEmitIntervalMs: 5000, latencyCheckIntervalMs: 500}
 * Event Loop Latency:
 *   {avgMs: 0, events: 10, maxMs: 0, minMs: 0}
 */
```

## Installation

Install `latency-monitor` as a dependency:

```shell
npm install --save latency-monitor
```

## Debugging
We use [debug](https://github.com/visionmedia/debug). In node set env variable `DEBUG=latency-monitor:*` 
or in a browser `localStorage.debug='latency-monitor'` to see debugging output.

## Notes
This is a reasonable attempt to make a latency monitor. There are issues such as:
- We don't wait for the last event to finish when emitting stats. This means if the last event in a cycle takes the longest,
or is never returned, then for that cycle large latency isn't recorded.
- It isn't clear if `setImmediate` or `setTimeout` is the right way to measure event loop latency (default function to monitor).

License
-------------
[Apache-2.0 License](http://www.apache.org/licenses/LICENSE-2.0)

[npm-url]: https://npmjs.org/package/latency-monitor
[npm-image]: https://badge.fury.io/js/latency-monitor.svg

[travis-url]: http://travis-ci.org/mlucool/latency-monitor
[travis-image]: https://secure.travis-ci.org/mlucool/latency-monitor.png?branch=master

[coveralls-url]: https://coveralls.io/github/mlucool/latency-monitor?branch=master
[coveralls-image]: https://coveralls.io/repos/mlucool/latency-monitor/badge.svg?branch=master&service=github

[depstat-url]: https://david-dm.org/mlucool/latency-monitor
[depstat-image]: https://david-dm.org/mlucool/latency-monitor.png

