var express = require('express'),
    app = express(),
    dotenv = require('dotenv'),
    db = require('./models');


dotenv.load();


app.set('port', process.env.PORT || 3000);


app.use(function (request, response, next) {
    "use strict";
    response.contentType('application/json');
    next();
});


app.post('/', function (request, response) {
    "use strict";
    var handler = db.Handler.build();

    handler.save().success(function () {
        response.json(201, handler);
    });
});


module.exports = app;
