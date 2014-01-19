var express = require('express'),
    app = express(),
    dotenv = require('dotenv'),
    db = require('./models'),
    uuidRegexp = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;


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


app.param(function (name, fn) {
    "use strict";
    if (fn instanceof RegExp) {
        return function (request, response, next, value) {
            var captures = fn.exec(String(value));
            if (captures) {
                request.params[name] = captures;
                next();
            } else {
                next('route');
            }
        };
    }
});


app.param('id', uuidRegexp);


var getHandlerOr404 = function (response, id, callback) {
    "use strict";
    db.Handler.find(id).success(function (handler) {
        if (handler === null) {
            response.json(404, {error: 'Handler not found'});
        }
        callback(handler);
    });
};


app.get('/:id', function (request, response) {
    "use strict";
    var id = request.params.id[0];
    getHandlerOr404(response, id, function (handler) {
        response.json(200, handler);
    });
});


module.exports = app;
