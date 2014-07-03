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

app.controller('NewEnvironmentCtrl', function($scope) {
  $scope.formFilled = false;

  // init - first get the forks
  $.getJSON('/new/getForks', function(data) {
    // prepend to the array the main user
    data.unshift({owner: {login: 'NexwayGroup'}});
    $('#repository').attr('disabled', false);

    $scope.$apply(function() {
      $scope.repositories = data;
    });
  });

  $scope.$watch('commit', function(newValue, oldValue) {
    if ('undefined' === typeof $scope.repository) {
      return;
    }

    // load the websites available with this commit
    $scope.load.websites($scope.repository, newValue);

    // retrieve the commit info
    $.getJSON('/new/getCommit',
      {
        user: $scope.repository.owner.login,
        sha: newValue
      }, function(data) {
        $scope.$apply(function() {
          $scope.commitInfo = data;
        });
    });
  });

  $scope.load = {
    branches: function(repository) {
      $.getJSON('/new/getBranches',
        {
          user: repository.owner.login
        },
        function(data) {
          $('#branch').attr('disabled', false);

          $scope.$apply(function() {
            $scope.branches = data;
          });
      });
    },

    websites: function(repository, sha) {
      $.getJSON('/new/getWebsites',
        {
          user: repository.owner.login,
          ref: sha
        },
        function(data) {
          $('#website').attr('disabled', false);

          $scope.$apply(function() {
            $scope.websites = data;
          });
      });
    },

    environments: function(repository, ref, website) {
      if ('string' !== typeof ref) {
        // branch name
        ref = ref.name;
      }

      $.getJSON('/new/getEnvironments',
        {
          user: repository.owner.login,
          ref: ref,
          website: website.name
        },
        function(data) {
          $('#environment').attr('disabled', false);

          $scope.$apply(function() {
            $scope.environments = data;
          });
      });
    }
  };
});