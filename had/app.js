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
   $scope.webDetail = true;
   $scope.webSwitch = function() { $scope.webDetail = !$scope.webDetail; }
   $scope.emailDetail = true;
   $scope.emailSwitch = function () { $scope.emailDetail = !$scope.emailDetail; }
 
   if(init.hasOwnProperty('domain')) {   
      $http.get("http://cambo.io/api/had/" + init.domain)
      .then(function(response){
         $scope.has = response.data;
         $scope.verify = angular.copy(response.data);

         $scope.verify.root.ip = ($scope.has.root.ip.match(/^103\.223\.18.*$/) !== null) ? 5:0;
         console.log("root ip matches 103.223.18*: " + $scope.verify.root.ip);
         $scope.verify.ha = ($scope.has.ha.length > 0) ? 5:0;
         console.log("a record exists @ns1.hostingaustralia.com.au: " + $scope.verify.ha);
         var web = $scope.verify.root.ip + $scope.verify.ha;
         $scope.verify.web = (web == 0) ? 'danger' : ((web > 5) ? 'success':'warning');

         $scope.verify.mail.ip = ($scope.has.mail.hasOwnProperty('ip') && 
                                  $scope.has.mail.ip.match(/^103\.223\.18.*$/) !== null) ? 5:0;
         console.log("mail ip matches 103.223.18*: " + $scope.verify.mail.ip);
         $scope.verify.mx = ($scope.has.mx[0].ip.match(/^103\.223\.18.*$/) !== null) ? 5:0;
         console.log("mx record matches 103.223.18*: " + $scope.verify.mx);
         $scope.verify.spam = ($scope.has.mx[0].record.match(/.*spamexperts.*/) !== null) ? 5:0;
         console.log("mx has spamexperts: " + $scope.verify.spam);
         $scope.verify.spam += ($scope.has.mx[0].record.match(/.*outlook.*/i) !== null) ? -5:0;
         console.log("mx has outlook: " + $scope.verify.spam);
         $scope.verify.spam += ($scope.has.mx[0].record.match(/.*google.*/i) !== null) ? -5:0;
         console.log("mx has google: " + $scope.verify.spam);
         var mail = $scope.verify.mail.ip + $scope.verify.mx + $scope.verify.spam;
         $scope.verify.email = (mail <= 0) ? 'danger' : ((mail > 5) ? 'success':'warning');
      }); 
      $scope.had = init.domain;
   }else{ }

   $scope.$watch('had', function() {
      if(typeof $scope.had != 'undefined' && $scope.had.length > 0 && 
         $scope.had.match(/^[a-z0-9][a-z0-9-]{2,}\.[a-z\.]{2,}$/) !== null){
         $location.path($scope.had);
      }
   });


});

