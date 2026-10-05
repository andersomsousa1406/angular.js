/* global document, performance */
'use strict';
(function() {
  var linked = 0, reported = 0;
  angular.module('queueAudit', []).value('$exceptionHandler', function() { reported++; })
    .directive('queueItem', function() {
      return {templateUrl: 'queue.html', link: function() { linked++; }};
    });
  var injector = angular.injector(['ng', 'queueAudit']);
  var root = injector.get('$rootScope');
  var compile = injector.get('$compile');
  var q = injector.get('$q');
  injector.get('$templateCache').put('queue.html', '<span></span>');
  function measure(work) {
    work();
    var samples = [];
    for (var i = 0; i < 7; i++) samples.push(work());
    samples.sort(function(a, b) { return a - b; });
    return samples[3];
  }
  var result = {};
  result.templateQueueMs = measure(function() {
    var link = compile('<div queue-item></div>'), clones = [];
    var scope = root.$new();
    for (var i = 0; i < 5000; i++) clones.push(link(scope, angular.noop));
    linked = 0;
    var start = performance.now();
    root.$digest();
    var elapsed = performance.now() - start;
    if (linked !== 5000) throw new Error('Missing template links');
    scope.$destroy();
    angular.forEach(clones, function(clone) { clone.remove(); });
    return elapsed;
  });
  result.rejectionQueueMs = measure(function() {
    reported = 0;
    for (var i = 0; i < 50000; i++) q.reject(i);
    var start = performance.now();
    root.$digest();
    var elapsed = performance.now() - start;
    if (reported !== 50000) throw new Error('Missing rejection reports');
    return elapsed;
  });
  document.getElementById('results').textContent = JSON.stringify(result, null, 2);
})();
