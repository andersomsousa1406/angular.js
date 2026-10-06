'use strict';
/* eslint-env es6 */

// Run after integration-lab/profile-project.js. Private component sources and raw
// Chrome profiles stay in the ignored laboratory; only aggregate timings escape.
var fs = require('fs');
var path = require('path');
var results = [];

['old', 'official', 'new'].forEach(function(mode) {
  ['digest', 'components'].forEach(function(workload) {
    var profile = JSON.parse(fs.readFileSync(path.join('integration-lab',
      'cpu-' + mode + '-' + workload + '.cpuprofile'), 'utf8'));
    var nodes = new Map();
    var groups = {angular: 0, components: 0, jquery: 0, generated: 0,
      runtime: 0, idle: 0, harness: 0};
    profile.nodes.forEach(function(node) { nodes.set(node.id, node.callFrame); });
    profile.samples.forEach(function(id, index) {
      var frame = nodes.get(id);
      var url = frame.url;
      var group;
      if (frame.functionName === '(idle)') group = 'idle';
      else if (/\/angular\.min\.js/.test(url)) group = 'angular';
      else if (/\/componentes\/|\/functions\.js|\/selected-helpers\.js/.test(url)) group = 'components';
      else if (/\/jquery\.js/.test(url)) group = 'jquery';
      else if (!url && frame.functionName === 'fn') group = 'generated';
      else if (!url) group = 'runtime';
      else group = 'harness';
      groups[group] += (profile.timeDeltas[index] || 0) / 1000;
    });
    var active = Object.keys(groups).reduce(function(sum, group) {
      return sum + (group === 'idle' ? 0 : groups[group]);
    }, 0);
    var shares = {};
    Object.keys(groups).forEach(function(group) {
      shares[group] = group === 'idle' ? null : Math.round(10000 * groups[group] / active) / 100;
      groups[group] = Math.round(groups[group] * 1000) / 1000;
    });
    results.push({mode: mode, workload: workload, sampledSelfMs: groups,
      activeSampledMs: Math.round(active * 1000) / 1000, activeSharePercent: shares});
  });
});

fs.writeFileSync('benchmarks/project-cpu-audit-results.json', JSON.stringify({
  samplingIntervalUs: 100,
  digestIterations: 10000,
  note: 'One diagnostic profile per version/workload. Self time, not inclusive time; '
    + 'sampling and JIT inlining affect attribution. Not a throughput comparison.',
  results: results
}, null, 2) + '\n');
