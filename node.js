var express = require('express');
var app = express();
var cors = require('cors');
var async = require('async');
var path = require('path');
var request = require('request');

var corsOptions = { origin: 'http://cambo.io' }
app.use(cors(corsOptions));

app.use('/res', express.static(path.join(__dirname)));

var exec = require('child_process').exec;

var whois = function(args, callback){
   exec('whois "' + args + '"', function(error, stdout, stderr){
      callback(stdout);
   });
}

var dig = function(args, callback){
   var san = args.split(/\s/);
   var query = "";
   for (var i = 0; i < san.length; i++){
      query += "'" + san[i] + "' ";
   }
   exec('dig ' + query, function(error, stdout, stderr){
      callback(stdout);
   });
}

var digA = function(args, callback){
   dig('a +short ' + args, function(stdout) {
      var a = stdout.split(/\n/);
      callback(a[0]);
   });
}

var digMX = function(args, callback){
   dig('mx +short ' + args, function(stdout) {
      var raw = stdout.split(/\.\n/);
      raw.pop(); // last entry in this array is always empty
      var mx = [];
      async.times(raw.length, function(n, next){
         var m = raw[n].split(/\s/);
         var x = { 'record': m[1], 'priority': m[0], 'ip': "" };
         digA(m[1], function(mxip) {
            x['ip'] = mxip;
            mx.push(x);
            next();
         });
      }, function(err, etc) {
         callback(mx);
      });
   });
}

var rdns = function(args, callback){
   exec('host ' + args + ' | grep -v "not found" | grep -v "no PTR"', function(error, stdout, stderr){
      if(stdout.length < 1) { callback(""); return; } // no rdns
      var rdns = stdout.match(/([\w\.-]+)\.\n$/); // just get the useful shit
      callback(rdns[1]);
   });
}


var digC = function(args, callback){
   dig('+short ' + args, function(stdout){
      var cname = stdout.split(/\.?\n/);
      cname.pop(); // last entry in this array is always empty
      callback(cname);
   });
}

app.get('/', function(req, res){
   res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/dig/*', function(req, res){
   res.sendFile(path.join(__dirname + '/dig/index.html'));
});

app.get('/had/*', function(req, res){
   res.sendFile(path.join(__dirname + '/had/index.html'));
});

app.get('/letc/*', function(req, res){
   res.sendFile(path.join(__dirname + '/letc/index.html'));
});

app.get('/letc', function(req, res){
   res.redirect("/letc/");
});

app.get('/had', function(req, res){
   res.redirect("/had/");
});

app.get('/api/dig/*', function(req, res) {
   var path = req.params[0].replace(/\//g, " ");
   dig(path, function(stdout) { res.json(stdout); });
});

/*
app.get('/api/whois/*', function(req, res) {
   var domain = req.params[0];
   domain  = domain.split(/[^\w\.]/);
   exec('whois ' + domain[0], function(error, stdout, stderr){
      res.json(stdout);
   });
});
*/

app.get('/api/whois/*', function(req, res) {
   var domain = req.params[0];
   whois(domain, function(stdout) { res.json(stdout); });
});

app.get('/api/letc/*', function(req, res) {
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

   tasks.push(function(callback){
      request('http://' + domain + '/cpanel', { followRedirect: false, timeout: 4000 }, function (error, response, body) {
         var obj = { error: error, response: response, body: body };
         resObj['slash_cPanel'] = obj;
         callback();
      });
   });
  
   tasks.push(function(callback){
      request('http://cpanel.' + domain, { followRedirect: false, timeout: 4000 }, function (error, response, body) {
         var obj = { error: error, response: response, body: body };
         resObj['cPanel_dot'] = obj;
         callback();
      });
   });

   tasks.push(function(callback){
      digA(domain, function(a) {
         ip = a;
         digMX(domain, function(mx) {
            if (mx.length > 0) {
               if (mx[0].ip !== ip) {
                  request('http://' + mx[0].ip + ':2083', { followRedirect: false, timeout: 4000 }, function (error, response, body) {
                      var obj = { error: error, response: response, body: body };
                      resObj['mx'] = obj;
                      callback();
                  });
               }else{ 
                  resObj['mx'] = resObj['p2083'];
                  callback();
               }
            }else{
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

app.get('/api/had/*', function(req, res) {
   var domain = req.params[0]
   domain = domain.split(/[^\w\.-]/);
   domain = domain[0];

   var dict = { 'domain': domain };
   var tasks= [];

   tasks.push(function(callback){ // get root ip and rdns details
      digA(domain, function(ip) {
         rdns(ip, function(stdout) {
            dict['root'] = { 'ip': ip, 'rdns': stdout };
            callback();
         });
      });
   });

   tasks.push(function(callback){ // get domain ns records
      dig('ns +short ' + domain + ' | sort', function(stdout){
         var raw = stdout.split(/\.\n/);
         var ns = [raw[0], raw[1]];
         dict['ns'] = ns;
         callback();
      });
   });

   tasks.push(function(callback){ // get domain mx records
      digMX(domain, function(mx){
         dict['mx'] = mx;
         callback();
      });
   });

   tasks.push(function(callback){ // get www cname and ip details
      var dub = 'www.' + domain;
      digC(dub, function(stdout){
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
      digC(mail, function(stdout) {
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
      digA(arg, function(stdout) {
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

app.listen(3000, function() {
   console.log('cambo.io dns app running on port 3000')
});
