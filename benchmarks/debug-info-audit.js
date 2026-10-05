'use strict';

/* global document */

(function() {
  var expected = window.location.search.indexOf('expect=true') !== -1;
  var checks = [];
  var defaultEnabled;
  function check(name, passed) { checks.push({name: name, passed: !!passed}); }
  angular.module('debugAudit', []).config(['$compileProvider', function(provider) {
    defaultEnabled = provider.debugInfoEnabled();
  }]).directive('auditChild', function() {
    return {scope: true, template: '<span ng-bind="value"></span>'};
  }).directive('auditIsolate', function() {
    return {scope: {label: '@'}, template: '<span>{{label}}</span>'};
  });
  var injector = angular.injector(['ng', 'debugAudit']);
  var scope = injector.get('$rootScope');
  var element = injector.get('$compile')('<div><div audit-child></div><div audit-isolate label="label"></div></div>')(scope);
  scope.value = 'first';
  scope.$digest();
  scope.value = 'second';
  scope.$digest();
  var child = angular.element(element[0].children[0]);
  var span = angular.element(child[0].firstChild);
  var isolated = angular.element(element[0].children[1]);
  check('default matches selected build', defaultEnabled === expected);
  check('binding still updates', span.text() === 'second');
  check('scope metadata matches debug setting', !!child.data('$scope') === expected);
  check('binding metadata matches debug setting', !!span.data('$binding') === expected);
  check('scope class matches debug setting', child.hasClass('ng-scope') === expected);
  check('binding class matches debug setting', span.hasClass('ng-binding') === expected);
  check('isolate metadata matches debug setting', !!isolated.isolateScope() === expected);
  element.remove();
  scope.$destroy();
  angular.module('debugAuditOverride', []).config(['$compileProvider', function(provider) {
    provider.debugInfoEnabled(true);
    check('application can enable debug', provider.debugInfoEnabled() === true);
  }]);
  var override = angular.injector(['ng', 'debugAuditOverride']);
  override.get('$compile')(angular.element('<span>{{1 + 1}}</span>'))(override.get('$rootScope'));
  override.get('$rootScope').$destroy();
  var bootElement = angular.element('<div><span>{{1 + 1}}</span></div>');
  var bootInjector = angular.bootstrap(bootElement[0], [], {debugInfoEnabled: true});
  check('bootstrap can enable debug', angular.element(bootElement[0].firstChild).hasClass('ng-binding'));
  check('bootstrap binding works', bootElement.text() === '2');
  bootInjector.get('$rootScope').$destroy();
  bootElement.remove();
  document.getElementById('results').textContent = JSON.stringify({
    passed: checks.every(function(item) { return item.passed; }),
    defaultEnabled: defaultEnabled,
    checks: checks
  }, null, 2);
})();
