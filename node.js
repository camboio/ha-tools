var express = require('express');
var app = express();
var cors = require('cors');
var async = require('async');

var corsOptions = {
origin: 'http://cambo.io'
}
app.use(cors(corsOptions));

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

var rdns = function(args, callback){
   var query = "'" + args + "'"; //sanitise the input dog
   exec('host ' + query + ' | grep -v "not found"', function(error, stdout, stderr){
      if(stdout.length < 1) { callback(""); return; } // no rdns
      var rdns = stdout.match(/([\w\.]+)\.\n$/); // just get the useful shit
      callback(rdns[1]);
   });
}

app.get('/', function(req, res){
   res.json("hello!");
});

app.get('/dig/*', function(req, res) {
   var path = req.params[0].replace(/\//g, " ");
   dig(path, function(stdout) { res.json(stdout); });
});

app.get('/whois/*', function(req, res) {
   var domain = req.params[0];
   domain  = domain.split(/[^\w\.]/);
   exec('whois ' + domain[0], function(error, stdout, stderr){
      res.json(stdout);
   });
});

app.get('/had/*', function(req, res) {
   var domain = req.params[0]
   domain = domain.split(/[^\w\.]/);
   domain = domain[0];

   var dict = { 'domain': domain };
   var tasks= [];

   tasks.push(function(callback){ // get root ip and rdns details
      dig('a +short ' + domain, function(stdout) {
         var ip = stdout.split(/\n/);
         rdns(ip[0], function(stdout) {
            dict['root'] = { 'ip': ip[0], 'rdns': stdout };
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
      dig('mx +short ' + domain, function(stdout){
         var raw = stdout.split(/\.\n/);
         raw.pop(); // last entry in this array is always empty
         var mx = { 'record': [], 'priority': [], 'ip': [] };
         for(var i = 0; i < raw.length; i++) {
            var m = raw[i].split(/\s/);
            mx['priority'][i] = m[0];
            mx['record'][i] = m[1];
         }
         dict['mx'] = mx;
         callback();
      });
   });

   // add task to iterate through mx records and get ips for them

   tasks.push(function(callback){ // get www cname and ip details
      var dub = 'www.' + domain;
      dig('+short ' + dub, function(stdout){
         var cname = stdout.split(/\.?\n/);
         dict['www'] = { 'cname' : "", 'ip': "" };
         cname.pop(); // last entry in this array is always empty
         if(cname.length > 1) { //if cname and ip
            dict['www']['cname'] = cname[0];
            dict['www']['ip'] = cname[1];
         }else{
            dict['www']['ip'] = cname[0];
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
