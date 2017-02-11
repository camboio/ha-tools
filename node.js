var express = require('express');
var app = express();
var cors = require('cors');
var async = require('async');
var path = require('path');

var corsOptions = {
origin: 'http://cambo.io'
}
app.use(cors(corsOptions));
app.use('/res', express.static(path.join(__dirname)));

var exec = require('child_process').exec;

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
   var query = "'" + args + "'"; //sanitise the input dog
   exec('host ' + query + ' | grep -v "not found"', function(error, stdout, stderr){
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

app.get('/api/dig/*', function(req, res) {
   var path = req.params[0].replace(/\//g, " ");
   dig(path, function(stdout) { res.json(stdout); });
});

app.get('/api/whois/*', function(req, res) {
   var domain = req.params[0];
   domain  = domain.split(/[^\w\.]/);
   exec('whois ' + domain[0], function(error, stdout, stderr){
      res.json(stdout);
   });
});

app.get('/api/had/*', function(req, res) {
   var domain = req.params[0]
   domain = domain.split(/[^\w\.]/);
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
         }else{
            dict['mail']['ip'] = stdout[0];
         }
         callback();
      });
   });

   async.parallel(tasks, function(){ // execute async tasks and return dict object
      res.json(dict);
   });

});

app.listen(3000, function() {
   console.log('cambo.io dns app running on port 3000')
});
