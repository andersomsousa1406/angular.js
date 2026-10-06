'use strict';
/* eslint-env browser */

(function() {
  var frames = [];
  function raf(fn) {
    frames.push(fn);
    return function() {
      var index = frames.indexOf(fn);
      if (index !== -1) frames.splice(index, 1);
    };
  }
  raf.supported = true;
  function flush() {
    var pending = frames;
    frames = [];
    pending.forEach(function(fn) { fn(); });
  }
  angular.module('animationMemoryAudit', ['ngAnimate'])
    .value('$rootElement', angular.element(document.body))
    .value('$$rAF', raf);
  var injector = angular.injector(['ng', 'animationMemoryAudit']);
  injector.get('$animate').enabled(true);
  var root = injector.get('$rootScope');
  var animate = injector.get('$animateCss');
  var results = {};
  if (location.search.indexOf('mode=scheduler') !== -1) {
    var scheduler = injector.get('$$rAFScheduler');
    var rows = [];
    [1000, 10000, 50000].forEach(function(count) {
      var samples = [];
      for (var sample = 0; sample < 4; sample++) {
        var calls = 0;
        var tasks = [];
        var task = function() { calls++; };
        for (var i = 0; i < count; i++) tasks.push([task]);
        frames = [];
        var start = performance.now();
        scheduler(tasks);
        var position = 0;
        while (position < frames.length) {
          var fn = frames[position];
          frames[position++] = null;
          fn();
        }
        if (sample) samples.push(performance.now() - start);
        if (calls !== count) throw new Error('Lost tasks');
      }
      samples.sort(function(a, b) { return a - b; });
      rows.push({waves: count, medianMs: samples[1]});
    });
    document.getElementById('results').textContent = JSON.stringify(rows);
    return;
  }
  function heap() {
    window.gc();
    window.gc();
    return performance.memory.usedJSHeapSize;
  }
  function allocate() {
    results.before = heap();
    var element = angular.element('<div></div>');
    angular.element(document.body).append(element);
    element[0].auditPayload = new Array(1000000);
    for (var i = 0; i < 1000000; i++) element[0].auditPayload[i] = i;
    var animator = animate(element, {addClass: 'audit', duration: 5, stagger: 600, staggerIndex: 3});
    results.willAnimate = animator.$$willAnimate;
    var runner = animator.start();
    flush();
    runner.cancel();
    element.remove();
    flush();
    root.$digest();
    setTimeout(function() {
      results.retained = heap() - results.before;
      document.getElementById('results').textContent = JSON.stringify(results);
    }, 0);
  }
  if (!window.gc || !performance.memory) {
    document.getElementById('results').textContent = 'GC e performance.memory necessários';
    return;
  }
  setTimeout(allocate, 0);
})();
