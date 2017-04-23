var express = require('express');
var app = express.Router();
var dig = require('../functions').dig;
var path = require('path');

app.get('/api/*', function(req, res) {
   var path = req.params[0].replace(/\//g, " ");
   dig(path, function(stdout) { res.json(stdout); });
});

app.get('/*', function(req, res){
   res.sendFile(path.join(__dirname + '/index.html'));
});

module.exports = app;
