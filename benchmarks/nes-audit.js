/* global document, performance */
'use strict';
(function() {
  angular.module('nesAudit', ['ngSanitize']).config(['$compileProvider', '$sanitizeProvider',
    function(compile, sanitize) {
      compile.imgSrcSanitizationTrustedUrlList(/^https:\/\/allowed\.example\//);
      sanitize.enableSvg(true);
    }]).directive('auditComment', function() { return {restrict: 'M', link: angular.noop}; });
  var injector = angular.injector(['ng', 'nesAudit']);
  var root = injector.get('$rootScope'), compile = injector.get('$compile');
  var sanitize = injector.get('$sanitize'), linky = injector.get('$filter')('linky');
  var results = {security: [], times: []};
  function check(name, passed) { results.security.push({name: name, passed: !!passed}); }
  angular.forEach(['href', 'ng-href', 'ng-attr-href'], function(attribute) {
    var scope = root.$new();
    scope.url = 'https://blocked.example/image.png';
    var svg = compile('<svg><image ' + attribute + '="{{url}}"></image></svg>')(scope);
    scope.$digest();
    check('SVG binding ' + attribute, /^unsafe:/.test(svg.find('image').attr(attribute === 'ng-href' ? 'xlink:href' : 'href')));
    check('debug scope ' + attribute, svg.scope() === scope);
    scope.url = injector.get('$sce').trustAsResourceUrl('https://blocked.example/trusted.png');
    scope.$digest();
    check('SVG trusted resource ' + attribute, /^unsafe:/.test(svg.find('image').attr(attribute === 'ng-href' ? 'xlink:href' : 'href')));
    svg.remove();
    scope.$destroy();
  });
  angular.forEach(['href', 'xlink:href'], function(attribute) {
    check('SVG sanitize ' + attribute, sanitize('<svg><image ' + attribute + '="https://blocked.example/image.png"></image></svg>')
      .indexOf('blocked.example') === -1);
  });
  function measure(work) {
    work();
    var times = [];
    for (var i = 0; i < 3; i++) {
      var start = performance.now();
      work();
      times.push(performance.now() - start);
    }
    times.sort(function(a, b) { return a - b; });
    return times[1];
  }
  angular.forEach([1000, 2000, 4000], function(size) {
    var input = new Array(size + 1).join('a');
    var comment = document.createComment('directive: audit-comment ' + new Array(size + 1).join(' ') + 'x\ny');
    // A dynamic function reproduces comment-like text inside a valid function body.
    // eslint-disable-next-line no-new-func
    var fn = new Function('dependency', 'var text = "' + new Array(size + 1).join('/*a') + '"; return dependency;');
    results.times.push({size: size, linkyMs: measure(function() {
      if (linky(input) !== input) throw new Error('Non-link text changed');
    }), annotationMs: measure(function() {
      delete fn.$inject;
      if (injector.annotate(fn)[0] !== 'dependency') throw new Error('Annotation changed');
    }), commentMs: measure(function() { compile(comment)(root); })});
  });
  root.$destroy();
  results.passed = results.security.every(function(check) { return check.passed; });
  document.getElementById('results').textContent = JSON.stringify(results, null, 2);
})();
