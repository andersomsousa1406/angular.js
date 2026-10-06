'use strict';
/* eslint-env browser */

(function() {
  var root = angular.injector(['ng']).get('$rootScope');
  var registration = location.search.indexOf('registration') !== -1;
  var object = location.search.indexOf('object') !== -1;
  var results = {mode: registration ? 'registration' : object ? 'object' : 'array'};
  function heap() {
    window.gc();
    window.gc();
    return performance.memory.usedJSHeapSize;
  }
  if (!window.gc || !performance.memory) {
    document.getElementById('results').textContent = 'GC necessário';
    return;
  }
  root.$watchCollection('value', angular.noop);
  root.$digest();
  function allocate() {
    results.before = heap();
    if (registration) {
      var scalar = function() { return 1; };
      for (var j = 0; j < 50000; j++) root.$watchCollection(scalar, angular.noop);
    } else {
      var values = new Array(1000000);
      for (var i = 0; i < values.length; i++) values[i] = i;
      root.value = object ? {payload: values} : values;
      root.$digest();
      root.value = null;
      root.$digest();
    }
    setTimeout(function() {
      results.retained = heap() - results.before;
      document.getElementById('results').textContent = JSON.stringify(results);
    }, 0);
  }
  setTimeout(allocate, 0);
})();
