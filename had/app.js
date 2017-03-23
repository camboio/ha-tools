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
         $scope.has.verify.webscore = $scope.has.verify.root_ip_match + $scope.has.verify.has_ha_zone;
         $scope.has.verify.mailscore = $scope.has.verify.mail_ip_match + $scope.has.verify.mx_ip_match + $scope.has.verify.mx_spamexperts - $scope.has.verify.mx_outlook - $scope.has.verify.mx_google;
      }); 
   }else{ }

   $scope.$watch('had', function() {
      if(typeof $scope.had != 'undefined' && $scope.had.length > 0 && 
         $scope.had.match(/^[a-z0-9][a-z0-9-]{2,}\.[a-z\.]{2,}$/) !== null){
         $location.path($scope.had);
      }
   });

   $scope.verify = function(score) {
      var x = "danger";
      if(score > 0) { x = "warning"; }
      if(score > 5) { x = "success"; }
      return x;
   }

   $scope.whois = function(domain) {
      $http.get("http://cambo.io/api/whois/" + domain)
      .then(function(response){
         $scope.has.whois = response.data;
      });
   }

});

