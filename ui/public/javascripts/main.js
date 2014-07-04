/**
 * @ngdoc module
 * @name Bulbulator
 * @author Jonathan Gautheron <ceble@nexway.com>
 * @description Main module for Bulbulator
 *
 * @usage
 *
 * ```
 * #/{GUID}
 * ```
 */
'use strict';

var app = angular.module('bulbulatorApp', [
  'ngTable', 'angularMoment', 'ui.bootstrap'
])
.constant(
  'BBL_CONSTANT', {
    JIRA_BROWSER_URL: 'https://nexway.atlassian.net/browse/'
  }
);

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

app.controller('NewEnvironmentCtrl', [
  '$scope',
  '$filter',
  'ngTableParams',
  'BBL_CONSTANT',
  function(
    $scope, $filter, ngTableParams,
    BBL_CONSTANT
  ) {

    $scope.formFilled = false;
    $scope.commits    = [];

    $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        filter: {
          'message': 'KID-'
        },
        sorting: {
          'commit.author.date': 'desc'
        }
    }, {
        total: $scope.commits,
        getData: function($defer, params) {
          var filteredData = params.filter() ?
            $filter('filter')($scope.commits, params.filter()) :
            $scope.commits;

          var orderedData = params.sorting() ?
            $filter('orderBy')(filteredData, params.orderBy()) :
            $scope.commits;

          params.total(orderedData.length);
          $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
    });

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

      // retrieve the commits
      $.getJSON('/new/getCommits',
        {
          user: $scope.repository.owner.login,
          sha: newValue
        }, function(data) {
          $scope.$apply(function() {
            $scope.commits = data;
            $scope.tableParams.reload();
          });
      });
    });

    // dom load methods
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
  }
]).directive('commitAuthor', function() {
  function link(scope, element, attrs) {
    var author = scope.info.committer.login.substr(0, 3).toUpperCase();
    scope.info.author = author;
  }
  return {
    link: link,
    template: '<img src="{{info.committer.avatar_url}}" width="20" class="gravatar-small"> {{info.author}}'
  };
}).directive('commitMessage', ['BBL_CONSTANT'], function() {
  function link(scope, element, attrs) {
    console.log(BBL_CONSTANT)
    var message = scope.info.message;
    message = message.replace(/kid\-(\d+)/ig, '<a href="test">KID-$1</a>');
    element.html(message);
  }
  return {
    link: link
  };
});