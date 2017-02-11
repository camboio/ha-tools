angular.module('hadApp', [])

.controller('hadController', function($scope, $http){
   $scope.$watch('had', function() {
   if(typeof $scope.had != 'undefined' && $scope.had.length > 0){
      $http.get("http://cambo.io:3000/had/" + $scope.had)
      .then(function(response){ 
         
         $scope.has = response.data;
      });
   }
   });
});

