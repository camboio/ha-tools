var exec = require('child_process').exec;
var async = require('async');

var whois = function(args, callback){
   exec('whois "' + args + '"', function(error, stdout, stderr){
      callback(stdout);
   });
}

module.exports.whois = whois;

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

module.exports.dig = dig;

var digA = function(args, callback){
   dig('a +short ' + args, function(stdout) {
      var a = stdout.split(/\n/);
      callback(a[0]);
   });
}

module.exports.digA = digA;

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

module.exports.digMX = digMX;

var rdns = function(args, callback){
   exec('host ' + args + ' | grep -v "not found" | grep -v "no PTR"', function(error, stdout, stderr){
      if(stdout.length < 1) { callback(""); return; } // no rdns
      var rdns = stdout.match(/([\w\.-]+)\.\n$/); // just get the useful shit
      callback(rdns[1]);
   });
}

module.exports.rdns = rdns;

var digC = function(args, callback){
   dig('+short ' + args, function(stdout){
      var cname = stdout.split(/\.?\n/);
      cname.pop(); // last entry in this array is always empty
      callback(cname);
   });
}

module.exports.digC = digC;
