angular.module('digApp', [])

.controller('digController', function($scope, $http){
   $scope.$watch('dig', function() {
   if(typeof $scope.dig != 'undefined' && $scope.dig.length > 0){
      var args = $scope.dig;
      args = args.replace(/ /g,"/");
      $http.get("./api/" + args)
      .then(function(response){
         $scope.dug = response.data;
      });
   }
   });
});
