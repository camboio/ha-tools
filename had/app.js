angular.module('hadApp', [])

.controller('hadController', function($scope, $http){
   $scope.$watch('had', function() {
   if(typeof $scope.had != 'undefined' && $scope.had.length > 0){
      $http.get("http://cambo.io/api/had/" + $scope.had)
      .then(function(response){ 
         var api = response.data;
/*
api = { 
domain: 
mail { cname: , ip: }
mx [ { record: , priority: , ip: } ]
ns[]
root { ip: , rdns: }
www { cname:  , ip: }
}
*/
         $scope.has = api;
      });
   }
   });
   $scope.had = 'cambo.io';
});

