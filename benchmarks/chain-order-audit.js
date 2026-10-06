'use strict';
/* eslint-env node */

// node benchmarks/chain-order-audit.js
// Demonstrates why a synchronous trampoline changes existing callback ordering.
var fs = require('fs');
var vm = require('vm');
var source = fs.readFileSync('src/ng/animateRunner.js', 'utf8');
var context = {AnimateRunner: {}};
vm.runInNewContext(source.slice(source.indexOf('AnimateRunner.chain ='), source.indexOf('AnimateRunner.all =')), context);
function fixture(run) {
  var calls = [];
  run([
    function(next) { calls.push('before'); next(); calls.push('after'); },
    function(next) { calls.push('second'); next(); }
  ], function(status) { calls.push(status); });
  return calls;
}
var existing = fixture(context.AnimateRunner.chain);
var iterative = fixture(function(chain, complete) {
  for (var i = 0; i < chain.length; i++) chain[i](function() {});
  complete(true);
});
var steps = [];
var executed = 0;
for (var i = 0; i < 100000; i++) steps.push(function(next) { executed++; next(); });
var error;
try {
  context.AnimateRunner.chain(steps, function() {});
} catch (failure) {
  error = failure.name;
}
process.stdout.write(JSON.stringify({existing: existing, iterative: iterative, deepChainError: error, executed: executed}) + '\n');
