'use strict';
/* eslint-env browser */

(function() {
  var injector = angular.injector(['ng']);
  var root = injector.get('$rootScope');
  var orderBy = injector.get('orderByFilter');
  var results = [];
  var values = [];
  for (var i = 0; i < 10000; i++) values.push({id: i, key: (i * 7919) % 10000});
  function measure(name, run, iterations) {
    var samples = [];
    for (var sample = 0; sample < 8; sample++) {
      var start = performance.now();
      for (var j = 0; j < iterations; j++) run();
      if (sample) samples.push((performance.now() - start) / iterations);
    }
    samples.sort(function(a, b) { return a - b; });
    results.push({scenario: name, medianMs: samples[3]});
  }
  measure('orderBy 10000 items, one criterion', function() {
    var sorted = orderBy(values, 'key');
    if (sorted[0].key !== 0 || sorted.length !== values.length) throw new Error('Incorrect sort');
  }, 10);
  measure('orderBy 10000 items, two criteria', function() { orderBy(values, ['key', 'id']); }, 10);
  [100, 1000, 5000].forEach(function(count) {
    var scope = root.$new();
    scope.items = [];
    for (var j = 0; j < count; j++) scope.items.push({id: j, label: 'option' + j, disabled: j % 3 === 0});
    var select = injector.get('$compile')('<select ng-model="selected" ng-options="item as item.label disable when item.disabled for item in items track by item.id"></select>')(scope);
    scope.$digest();
    measure('stable ngOptions ' + count + ' options', function() { scope.$digest(); }, 100);
    select.remove();
    scope.$destroy();
  });
  document.getElementById('results').textContent = JSON.stringify(results);
})();
