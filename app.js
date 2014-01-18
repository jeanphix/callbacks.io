var express = require('express'),
    app = express(),
    dotenv = require('dotenv');


dotenv.load();


app.set('port', process.env.PORT || 3000);


app.use(function (request, response, next) {
    "use strict";
    response.contentType('application/json');
    next();
});


module.exports = app;
