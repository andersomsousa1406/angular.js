'use strict';
/* eslint-env node */
var fs = require('fs');
var crypto = require('crypto');
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function median(values) {
  values = values.slice().sort(function(a, b) { return a - b; });
  var middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}
function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
var core = read('benchmarks/core-round10-audit-results.json');
var table = read('benchmarks/table-date-audit-results.json');
var performance = read('integration-lab/three-version-performance.json');
var functional = read('integration-lab/three-version-functional.json');
var checks = read('integration-lab/three-version-checks.json');
var screenChecks = read('integration-lab/round10-screen-checks.json');
var results = {
  date: '2026-10-06', browser: 'Chrome 154 / Windows',
  coreSourceCommit: 'e4fa3fee9', parserCommit: '3992f2295', tablePatchCommit: '622583c66',
  coreBaselineSourceCommit: '96e85519f',
  unitTestExecutions: 26910,
  coreMicrobenchmark: {}, tableMicrobenchmark: {},
  project: {warmupDigestsPerVersion: 5000, checks: checks, screenChecks: screenChecks, versions: {}}
};
Object.keys(core[0]).filter(function(key) { return core[0][key] && core[0][key].medianMs !== undefined; })
  .forEach(function(key) {
    var before = median(core.filter(function(row) { return row.mode === 'baseline'; })
      .map(function(row) { return row[key].medianMs; }));
    var after = median(core.filter(function(row) { return row.mode === 'candidate'; })
      .map(function(row) { return row[key].medianMs; }));
    results.coreMicrobenchmark[key] = {beforeMs: before, afterMs: after, reductionPercent: 100 * (1 - after / before)};
  });
Object.keys(table.rows[0].timings).forEach(function(key) {
  var before = median(table.rows.filter(function(row) { return row.variant === 'before'; })
    .map(function(row) { return row.timings[key].median; }));
  var after = median(table.rows.filter(function(row) { return row.variant === 'after'; })
    .map(function(row) { return row.timings[key].median; }));
  results.tableMicrobenchmark[key] = {beforeMs: before, afterMs: after, reductionPercent: 100 * (1 - after / before)};
});
results.tableFormatChecks = table.formatChecks;
results.tableFormatPassed = table.formatPassed;
['old', 'official', 'new'].forEach(function(mode) {
  var rows = performance.filter(function(row) { return row.mode === mode; });
  var tests = functional.filter(function(row) { return row.mode === mode; })[0];
  var directory = mode === 'old' ? 'production' : mode === 'official' ? 'official-1.8.3' : 'new';
  var hashes = {};
  ['angular.min.js', 'angular-animate.min.js', 'angular-resource.min.js', 'angular-sanitize.js'].forEach(function(file) {
    hashes[file] = hash('integration-lab/' + directory + '/' + file);
  });
  results.project.versions[mode] = {
    version: tests.version, testsPassed: tests.tests.filter(function(test) { return test.pass; }).length,
    testsTotal: tests.tests.length, hashes: hashes,
    tableHTMLMs: median(rows.map(function(row) { return row.tableHTML.medianMs; })),
    steadyDigestMs: median(rows.map(function(row) { return row.steadyDigest.medianMs; })),
    dirtyDigest500Ms: median(rows.map(function(row) { return row.dirtyDigest500Watchers.medianMs; })),
    recompileWithWaitMs: median(rows.map(function(row) { return row.recompile.medianMs; })),
    retainedHeapBytes: median(rows.map(function(row) { return row.heapAfter.usedSize; })),
    roundMedians: rows.map(function(row) {
      return {round: row.round, tableHTMLMs: row.tableHTML.medianMs,
        steadyDigestMs: row.steadyDigest.medianMs, dirtyDigest500Ms: row.dirtyDigest500Watchers.medianMs,
        recompileWithWaitMs: row.recompile.medianMs};
    }),
    watchers: rows.map(function(row) { return [row.recompile.watchersBefore, row.recompile.watchersAfter]; }),
    globalEventsStable: rows.every(function(row) {
      return JSON.stringify(row.recompile.globalEventsBefore) === JSON.stringify(row.recompile.globalEventsAfter);
    })
  };
});
results.coreMicrobenchmarkHashes = {
  baseline: hash('integration-lab/core-round10/baseline.js'),
  candidate: hash('integration-lab/core-round10/candidate.js')
};
results.componentHashes = {
  before: hash('integration-lab/backups/TabelaJS-before-date-optimization.js'),
  after: hash('integration-lab/production/componentes/TabelaJS.js')
};
if (!checks.allTestsPassed || !checks.snapshotsEqual || !checks.noErrors || !table.formatPassed ||
    screenChecks.some(function(row) { return row.passed !== row.total || row.errors.length; })) {
  throw new Error('Compatibility checks failed');
}
fs.writeFileSync('benchmarks/round10-audit-summary.json', JSON.stringify(results, null, 2) + '\n');
