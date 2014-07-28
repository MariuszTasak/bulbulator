/**
 * @ngdoc module
 * @name Bulbulator
 * @author Jonathan Gautheron <jgautheron@nexway.com>
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
  'ngTable', 'angularMoment', 'ui.bootstrap', 'ngSanitize'
])
.constant(
  'BBL_CONSTANT', {
    JIRA_BROWSER_URL: 'https://nexway.atlassian.net/browse/',
    WWW_URL: 'http://bulbulator.nexwai.pl/',
    WS_CREATION_EVENT: 'bulbulator creation',
    WS_CREATED_EVENT: 'bulbulator created',
    WS_FAILED_EVENT: 'bulbulator failed',
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
    $scope.servers    = window.servers;
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
    var author = scope.info.commit.committer.email.substr(0, 3).toUpperCase();
    scope.info.author = author;
  }
  return {
    link: link,
    template: '<img src="{{info.committer.avatar_url}}" width="20" class="gravatar-small"> <span class="label label-default">{{info.author}}</label>'
  };
}).directive('commitMessage', function(BBL_CONSTANT) {
  function link(scope, element, attrs) {
    var message = scope.info.message;
    message = message.replace(/kid\-(\d+)/ig, '<a href="'+BBL_CONSTANT.JIRA_BROWSER_URL+'KID-$1" data-jira="KID-$1" target="_blank">KID-$1</a>');
    message = message.replace(/kid\-(\d+)/ig, '<a href="'+BBL_CONSTANT.JIRA_BROWSER_URL+'KIF-$1" data-jira="KIF-$1" target="_blank">KIF-$1</a>');
    element.html(message);
  }
  return {
    link: link
  };
});

app.controller('NavbarCtrl', [
  '$scope',
  '$modal',
  '$log',
  'BBL_CONSTANT',
  function(
    $scope, $modal, $log,
    BBL_CONSTANT
  ) {
    $scope.deployments     = {};
    $scope.deploymentCount = 0;
    $scope.broadcasts      = [];
    $scope.loading         = false;

    var socket = io();

    // event sent for communicating status
    socket.on(BBL_CONSTANT.WS_CREATION_EVENT, function(broadcast) {
      // first broadcast received
      if (0 === $scope.broadcasts.length) {
        $scope.broadcasts.push({
          hash: broadcast.hash,
          message: '->> Starting deployment '+broadcast.hash.substring(0, 10)
        });
        $scope.loading = true;
      }

      $scope.$apply(function() {
        $scope.deployments[broadcast.hash] = broadcast.hash;
        $scope.deploymentCount = Object.keys($scope.deployments).length;
        $scope.broadcasts.push(broadcast);
      });

      var $container = $('.stdout'), height = $container[0].scrollHeight;
      $container.scrollTop(height);
    });

    socket.on(BBL_CONSTANT.WS_CREATED_EVENT, function(broadcast) {
      $scope.$apply(function() {
        var logUrl = '/log/'+broadcast.hash;

        $scope.loading = false;
        $scope.broadcasts.push({
          hash: broadcast.hash,
          message: '->> <a href="'+logUrl+'">Click here to consult the full log</a>'
        });
      });
    });

    socket.on(BBL_CONSTANT.WS_FAILED_EVENT, function(broadcast) {
      $scope.$apply(function() {
        var logUrl = '/log/'+broadcast.hash;

        $scope.loading = false;
        $scope.broadcasts.push({
          hash: broadcast.hash,
          message: '->> <a href="'+logUrl+'">Click here to consult the full log</a>'
        });
      });
    });

    $scope.open = function (size) {
      var modalInstance = $modal.open({
        templateUrl: 'modalDeployments.html',
        controller: 'ModalInstanceCtrl',
        size: 'lg',
        resolve: {
          broadcasts: function () {
            return $scope.broadcasts;
          }
        }
      });
    };
  }
]);

app.controller('ModalInstanceCtrl', function($scope, $modalInstance, broadcasts) {
  $scope.broadcasts = broadcasts;

  $scope.close = function () {
    $modalInstance.dismiss('cancel');
  };
});