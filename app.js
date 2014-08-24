/*jslint node: true*/
/*jslint nomen: true*/
var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io')(server),
    dotenv = require('dotenv'),
    db = require('./models'),
    exphbs  = require('express3-handlebars'),
    fs = require('fs'),
    hbs,
    lodash = require('lodash'),
    parseRange = require('range-parser'),
    uuidRegexp = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;


dotenv.load();


app.set('port', process.env.PORT || 3000);
app.set('list_max_length', process.env.LIST_MAX_LENGTH || 20);


app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use("/static", express.static(__dirname + '/static'));


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


var getHandlerId = function (request) {
    "use strict";
    if (request.params.hasOwnProperty('id')) {
        return request.params.id[0];
    }
    return null;
};


var respond = function (request, response) {
    "use strict";
    var accept = request.headers.accept,
        template = response.locals.template,
        payload = response.locals.payload,
        hostname,
        host;

    if (typeof accept === 'string' && (lodash.contains(accept, 'text/html') || lodash.contains(accept, '*/*'))) {
        if (typeof template === 'string') {
            response.contentType('text/html');
            hostname = request.host;
            host = request.protocol + '://' + hostname;
            return response.render(template, {
                payload: payload,
                hostname: hostname,
                host: host,
                handlerId: getHandlerId(request)
            });
        }

        if (payload.hasOwnProperty('url')) {
            return response.redirect(payload.url);
        }
    }

    response.contentType('application/json');
    return response.json(payload);
};


app.get('/', function (request, response, next) {
    "use strict";
    response.status(200);
    response.locals.template = 'index';
    response.locals.payload = {
        description: 'HTTP request debugger',
        links: {
            create_handler: {
                method: 'POST',
                description: 'Create a new request handler',
                href: '/'
            }
        }
    };
    next();
}, respond);


app.post('/', function (request, response, next) {
    "use strict";
    var handler = db.Handler.build();

    handler.save().success(function () {
        response.status(201);
        response.locals.payload = handler.toJSON();
        next();
    });
}, respond);


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


app.get('/:id', function (request, response, next) {
    "use strict";
    var id = getHandlerId(request);
    getHandlerOr404(response, id, function (handler) {
        response.locals.template = 'handler';
        response.locals.payload = handler.toJSON();
        next();
    });
}, respond);


app.all('/:id/listener', function (request, response) {
    "use strict";
    var id = request.params.id[0];
    getHandlerOr404(response, id, function (handler) {
        db.Callback.buildFromRequest(request, handler, function (callback) {
            var data = callback.toJSON(),
                url = request.protocol + '://' + request.get('Host') + data.handler.links.callback_list.href;
            io.emit(url, data);
            return response.json(200, { message: 'success' });
        });
    });
});


app.get('/:id/callbacks/', function (request, response, next) {
    "use strict";
    var id = getHandlerId(request);

    response.locals.template = 'callbacks';

    getHandlerOr404(response, id, function (handler) {
        response.set('Accept-Ranges', 'items');
        var count = handler.callbacks_count,
            delta,
            max = app.get('list_max_length'),
            range = parseRange(count, 'items=0-' + (max - 1).toString()),
            rangeHeader = request.headers.range,
            start,
            end;
        if (!rangeHeader && count === 0) {
            response.locals.payload = [];
            response.set('Content-Range', 'items 0-0/0');
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
                delta = end - start + 1;
                if (delta > max) {
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
        db.Callback.findAll({
            where: { handler_id: id },
            include: [ { model: db.Handler, as: 'handler' } ],
            order: 'created_at desc',
            offset: start.toString(),
            limit: delta.toString()
        }).success(function (callbacks) {
            response.set('Content-Range', 'items ' + start + '-' + end + '/' + count);
            response.locals.payload = callbacks;
            next();
        });
    });
}, respond);


app.param('index', /[0-9]*/);


app.get('/:id/callbacks/:index', function (request, response) {
    "use strict";
    var id = getHandlerId(request),
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


module.exports = { server: server, app: app };
