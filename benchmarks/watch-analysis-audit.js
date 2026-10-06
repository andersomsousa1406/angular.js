'use strict';
/* eslint-env node */

// node --expose-gc benchmarks/watch-analysis-audit.js [parse-source.js]
// Isolates dependency analysis; excludes lexing and expression code generation.
var fs = require('fs');
var vm = require('vm');
var source = fs.readFileSync(process.argv[2] || 'src/ng/parse.js', 'utf8');
var types = {};
source.replace(/case AST\.(\w+)/g, function(match, type) { types[type] = type; return match; });
var context = {AST: types, isArray: Array.isArray, forEach: function(values, fn) { values.forEach(fn); }};
vm.runInNewContext(source.slice(source.indexOf('function isStateless('), source.indexOf('function isAssignable(')), context);

function sample(count) {
  var expression = {type: 'Identifier', name: 'value0'};
  for (var i = 1; i < count; i++) {
    expression = {type: 'BinaryExpression', operator: '+', left: expression,
      right: {type: 'Identifier', name: 'value' + i}};
  }
  var ast = {type: 'Program', body: [{expression: expression}]};
  global.gc();
  var before = process.memoryUsage().heapUsed;
  var start = process.hrtime();
  context.findConstantAndWatchExpressions(ast);
  var inputs = context.getInputs(ast.body);
  var elapsed = process.hrtime(start);
  global.gc();
  var retained = process.memoryUsage().heapUsed - before;
  if (inputs.length !== count || inputs[count - 1].name !== 'value' + (count - 1)) throw new Error('Incorrect inputs');
  return {ms: elapsed[0] * 1000 + elapsed[1] / 1000000, retainedBytes: retained};
}

if (!global.gc) throw new Error('Run with --expose-gc');
sample(100);
[100, 500, 1000].forEach(function(count) {
  var samples = [];
  for (var i = 0; i < 7; i++) samples.push(sample(count));
  var times = samples.map(function(value) { return value.ms; }).sort(function(a, b) { return a - b; });
  var heaps = samples.map(function(value) { return value.retainedBytes; }).sort(function(a, b) { return a - b; });
  process.stdout.write(JSON.stringify({inputs: count, medianMs: times[3], medianRetainedBytes: heaps[3]}) + '\n');
});
