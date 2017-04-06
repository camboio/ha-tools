angular.module('letcApp', ['ngRoute'])

.config(function($routeProvider, $locationProvider){
   $routeProvider.when('/:domain?', { // either there is a domain in the url or there isn't
      templateUrl: '/res/letc/view.html',
      controller: 'letcController',
      resolve: {
         init: function($route) {
            var d = null;            
            if($route.current.params.hasOwnProperty('domain')){
	       d = $route.current.params.domain.match(/^[a-z0-9][a-z0-9-]{2,}\.[a-z\.]{2,}$/); // get domain from params and run a quick regex on it for validation
            }
            return d;
         }
      }
   }).otherwise( {template: 'you\'re not supposed to be seeing this' } ); // black magic otherwise
   $locationProvider.html5Mode(true);
})

.controller('letcController', function($scope, init, $http, $location, $route, $routeParams){

   if(init !== null) {   // if url has domain, do something
      $scope.domain = init[0];
      $http.get("http://cambo.io/api/letc/" + init[0]) // make a letc api call
      .then(function(response){
         $scope.results = response.data;
      }); 
   }

   $scope.$watch('letc', function() { // watch the input for a domain and refresh if so
      if(typeof $scope.letc != 'undefined' && $scope.letc.length > 0 && 
         $scope.letc.match(/^[a-z0-9][a-z0-9-]{2,}\.[a-z\.]{2,}$/) !== null){
         $location.path($scope.letc);
      }
   });

});

