'use strict';
/* eslint-env node */
var fs = require('fs');
var crypto = require('crypto');
var rows = JSON.parse(fs.readFileSync('benchmarks/core-round11-audit-results.json', 'utf8'));
function median(values) {
  values = values.slice().sort(function(a, b) { return a - b; });
  return (values[1] + values[2]) / 2;
}
function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
var result = {
  date: '2026-10-07', browser: 'Chrome 154 / Windows',
  sourceCommits: ['3d399de7d', 'f36e82254', 'c99191bb7'],
  unitTestExecutions: 26930, metrics: {}, outputsEqual: true,
  snapshotSlotsFromSource: {singleOf100: {before: 100, after: 0},
    twoOf100: {before: 100, after: 2}, dense100: {before: 100, after: 100}},
  generatedCodeLengths: rows.map(function(row) {
    return {mode: row.mode, round: row.round, length: row.generatedCodeLength};
  }),
  hashes: {baseline: hash('integration-lab/core-round11/baseline.js'),
    candidate: hash('integration-lab/core-round11/candidate.js'), minified: hash('build/angular.min.js')}
};
rows.forEach(function(row) {
  if (JSON.stringify(row.outputs) !== JSON.stringify(rows[0].outputs)) throw new Error('Different outputs');
});
Object.keys(rows[0]).filter(function(key) { return rows[0][key] && rows[0][key].medianMs !== undefined; })
  .forEach(function(key) {
    var baseline = rows.filter(function(row) { return row.mode === 'baseline'; }).map(function(row) { return row[key].medianMs; });
    var candidate = rows.filter(function(row) { return row.mode === 'candidate'; }).map(function(row) { return row[key].medianMs; });
    var before = median(baseline), after = median(candidate);
    result.metrics[key] = {beforeMs: before, afterMs: after, reductionPercent: 100 * (1 - after / before),
      baselineRoundMedians: baseline, candidateRoundMedians: candidate};
  });
result.integrationChecks = JSON.parse(fs.readFileSync('integration-lab/round11-screen-checks.json', 'utf8'));
if (result.integrationChecks.some(function(row) { return row.passed !== row.total || row.errors.length; })) {
  throw new Error('Integration check failed');
}
result.componentFiles = JSON.parse(fs.readFileSync('integration-lab/round11-component-integrity.json', 'utf8'));
if (!result.componentFiles.unchanged) throw new Error('Components changed');
fs.writeFileSync('benchmarks/round11-audit-summary.json', JSON.stringify(result, null, 2) + '\n');
