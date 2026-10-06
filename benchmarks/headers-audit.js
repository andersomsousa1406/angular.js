'use strict';
/* eslint-env node */

// node benchmarks/headers-audit.js [previous-http-source.js]
var fs = require('fs');
var vm = require('vm');
function load(path) {
  var source = fs.readFileSync(path, 'utf8');
  var context = {
    createMap: function() { return Object.create(null); },
    isString: function(value) { return typeof value === 'string'; },
    isObject: function(value) { return value !== null && typeof value === 'object'; },
    lowercase: function(value) { return value.toLowerCase(); },
    trim: function(value) { return value.trim(); },
    forEach: function(value, fn) { value.forEach(fn); }
  };
  vm.runInNewContext(source.slice(source.indexOf('function parseHeaders('), source.indexOf('function headersGetter(')), context);
  return context.parseHeaders;
}
var before = load(process.argv[2] || 'tmp/headers-before-source.js');
var after = load('src/ng/http.js');
var seed = 1;
function random(n) { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; }
var chars = 'aAX: \n\r\t012';
for (var i = 0; i < 10000; i++) {
  var text = '';
  for (var j = 0; j < 100; j++) text += chars[random(chars.length)];
  if (JSON.stringify(before(text)) !== JSON.stringify(after(text))) throw new Error('Mismatch ' + i);
}
process.stdout.write('10000 differential headers passed\n');
[10, 1000].forEach(function(count) {
  var lines = [];
  for (var i = 0; i < count; i++) lines.push('X-Header-' + i + ': value-' + i);
  var text = lines.join('\r\n');
  [before, after].forEach(function(parse, index) {
    var samples = [];
    for (var sample = 0; sample < 8; sample++) {
      var start = process.hrtime();
      for (var j = 0; j < 100; j++) parse(text);
      var elapsed = process.hrtime(start);
      if (sample) samples.push(elapsed[0] * 1000 + elapsed[1] / 1000000);
    }
    samples.sort(function(a, b) { return a - b; });
    process.stdout.write(JSON.stringify({version: index ? 'after' : 'before',headers: count,calls: 100,medianMs: samples[3]}) + '\n');
  });
});
