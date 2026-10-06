'use strict';
/* eslint-env node */
var fs = require('fs');
var vm = require('vm');
function load(file) {
 var source = fs.readFileSync(file, 'utf8');
 var context = {createMap: function() {return Object.create(null);}, trim: function(s) {return s.trim();}, forEach: function(a, fn) {a.forEach(fn);}};
 vm.runInNewContext(source.slice(source.indexOf('function jqLiteAddClass('), source.indexOf('function jqLiteAddNodes(')), context);
 return context.jqLiteAddClass;
}
var original = load(process.argv[2] || 'tmp/jqlite-class-before.js');
var updated = load('src/jqLite.js');
function run(fn, existing, added) {
 var value = existing, writes = 0;
 fn({getAttribute: function() {return value;}, setAttribute: function(key, s) {value = s; writes++;}}, added);
 return JSON.stringify([value, writes]);
}
var seed = 1;
function random(n) {seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n;}
var tokens = ['first','second','__proto__','constructor','','a\tb','a\nb','a\rb','\u00a0foo\u00a0'];
for (var i = 0; i < 10000; i++) {
 var existing = [], added = [];
 for (var j = 0; j < random(20); j++) existing.push(tokens[random(i % 2 ? tokens.length : 5)]);
 for (j = 0; j < 100; j++) added.push(tokens[random(i % 2 ? tokens.length : 5)]);
 if (run(original,existing.join(' '),added.join(' ')) !== run(updated,existing.join(' '),added.join(' '))) throw new Error('Mismatch ' + i);
}
process.stdout.write('10000 differential cases passed\n');
[50,500,2000].forEach(function(count) {
 var added = []; for (var i = 0; i < count; i++) added.push('class' + i);
 var text = added.join(' ');
 [original,updated].forEach(function(fn,index) {
  var samples = [];
  for (var sample = 0; sample < 8; sample++) {
   var start = process.hrtime();
   for (var iteration = 0; iteration < 100; iteration++) run(fn,'first',text);
   var elapsed = process.hrtime(start);
   if (sample) samples.push(elapsed[0] * 1000 + elapsed[1] / 1e6);
  }
  samples.sort(function(a,b) {return a - b;});
  process.stdout.write(JSON.stringify({version:index ? 'after' : 'before',classes:count,calls:100,medianMs:samples[3]}) + '\n');
 });
});
