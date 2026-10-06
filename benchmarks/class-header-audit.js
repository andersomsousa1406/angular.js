'use strict';
/* eslint-env node */

// Baselines: tmp/ngclass-before-source.js and tmp/merge-headers-before-source.js.
var fs = require('fs');
var vm = require('vm');
function context() {
  return {
    createMap: function() { return Object.create(null); },
    isArray: Array.isArray,
    isObject: function(value) { return value !== null && typeof value === 'object'; },
    isString: function(value) { return typeof value === 'string'; },
    isFunction: function(value) { return typeof value === 'function'; },
    lowercase: function(value) { return value.toLowerCase(); },
    extend: Object.assign,
    shallowCopy: function(value) { return Object.assign({}, value); },
    forEach: function(value, fn) { Object.keys(value).forEach(function(key) { fn(value[key], key); }); }
  };
}
function classes(path) {
  var source = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  var start = source.indexOf('function arrayDifference(');
  var result = context();
  vm.runInNewContext(source.slice(start, source.indexOf('\n}\n', start)), result);
  return result;
}
function headers(path) {
  var source = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  var result = context();
  result.defaults = {headers: {common: {}, get: {}}};
  vm.runInNewContext(source.slice(source.indexOf('function executeHeaderFns('), source.indexOf('function serverRequest(')), result);
  return result;
}
var oldClasses = classes(process.argv[2] || 'tmp/ngclass-before-source.js');
var newClasses = classes('src/ng/directive/ngClass.js');
var oldHeaders = headers(process.argv[3] || 'tmp/merge-headers-before-source.js');
var newHeaders = headers('src/ng/http.js');
var seed = 1;
function random(n) { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; }
var names = ['', '__proto__', 'constructor', 'one', 'two', 'three'];
for (var test = 0; test < 10000; test++) {
  var left = [];
  var right = [];
  var object = Object.create(null);
  for (var j = 0; j < 100; j++) {
    left.push(names[random(names.length)]);
    right.push(names[random(names.length)]);
    object['key' + j] = random(2);
  }
  if (JSON.stringify(oldClasses.arrayDifference(left, right)) !== JSON.stringify(newClasses.arrayDifference(left, right)) ||
      oldClasses.toClassString(object) !== newClasses.toClassString(object)) throw new Error('Class mismatch');
  var common = {};
  var request = {};
  for (j = 0; j < 20; j++) {
    common['X-Header-' + j] = 'default';
    if (random(2)) request['x-header-' + j] = 'request';
  }
  oldHeaders.defaults.headers.common = newHeaders.defaults.headers.common = common;
  var config = {method: 'GET', headers: request};
  if (JSON.stringify(oldHeaders.mergeHeaders(config)) !== JSON.stringify(newHeaders.mergeHeaders(config))) throw new Error('Header mismatch');
}
process.stdout.write('10000 cases passed for class differences, object conversion and header merging\n');
function measure(name, before, after, iterations) {
  [before, after].forEach(function(run, version) {
    var samples = [];
    for (var sample = 0; sample < 8; sample++) {
      var start = process.hrtime();
      for (var i = 0; i < iterations; i++) run();
      var elapsed = process.hrtime(start);
      if (sample) samples.push(elapsed[0] * 1000 + elapsed[1] / 1000000);
    }
    samples.sort(function(a, b) { return a - b; });
    process.stdout.write(JSON.stringify({scenario: name, version: version ? 'after' : 'before', iterations: iterations, medianMs: samples[3]}) + '\n');
  });
}
left = [];
right = [];
object = {};
for (var i = 0; i < 1000; i++) {
  left.push('class' + i);
  right.push('class' + (i + 500));
  object['class' + i] = i % 2;
}
measure('difference 1000 classes', function() { oldClasses.arrayDifference(left, right); }, function() { newClasses.arrayDifference(left, right); }, 100);
measure('object 1000 keys', function() { oldClasses.toClassString(object); }, function() { newClasses.toClassString(object); }, 1000);
[3, 50].forEach(function(count) {
  var common = {};
  var request = {};
  for (var i = 0; i < count; i++) {
    common['X-Header-' + i] = 'default';
    request['x-header-' + i] = 'request';
  }
  oldHeaders.defaults.headers.common = newHeaders.defaults.headers.common = common;
  var config = {method: 'GET', headers: request};
  measure('merge ' + count + ' headers', function() { oldHeaders.mergeHeaders(config); }, function() { newHeaders.mergeHeaders(config); }, 1000);
});
