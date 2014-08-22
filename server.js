var app = require('./app'),
    db = require('./models'),
    express = require('express');


app.app.use(express.logger('dev'));
app.app.use(express.errorHandler());

app.server.listen(app.app.get('port'), function () {
    "use strict";
    console.log('Express server listening on port ' + app.app.get('port'));
});
