var app = require('./app'),
    db = require('./models'),
    express = require('express'),
    http = require('http');


app.use(express.logger('dev'));
app.use(express.errorHandler());


http.createServer(app).listen(app.get('port'), function () {
    "use strict";
    console.log('Express server listening on port ' + app.get('port'));
});
