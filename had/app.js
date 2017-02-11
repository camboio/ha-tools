angular.module('hadApp', ['ngRoute'])

.config(function($routeProvider, $locationProvider){
   $routeProvider.when('/:domain?', {
      templateUrl: '/res/had/view.html',
      controller: 'hadController',
      resolve: {
         init: function($route) {
            return $route.current.params;
         }
      }
   }).otherwise( {template: 'you\'re not supposed to be seeing this' } );
   $locationProvider.html5Mode(true);
})

.controller('hadController', function($scope, init, $http, $location, $route, $routeParams){
   if(init.hasOwnProperty('domain')) {   
      $http.get("http://cambo.io/api/had/" + init.domain)
      .then(function(response){
         $scope.has = response.data;
      }); 
   }else{ }

   $scope.$watch('had', function() {
      if(typeof $scope.had != 'undefined' && $scope.had.length > 0){
/*
         $http.get("http://cambo.io/api/had/" + $scope.had)
         .then(function(response){ 
            var api = response.data;
            $scope.has = api;
         });
*/
         $location.path($scope.had);
      }
   });
});

