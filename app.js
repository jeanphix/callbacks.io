/*jslint node: true*/
/*jslint nomen: true*/
var express = require('express'),
    app = express(),
    dotenv = require('dotenv'),
    db = require('./models'),
    exphbs  = require('express3-handlebars'),
    hbs,
    lodash = require('lodash'),
    parseRange = require('range-parser'),
    uuidRegexp = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;


dotenv.load();


app.set('port', process.env.PORT || 3000);
app.set('list_max_length', process.env.LIST_MAX_LENGTH || 20);


app.use(express.logger('dev'));
app.use(express.cookieParser());


hbs = exphbs.create({
    defaultLayout: 'base',
    extname: '.hbs',
    helpers: {
        keyvalue: function (obj, options) {
            "use strict";
            var buffer = "",
                key;
            lodash.each(lodash.keys(obj), function (key) {
                buffer += options.fn({key: key, value: obj[key]});
            });

            return buffer;
        }
    }
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');


app.use(function (request, response, next) {
    "use strict";
    request.data = '';
    request.text = '';
    request.on('data', function (chunk) {
        request.text += chunk;
    });
    request.on('end', function () {
        try {
            request.data = JSON.parse(request.text);
        } catch (e) {

        }
        next();
    });
});


app.use(function (request, response, next) {
    "use strict";
    response.contentType('application/json');
    next();
});


app.get('/', function (reauest, response) {
    "use strict";
    return response.json(200, {
        description: 'HTTP request debugger',
        links: [{
            rel: 'handler',
            methods: {
                POST: 'Create a new request handler'
            },
            href: '/'
        }]
    });
});


app.post('/', function (request, response) {
    "use strict";
    var handler = db.Handler.build();

    handler.save().success(function () {
        return response.json(201, handler);
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
            return response.json(404, {error: 'Handler not found'});
        }
        callback(handler);
    });
};


app.get('/:id', function (request, response) {
    "use strict";
    var id = request.params.id[0];
    getHandlerOr404(response, id, function (handler) {
        return response.json(200, handler);
    });
});


app.all('/:id/listener', function (request, response) {
    "use strict";
    var id = request.params.id[0];
    getHandlerOr404(response, id, function (handler) {
        db.Callback.buildFromRequest(request, handler, function (callback) {
            callback.save().success(function (callback) {
                return response.json(200, { message: 'success' });
            });
        });
    });
});


app.get('/:id/callbacks/', function (request, response) {
    "use strict";
    var id = request.params.id[0];
    getHandlerOr404(response, id, function (handler) {
        response.set('Accept-Ranges', 'items');
        var filters = { where: { handler_id: id }};
        db.Callback.count(filters).success(function (count) {
            var max = app.get('list_max_length'),
                range = parseRange(count, 'items=0-' + (max - 1).toString()),
                rangeHeader = request.headers.range,
                start,
                end;
            if (!rangeHeader && count === 0) {
                response.locals.payload = [];
                return next();
            }
            if (rangeHeader) {
                // A ``Range`` header has been provided
                range = parseRange(count, rangeHeader);
            }
            try {
                if (typeof range !== 'int') {
                    start = range[0].start;
                    end = range[0].end;
                    if ((end - start) > max) {
                        // The range is too big
                        throw 'Max range delta is ' + max + '.';
                    }
                }

                if (range.type !== 'items' || range === -1 || range === -2) {
                    // The range is not satisfiable
                    throw 'Invalid range.';
                }
            } catch (e) {
                response.set('Content-Range', 'items */' + count);
                return response.json(416, { error: e });
            }
            db.Callback.findAll(lodash.extend(filters, {
                include: [ { model: db.Handler, as: 'handler', required: true } ],
                order: 'created_at desc',
                offset: start.toString(),
                limit: parseInt(end - start + 1, 10).toString()
            })).success(function (callbacks) {
                response.set('Content-Range', 'items ' + start + '-' + end + '/' + count);
                return response.json(200, callbacks);
            });
        });
    });
});


app.param('index', /[0-9]*/);


app.get('/:id/callbacks/:index', function (request, response) {
    "use strict";
    var id = request.params.id[0],
        index = request.params.index[0];
    db.Callback.find({
        where: { index: index, handler_id: id },
        include: [ { model: db.Handler, as: 'handler', required: true } ]
    }).success(function (callback) {
        if (callback === null) {
            return response.json(404, {error: 'Callback not found'});
        }
        return response.json(200, callback);
    });
});


app.use(function (request, response) {
    "use strict";
    return response.json(404, { error: 'Not found.' });
});


module.exports = app;
