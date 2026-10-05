'use strict';

/* global document, performance */

(function() {
  var output = document.getElementById('results');
  if (!window.gc || !performance.memory) {
    output.textContent = 'Execute Chrome com GC exposto e métricas precisas de memória.';
    return;
  }
  var root = angular.injector(['ng']).get('$rootScope');
  var callbacks = [];
  window.gc();
  var before = performance.memory.usedJSHeapSize;
  for (var i = 0; i < 1000; i++) {
    var scope = root.$new();
    scope.payload = new Array(5000);
    for (var j = 0; j < scope.payload.length; j++) scope.payload[j] = j;
    var cancel = scope.$watch('payload');
    cancel();
    callbacks.push(cancel);
    scope.$destroy();
  }
  scope = cancel = null;
  // Give the allocating stack a chance to unwind before collecting.
  window.setTimeout(function() {
    window.gc();
    var retained = performance.memory.usedJSHeapSize;
    callbacks.forEach(function(callback) { callback(); });
    callbacks.length = 0;
    window.setTimeout(function() {
      window.gc();
      output.textContent = JSON.stringify({
        angularVersion: angular.version.full,
        beforeBytes: before,
        retainedBytes: retained,
        retainedDeltaBytes: retained - before,
        afterReleaseBytes: performance.memory.usedJSHeapSize
      }, null, 2);
    }, 0);
  }, 0);
})();
