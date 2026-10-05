/* global document, performance */
'use strict';
(function() {
  var injector = angular.injector(['ng']);
  var interpolate = injector.get('$interpolate');
  var root = injector.get('$rootScope');
  function measure(work) {
    work();
    var samples = [];
    for (var i = 0; i < 7; i++) samples.push(work());
    samples.sort(function(a, b) { return a - b; });
    return samples[3];
  }
  function interpolation(text, expected) {
    var fn = interpolate(text), context = {value: 'one', other: 'two'};
    return measure(function() {
      var start = performance.now(), value;
      for (var i = 0; i < 500000; i++) value = fn(context);
      var elapsed = performance.now() - start;
      if (value !== expected) throw new Error('Interpolation changed');
      return elapsed;
    });
  }
  var httpOnly = window.location.search.indexOf('mode=http') !== -1;
  var result = httpOnly ? {} : {
    singleInterpolationMs: interpolation('before {{value}} after', 'before one after'),
    multiInterpolationMs: interpolation('{{value}} {{other}}', 'one two')
  };
  angular.forEach(httpOnly ? [] : ['$emit', '$broadcast'], function(method) {
    result[method + 'CompactionMs'] = measure(function() {
      var scope = root.$new(), cancel = [], calls = 0;
      for (var i = 0; i < 20000; i++) cancel.push(scope.$on('audit', angular.noop));
      for (i = 0; i < 5000; i++) scope.$on('audit', function() { calls++; });
      angular.forEach(cancel, function(fn) { fn(); });
      var start = performance.now();
      scope[method]('audit');
      var elapsed = performance.now() - start;
      if (calls !== 5000) throw new Error('Event callbacks changed');
      scope.$destroy();
      return elapsed;
    });
  });
  angular.forEach([0, 20, 200], function(count) {
    var name = 'httpAudit' + count;
    angular.module(name, []).value('$httpBackend', function(method, url, data, callback) {
      callback(200, 'ok', '', 'OK', 'complete');
    }).config(['$httpProvider', function(provider) {
      for (var i = 0; i < count; i++) provider.interceptors.push(function() {
        return {request: function(config) { return config; }};
      });
    }]);
    var httpInjector = angular.injector(['ng', name]);
    var http = httpInjector.get('$http'), scope = httpInjector.get('$rootScope');
    result['http' + count + 'InterceptorsSetupMs'] = measure(function() {
      var completed = 0, start = performance.now();
      for (var i = 0; i < 1000; i++) http.get('/audit').then(function() { completed++; });
      var elapsed = performance.now() - start;
      scope.$digest();
      if (completed !== 1000) throw new Error('HTTP callbacks changed');
      return elapsed;
    });
    scope.$destroy();
  });
  root.$destroy();
  document.getElementById('results').textContent = JSON.stringify(result, null, 2);
})();
