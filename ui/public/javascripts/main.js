var app = angular.module('bulbulatorApp', ['ngTable', 'angularMoment', 'ui.bootstrap']);

app.controller('EnvironmentsCtrl', function($scope, $filter, ngTableParams) {
  $scope.environments = window.environments;

  $scope.tableParams = new ngTableParams({
      page: 1,
      count: 10,
      sorting: {
        branch: 'asc'
      }
  }, {
      total: window.environments.length,
      getData: function($defer, params) {
        // use build-in angular filter
        var orderedData = params.sorting() ?
          $filter('orderBy')(window.environments, params.orderBy()) :
          window.environments;

        $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
      }
  });
});