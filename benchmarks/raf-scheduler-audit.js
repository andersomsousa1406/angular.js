'use strict';
/* eslint-env node */

// Run with Node: node benchmarks/raf-scheduler-audit.js [scheduler-source.js]
// Measures queue operations with a deterministic RAF, excluding browser rendering.
var fs = require('fs');
var vm = require('vm');
var filename = process.argv[2] || 'src/ngAnimate/rafScheduler.js';
var context = {isArray: Array.isArray};
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);

function sample(count) {
  var frames = [];
  var position = 0;
  var calls = 0;
  function raf(fn) { frames.push(fn); return function() {}; }
  var factory = context.$$rAFSchedulerFactory;
  var scheduler = factory[factory.length - 1](raf);
  function task() { calls++; }
  var batches = new Array(count);
  for (var i = 0; i < count; i++) batches[i] = [task];
  var start = process.hrtime();
  scheduler(batches);
  while (position < frames.length) frames[position++]();
  var elapsed = process.hrtime(start);
  if (calls !== count) throw new Error('Lost tasks');
  return elapsed[0] * 1000 + elapsed[1] / 1000000;
}

sample(1000);
[10000, 50000, 100000].forEach(function(count) {
  var samples = [sample(count), sample(count), sample(count)].sort(function(a, b) { return a - b; });
  process.stdout.write(JSON.stringify({waves: count, medianMs: samples[1]}) + '\n');
});
