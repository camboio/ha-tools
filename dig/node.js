var express = require('express');
var app = express();
var cors = require('cors');

var corsOptions = {
origin: 'http://cambo.io'
}
app.use(cors(corsOptions));


var exec = require('child_process').exec;

app.get('/dig/*', function(req, res) {
   var path = 'dig ' + req.params[0];
   path = path.replace(/\//g, " ");
   var san = path.split(/[;|&]/);
   exec(san[0], function(error, stdout, stderr){ 
      res.json(stdout) 
   });
})

app.listen(3000, function() {
   console.log('Example app listening on port 3000!')
})
