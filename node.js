var express = require('express');
var app = express();
var cors = require('cors');
var async = require('async');

var corsOptions = {
origin: 'http://cambo.io'
}
app.use(cors(corsOptions));

var exec = require('child_process').exec;

app.get('/', function(req, res){
   res.json("hello!");
});

app.get('/dig/*', function(req, res) {
   var path = 'dig ' + req.params[0];
   path = path.replace(/\//g, " ");
   var san = path.split(/[^\w\.@\+]/);
   exec(san[0], function(error, stdout, stderr){ 
      res.json(stdout) 
   });
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

   tasks.push(function(callback){ // get domain ip address
      exec('dig a +short ' + domain, function(error, stdout, stderr){
         var ip = stdout.split(/\n/);
         dict['ipaddr'] = ip[0];
         callback();
      });
   });

   tasks.push(function(callback){ // get rDNS for ip
      async.until( //until the ip is set, wait a bit
         function() { return dict.hasOwnProperty('ipaddr'); },
         function(callback) { 
            async.setImmediate(function() { callback(); }); 
         },
         function(err) {
            exec('host ' + dict['ipaddr'] + ' | grep -v "not found"', function(error, stdout, stderr){
               dict['rdns'] = stdout;
               callback();
            });
         }
      )
   });

   tasks.push(function(callback){ // get domain ns records
      exec('dig ns +short ' + domain + ' | sort', function(error, stdout, stderr){
         var raw = stdout.split(/\.\n/);
         var ns = [raw[0], raw[1]];
         dict['ns'] = ns;
         callback();
      });
   });

   tasks.push(function(callback){ // get domain mx records
      exec('dig mx +short ' + domain, function(error, stdout, stderr){
         var raw = stdout.split(/\.\n/);
         raw.pop(); // last entry in this array is always empty
         dict['mx'] = raw;
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
