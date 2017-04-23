var express = require('express');
var app = express.Router();
var async = require('async');
var request = require('request');
var dig = require('../functions');
var path = require('path');

app.get('/api/*', function(req, res) {
   var domain = req.params[0];
   var resObj = {};
   var tasks = [];
   var ip = '';

   tasks.push(function(callback){ // check if able to connect to domain on port 2083
      request('http://' + domain + ':2083', { followRedirect: false, timeout: 4000 }, function (error, response, body) {
         var obj = { error: error, response: response, body: body };
         resObj['p2083'] = obj;
         callback();
      });
   });

   tasks.push(function(callback){ // check if able to connect on domain.tld/cpanel
      request('http://' + domain + '/cpanel', { followRedirect: false, timeout: 4000 }, function (error, response, body) {
         var obj = { error: error, response: response, body: body };
         resObj['slash_cPanel'] = obj;
         callback();
      });
   });

   tasks.push(function(callback){ // check if able to connect on cpanel.domain.tld
      request('http://cpanel.' + domain, { followRedirect: false, timeout: 4000 }, function (error, response, body) {
         var obj = { error: error, response: response, body: body };
         resObj['cPanel_dot'] = obj;
         callback();
      });
   });

   tasks.push(function(callback){ // check if mail is on a cpanel
      dig.digA(domain, function(a) { // get ip for a record
         ip = a;
         dig.digMX(domain, function(mx) { // get mx records for domain
            if (mx.length > 0) { // if there are mx records
               if (mx[0].ip !== ip) { // ...and its ip is not the same as the a record's
                  // try to connect to that ip on port 2083
                  request('http://' + mx[0].ip + ':2083', { followRedirect: false, timeout: 4000 }, function (error, response, body) {
                      var obj = { error: error, response: response, body: body };
                      resObj['mx'] = obj;
                      callback();
                  });
               }else{ // just return the same response as the root ip
                  resObj['mx'] = resObj['p2083'];
                  callback();
               }
            }else{ // there aren't any mx records
               callback();
            }
         });
      });
   });

   async.parallel(tasks, function () {
      var verify = {};
      (resObj.p2083.response !== undefined && resObj.p2083.response.statusCode === 301) ? verify['connect_2083'] = 5 : verify['connect_2083'] = 0; // can we connect on port 2083
      (resObj.slash_cPanel.response !== undefined && resObj.slash_cPanel.response.statusCode === 301) ? verify['connect_slash_cpanel'] = 5 : verify['connect_slash_cpanel'] = 0; // can we connect via domain/cpanel
      (resObj.cPanel_dot.response !== undefined && resObj.cPanel_dot.response.statusCode === 301) ? verify['connect_cpanel_dot'] = 5 : verify['connect_cpanel_dot'] = 0; // can we connect via domain/cpanel
      (resObj.mx !== undefined && resObj.mx.response !== undefined && resObj.mx.response.statusCode === 301) ? verify['connect_mx'] = 5 : verify['connect_mx'] = 0; // can we connect via domain/cpanel
      verify['total'] = verify['connect_2083'] + verify['connect_slash_cpanel'] + verify['connect_cpanel_dot'];
      resObj['verify'] = verify;
      res.json(resObj);
   });

});

app.get('/*', function(req, res){
   res.sendFile(path.join(__dirname + '/index.html'));
});

module.exports = app;
