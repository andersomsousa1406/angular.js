'use strict';
/* eslint-env browser */

(function() {
  var injector = angular.injector(['ng', 'ngAnimate']);
  var cache = injector.get('$$animateCache');
  var parent = document.createElement('div');
  var node = document.createElement('div');
  parent.appendChild(node);
  var samples = [];
  var checksum = 0;
  for (var sample = 0; sample < 8; sample++) {
    var start = performance.now();
    for (var i = 0; i < 100000; i++) {
      checksum += cache.cacheKey(node, 'enter', 'added' + (i % 100), 'removed').length;
    }
    if (sample) samples.push(performance.now() - start);
  }
  samples.sort(function(a, b) { return a - b; });
  document.getElementById('results').textContent = JSON.stringify({calls: 100000, medianMs: samples[3], checksum: checksum});
})();
