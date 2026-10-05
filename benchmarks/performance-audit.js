'use strict';

/* global performance, document, navigator */

(function() {
  var injector = angular.injector(['ng']);
  var root = injector.get('$rootScope');
  var parse = injector.get('$parse');
  var compile = injector.get('$compile');
  var results = [];

  function measure(name, setup, iterations) {
    var samples = [];
    for (var sample = 0; sample < 8; sample++) {
      var job = setup();
      var start = performance.now();
      for (var i = 0; i < iterations; i++) job.run();
      var elapsed = (performance.now() - start) / iterations;
      if (sample) samples.push(elapsed);
      job.clean();
    }
    samples.sort(function(a, b) { return a - b; });
    results.push({scenario: name, medianMs: samples[3], minMs: samples[0], maxMs: samples[6]});
  }

  function noop() {}

  [1000, 5000, 10000, 50000].forEach(function(count) {
    measure('register ' + count + ' watchers on one scope', function() {
      var scope = root.$new();
      return {
        run: function() {
          for (var i = 0; i < count; i++) scope.$watch(function(s) { return s.value; }, noop);
        },
        clean: function() { scope.$destroy(); }
      };
    }, 1);
    measure('stable digest ' + count + ' watchers', function() {
      var scope = root.$new();
      for (var i = 0; i < count; i++) scope.$watch(function(s) { return s.value; }, noop);
      scope.$digest();
      return {run: function() { scope.$digest(); }, clean: function() { scope.$destroy(); }};
    }, 100);
  });

  measure('register 50000 watchers across 50 child scopes', function() {
    var scope = root.$new();
    return {
      run: function() {
        for (var i = 0; i < 50; i++) {
          var child = scope.$new();
          for (var j = 0; j < 1000; j++) child.$watch(function(s) { return s.value; }, noop);
        }
      },
      clean: function() { scope.$destroy(); }
    };
  }, 1);

  ['deep', 'collection'].forEach(function(mode) {
    measure('stable digest: 500 ' + mode + ' watches of 100 objects', function() {
      var scope = root.$new();
      scope.items = [];
      for (var j = 0; j < 100; j++) scope.items.push({id: j, name: 'item ' + j});
      for (var i = 0; i < 500; i++) {
        if (mode === 'deep') scope.$watch('items', noop, true);
        else scope.$watchCollection('items', noop);
      }
      scope.$digest();
      return {run: function() { scope.$digest(); }, clean: function() { scope.$destroy(); }};
    }, 20);
  });

  measure('cached parse: expression of 10000 identifiers', function() {
    var values = [];
    for (var i = 0; i < 10000; i++) values.push('v' + i);
    var expression = '[' + values.join(',') + ']';
    parse(expression);
    return {run: function() { parse(expression); }, clean: noop};
  }, 10000);

  [1000, 5000, 10000].forEach(function(count) {
    var sequence = 0;
    measure('cold parse: array of ' + count + ' identifiers', function() {
      var values = [];
      for (var i = 0; i < count; i++) values.push('v' + i);
      var expression = '[' + values.join(',');
      // $parse trims whitespace before consulting its cache. Use a unique identifier.
      return {run: function() { parse(expression + ',unique' + (++sequence) + ']'); }, clean: noop};
    }, 1);
  });

  [1000, 10000, 50000].forEach(function(count) {
    measure('AST only: array of ' + count + ' identifiers', function() {
      var values = [];
      for (var i = 0; i < count; i++) values.push('v' + i);
      var expression = '[' + values.join(',') + ']';
      return {run: function() { parse.$$getAst(expression); }, clean: noop};
    }, 1);
  });

  ['live', 'one-time'].forEach(function(mode) {
    measure('stable digest: ngRepeat 1000 rows, ' + mode + ' binding', function() {
      var scope = root.$new();
      scope.items = [];
      for (var i = 0; i < 1000; i++) scope.items.push({id: i, name: 'item ' + i});
      var binding = mode === 'one-time' ? '::item.name' : 'item.name';
      var element = compile('<div><span ng-repeat="item in items track by item.id">{{' + binding + '}}</span></div>')(scope);
      scope.$digest();
      return {
        run: function() { scope.$digest(); },
        clean: function() { element.remove(); scope.$destroy(); }
      };
    }, 100);
  });

  document.getElementById('results').textContent = JSON.stringify({
    userAgent: navigator.userAgent,
    angularVersion: angular.version.full,
    samples: 7,
    results: results
  }, null, 2);
})();
