var express = require('express');
var app = express.Router();
var path = require('path');
var dig = require('../functions');
var async = require('async');

app.get('/api/whois/*', function(req, res) {
   var domain = req.params[0];
   dig.whois(domain, function(stdout) { res.json(stdout); });
});

app.get('/api/*', function(req, res) {
   var domain = req.params[0]
   domain = domain.split(/[^\w\.-]/);
   domain = domain[0];

   var dict = { 'domain': domain };
   var tasks= [];

   tasks.push(function(callback){ // get root ip and rdns details
      dig.digA(domain, function(ip) {
         dig.rdns(ip, function(stdout) {
            dict['root'] = { 'ip': ip, 'rdns': stdout };
            callback();
         });
      });
   });

   tasks.push(function(callback){ // get domain ns records
      dig.dig('ns +short ' + domain + ' | sort', function(stdout){
         var raw = stdout.split(/\.\n/);
         var ns = [raw[0], raw[1]];
         dict['ns'] = ns;
         callback();
      });
   });

   tasks.push(function(callback){ // get domain mx records
      dig.digMX(domain, function(mx){
         dict['mx'] = mx;
         callback();
      });
   });

   tasks.push(function(callback){ // get www cname and ip details
      var dub = 'www.' + domain;
      dig.digC(dub, function(stdout){
         dict['www'] = { 'cname': "", 'ip': "" };
         if(stdout.length > 1) { //if cname and ip
            dict['www']['cname'] = stdout[0];
            dict['www']['ip'] = stdout[1];
         }else{
            dict['www']['ip'] = stdout[0];
         }
         callback();
      });
   });

   tasks.push(function(callback){ // get mail. a record and cname details
      var mail = 'mail.' + domain;
      dig.digC(mail, function(stdout) {
         dict['mail'] = { 'cname': "", 'ip': "" };
         if(stdout.length > 1) { // if cname and ip
            dict['mail']['cname'] = stdout[0];
            dict['mail']['ip'] = stdout[1];
         }else if(stdout.length > 0){
            dict['mail']['ip'] = stdout[0];
         }
         callback();
      });
   });

   tasks.push(function(callback){ //get root ip from ha ns
      var arg = domain + ' @ns1.hostingaustralia.com.au';
      dig.digA(arg, function(stdout) {
         dict['ha'] = stdout;
         callback();
      });
   });

   async.parallel(tasks, function(){ // execute async tasks and return dict object

      var verify = {};
      verify['root_ip_match'] = (dict['root']['ip'].match(/^(?:103|221)\.(?:223|121)\.(?:18|140).*$/) !== null) ? 7:0;
      verify['has_ha_zone'] = (dict['ha'].length > 0) ? 5:0;
      verify['mail_ip_match'] = (dict['mail']['ip'].length > 0 && dict['mail']['ip'].match(/^(?:103|221)\.(?:223|121)\.(?:18|140).*$/) !== null) ? 5:0;
      if(dict['mx'].length > 0){
         verify['mx_ip_match'] = (dict['mx'][0]['ip'].match(/^(?:103|221)\.(?:223|121)\.(?:18|140).*$/) !== null) ? 7:0;
         verify['mx_spamexperts'] = (dict['mx'][0]['record'].match(/.*spamexperts.*/i) !== null) ? 5:0;
         verify['mx_outlook'] = (dict['mx'][0]['record'].match(/.*outlook.*/i) !== null) ? 5:0;
         verify['mx_google'] = (dict['mx'][0]['record'].match(/.*google.*/i) !== null) ? 5:0;
      }
      dict['verify'] = verify;
      res.json(dict);
   });

});

app.get('/*', function(req, res){
   res.sendFile(path.join(__dirname + '/index.html'));
});

module.exports = app;
