'use strict';

/* global document, performance */

(function() {
  var output = document.getElementById('results');
  if (!window.gc || !performance.memory) {
    output.textContent = 'Execute Chrome com GC exposto e métricas precisas de memória.';
    return;
  }
  var injector = angular.injector(['ng']);
  var root = injector.get('$rootScope');
  var mode = window.location.search.indexOf('mode=lru') !== -1 ? 'lru' :
    window.location.search.indexOf('mode=events') !== -1 ? 'events' : 'watchers';
  var callbacks = [];
  window.gc();
  var before = performance.memory.usedJSHeapSize;
  var scope, cancel, i, j;
  if (mode === 'lru') {
    var cache = injector.get('$cacheFactory')('memory-audit-lru', {capacity: 1000});
    for (i = 0; i < 1000; i++) cache.put('key-' + i + '-' + new Array(5001).join('x'), i);
    cache.destroy();
    callbacks.push(cache);
    cache = null;
  } else for (i = 0; i < 1000; i++) {
    scope = root.$new();
    scope.payload = new Array(5000);
    for (j = 0; j < scope.payload.length; j++) scope.payload[j] = j;
    cancel = mode === 'events' ? scope.$on('audit', angular.noop) : scope.$watch('payload');
    cancel();
    callbacks.push(cancel);
    scope.$destroy();
  }
  scope = cancel = null;
  // Give the allocating stack a chance to unwind before collecting.
  window.setTimeout(function() {
    window.gc();
    var retained = performance.memory.usedJSHeapSize;
    if (mode !== 'lru') callbacks.forEach(function(callback) { callback(); });
    callbacks.length = 0;
    window.setTimeout(function() {
      window.gc();
      output.textContent = JSON.stringify({
        angularVersion: angular.version.full,
        mode: mode,
        beforeBytes: before,
        retainedBytes: retained,
        retainedDeltaBytes: retained - before,
        afterReleaseBytes: performance.memory.usedJSHeapSize
      }, null, 2);
    }, 0);
  }, 0);
})();
