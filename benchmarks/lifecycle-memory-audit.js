'use strict';
/* eslint-env browser */

(function() {
  var templates = location.search.indexOf('mode=templates') !== -1;
  var deferred;
  var retainedLink;
  angular.module('lifecycleAudit', []).factory('$templateRequest', function($q) {
    deferred = $q.defer();
    return function() { return deferred.promise; };
  }).directive('failedTemplate', function() {
    return {templateUrl: 'failed.html'};
  });
  var injector = angular.injector(['ng', 'lifecycleAudit']);
  var root = injector.get('$rootScope');
  var results = {mode: templates ? 'templates' : 'last-watch'};

  function heap() {
    window.gc();
    window.gc();
    return performance.memory.usedJSHeapSize;
  }

  function allocate() {
    var scope;
    var i;
    var j;
    results.before = heap();
    if (templates) {
      retainedLink = injector.get('$compile')('<div failed-template></div>');
      for (i = 0; i < 500; i++) {
        scope = root.$new();
        scope.payload = new Array(5000);
        for (j = 0; j < 5000; j++) scope.payload[j] = i + j;
        var clone = retainedLink(scope, angular.noop);
        clone.remove();
        scope.$destroy();
      }
      deferred.reject('unavailable');
      root.$digest();
    } else {
      scope = root.$new();
      scope.payload = new Array(1000000);
      for (i = 0; i < scope.payload.length; i++) scope.payload[i] = i;
      scope.$watch('payload', angular.noop);
      root.$digest();
      scope.$destroy();
    }
    setTimeout(measure, 0);
  }

  function measure() {
    results.retained = heap() - results.before;
    retainedLink = null;
    root.$digest();
    setTimeout(function() {
      results.afterRelease = heap() - results.before;
      document.getElementById('results').textContent = JSON.stringify(results);
    }, 0);
  }

  if (!window.gc || !performance.memory) {
    document.getElementById('results').textContent = 'GC e performance.memory necessários';
    return;
  }
  setTimeout(allocate, 0);
})();
