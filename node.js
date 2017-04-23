var express = require('express');
var app = express();
var cors = require('cors');
var async = require('async');
var path = require('path');
var request = require('request');
var letc = require('./letc/letc');
var dig = require('./dig/dig');
var had = require('./had/had');

//var corsOptions = { origin: 'http://cambo.io' }
app.use(cors());

app.use('/', express.static(path.join(__dirname)));

app.use('/dig', dig);

app.use('/letc', letc);

app.use('/had', had);

app.listen(3000, function() {
   console.log('cambo.io dns app running on port 3000')
});
