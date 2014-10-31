/*jslint node:true*/
/*global before, beforeEach, describe, lodash, it*/
var app = require('../app'),
    should = require('should'),
    lodash = require('lodash'),
    http = require('http'),
    db = require('../models'),
    port = process.env.TESTING_APP_PORT || 9999,
    uuid = require('uuid'),
    request = require('supertest'),
    request = request('http://localhost:' + port.toString());


db.sequelize.config.database += '_test';


var makePayload = function (handler, overrides) {
    "use strict";
    var payload = {
        body: 'a body',
        cookies: {},
        data: { key: 'value' },
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        query: { query: 'string' },
        path: handler.url + '?query=string'
    };

    if (overrides) {
        payload = lodash.extend(payload, overrides);
    }

    return payload;
};


before(function (done) {
    "use strict";
    app.server.listen(port.toString(), function () {
        done();
    });
});


beforeEach(function (done) {
    "use strict";
    db.sequelize.sync({ force: true }).complete(function () {
        done();
    });
});


describe('Models', function () {
    "use strict";
    describe('Handler', function () {
        var handler,
            payload;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () {
                payload = makePayload(handler);
                done();
            });
        });

        it('should have a valid uuid4 as default id', function () {
            var handler = db.Handler.build();
            handler.should.not.equal(null);
            should(handler.id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)).not.equal(null);
        });

        describe('toJSON', function () {
            var json;

            beforeEach(function () {
                json = handler.toJSON();
            });

            it('should contain the id', function () {
                json.should.have.property('id', handler.id);
            });

            it('should contain the url', function () {
                json.should.have.property('url', '/' + handler.id);
            });

            it('should contain links', function () {
                json.should.have.property('links');
            });

            it('should contain the listener url', function () {
                var url = json.links.listener.href;
                url.should.equal('/' + handler.id + '/listener');
            });

            it('should contain the callbacks url', function () {
                var url = json.links.callback_list.href;
                url.should.equal('/' + handler.id + '/callbacks/');
            });
        });

        describe('makeCallback', function () {
            it('should assign the handler', function (done) {
                handler.makeCallback(payload, function (callback) {
                    callback.should.have.property('handler', handler);
                    done();
                });
            });

            it('should set `index` as initial `callbacks_count`', function (done) {
                var expected = handler.callbacks_count;
                handler.makeCallback(payload, function (callback) {
                    callback.index.should.equal(expected);
                    done();
                });
            });

            it('should increment `callbacks_count`', function (done) {
                var count = handler.callbacks_count;
                handler.makeCallback(payload, function (callback) {
                    handler.callbacks_count.should.equal(count + 1);
                    done();
                });
            });
        });
    });

    describe('Callback', function () {
        var callback,
            handler,
            json,
            payload;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () {
                payload = makePayload(handler);
                handler.makeCallback(
                    payload,
                    function (newCallback) {
                        callback = newCallback;
                        json = callback.toJSON();
                        done();
                    }
                );
            });
        });

        describe('toJSON', function () {
            it('should not contain the handler id', function () {
                json.should.not.have.property('handler_id');
            });

            it('should not contain the index', function () {
                json.should.not.have.property('index');
            });

            it('should contain the body', function () {
                json.should.have.property('body', 'a body');
            });
            it('should contain the cookies', function () {
                json.should.have.property('cookies');
            });

            it('should contain the data', function () {
                json.should.have.property('data', { key: 'value' });
            });

            it('should contain the headers', function () {
                json.should.have.property('headers', { 'Content-Type': 'application/json' });
            });

            it('should contain the method', function () {
                json.should.have.property('method', 'POST');
            });

            it('should contain the handler', function () {
                json.should.have.property('handler', callback.handler.toJSON());
            });

            it('should contain the url', function () {
                var expected = '/' + callback.handler.id + '/callbacks/' + callback.index;
                json.should.have.property('url', expected);
            });

            it('should not contain links when no other callback are bound to the parent handler', function () {
                json.should.not.have.property('links');
            });

            it('should contain `previous` link when a callback has previously been bound to parent handler', function (done) {
                handler.makeCallback(
                    payload,
                    function (newCallback) {
                        json = newCallback.toJSON();
                        json.should.have.property('links');
                        json.links.should.have.property('previous');
                        json.links.should.not.have.property('next');
                        done();
                    }
                );
            });

            it('should contain `next` link when a callback has been bound to parent handler', function (done) {
                handler.makeCallback(
                    payload,
                    function (newCallback) {
                        json = callback.toJSON();
                        json.should.have.property('links');
                        json.links.should.not.have.property('previous');
                        json.links.should.have.property('next');
                        done();
                    }
                );
            });
        });
    });
});


describe('App', function () {
    "use strict";
    var checkHandlerPayload = function (json, handler, callback) {
        var payload = handler.toJSON();
        json.should.have.property('url', payload.url);
        json.should.have.property('created_at');
        json.should.have.property('updated_at');
        if (callback) { callback(); }
    };

    describe('/', function () {
        describe('GET', function () {
            var response;

            beforeEach(function (done) {
                request.get('/')
                    .end(function (err, res) {
                        response = res;
                        done();
                    });
            });

            it('should respond with 200 status', function () {
                response.status.should.equal(200);
            });

            it('should respond with json', function () {
                response.headers['content-type'].should.startWith('application/json');
            });

            it('should respond the handler creation link', function () {
                var json = JSON.parse(response.text);
                json.should.have.property('links', {
                    create_handler: {
                        method: 'POST',
                        description: 'Create a new request handler',
                        href: '/'
                    }
                });
            });
        });

        describe('POST', function () {
            var response;

            beforeEach(function (done) {
                request.post('/')
                    .end(function (err, res) {
                        response = res;
                        done();
                    });
            });

            it('should respond with json', function () {
                response.headers['content-type'].should.startWith('application/json');
            });

            it('should respond with 201 status', function () {
                response.status.should.equal(201);
            });

            it('should respond the new handler payload', function (done) {
                var json = JSON.parse(response.text);
                db.Handler.find(json.id).success(function (handler) {
                    checkHandlerPayload(json, handler, done);
                });
            });
        });
    });

    describe('/:id', function () {
        var handler;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () { done(); });
        });

        describe('GET', function () {
            it('should respond with 404 status when not found', function (done) {
                request.get('/' + uuid.v4()).end(function (err, response) {
                    response.status.should.equal(404);
                    done();
                });
            });

            it('should respond an error message when not found', function (done) {
                request.get('/' + uuid.v4()).end(function (err, response) {
                    var json = JSON.parse(response.text);
                    json.should.have.property('error', 'Handler not found');
                    done();
                });
            });

            it('should respond with 200 status when found', function (done) {
                request.get('/' + handler.id).end(function (err, response) {
                    response.status.should.equal(200);
                    done();
                });
            });

            it('should respond the handler payload when found', function (done) {
                request.get('/' + handler.id).end(function (err, response) {
                    var json = JSON.parse(response.text);
                    checkHandlerPayload(json, handler, done);
                });
            });
        });
    });

    describe('/:id/listener', function () {
        var handler,
            listenerUrl;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () { done(); });
            listenerUrl = handler.toJSON().links.listener.href;
        });

        it('should respond with 200 status', function (done) {
            request.get(listenerUrl).end(function (err, response) {
                response.status.should.equal(200);
                done();
            });
        });

        it('should store headers', function (done) {
            request.get(listenerUrl)
                .set('X-Custom', 'A custom value')
                .end(function (err, response) {
                    db.Callback.find({ handler_id: handler.id }).success(function (callback) {
                        should(callback.headers['x-custom']).equal('A custom value');
                        done();
                    });
                });
        });

        it('should filter proxy headers', function (done) {
            app.app.set('proxy_headers', ['x-via']);
            request.get(listenerUrl)
                .set('X-Via', 'value')
                .end(function (err, response) {
                    db.Callback.find({ handler_id: handler.id }).success(function (callback) {
                        callback.headers.should.not.have.property('x-via');
                        done();
                    });
                });

        });

        it('should store body', function (done) {
            request.post(listenerUrl)
                .send('a body')
                .end(function (err, response) {
                    db.Callback.find({ handler_id: handler.id }).success(function (callback) {
                        callback.body.should.equal('a body');
                        done();
                    });
                });
        });

        it('should handle json', function (done) {
            var json = '{ "key": "value" }';
            request.post(listenerUrl)
                .set('Content-Type', 'application/json')
                .send(json)
                .end(function (err, response) {
                    db.Callback.find({ handler_id: handler.id }).success(function (callback) {
                        callback.body.should.equal(json);
                        lodash.isEqual(callback.data, JSON.parse(json)).should.ok;
                        done();
                    });
                });
        });

        it('should handle form data', function (done) {
            var data = { key: 'value' };
            request.post(listenerUrl)
                .send(data)
                .end(function (err, response) {
                    db.Callback.find({ handler_id: handler.id }).success(function (callback) {
                        lodash.isEqual(callback.data, data).should.ok;
                        done();
                    });
                });
        });

        it('should handle all methods', function (done) {
            var methods = ['get', 'post', 'put', 'head', 'options'],
                next = 0,
                test = function (current) {
                    var method;
                    if (next === methods.length) { return done(); }
                    method = methods[current];
                    request[method](listenerUrl).end(function (err, response) {
                        response.status.should.equal(200);
                        next += 1;
                        test(next);
                    });
                };

            test(0);
        });
    });

    describe('/:id/callbacks/', function () {
        var handler;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () {
                handler.makeCallback(makePayload(handler, {
                    body: 'a sample body',
                    method: 'GET'
                }), function () {
                    handler.makeCallback(makePayload(handler, {
                        body: '',
                        method: 'POST'
                    }), function () { done(); });
                });
            });
        });

        describe('GET', function () {
            it('should respond with 404 status when not found', function (done) {
                request.get('/12002fc1-7cee-4680-8cfa-9ff0ee3fad16/callbacks/').end(function (err, response) {
                    response.status.should.equal(404);
                    done();
                });
            });

            it('should respond with 200 status when found', function (done) {
                request.get('/' + handler.id + '/callbacks/').end(function (err, response) {
                    should(response.status).equal(200);
                    done();
                });
            });

            it('should respond with Content-Range header', function (done) {
                request.get('/' + handler.id + '/callbacks/').end(function (err, response) {
                    should(response.headers['content-range']).equal('items 0-1/2');
                    done();
                });
            });

            it('should respond with empty Content-Range header handler.callbacks is empty', function (done) {
                handler = db.Handler.build();
                handler.save().success(function () {
                    request.get('/' + handler.id + '/callbacks/').end(function (err, response) {
                        should(response.headers['content-range']).equal('items 0-0/0');
                        done();
                    });
                });
            });

            it('should respond with 416 status when an invalid Range is provided', function (done) {
                request.get('/' + handler.id + '/callbacks/')
                    .set('Range', 'items=4-7')
                    .end(function (err, response) {
                        should(response.status).equal(416);
                        done();
                    });
            });

            it('should respond with 416 status when a malformed Range is provided', function (done) {
                request.get('/' + handler.id + '/callbacks/')
                    .set('Range', 'bad range')
                    .end(function (err, response) {
                        should(response.status).equal(416);
                        done();
                    });
            });

            it('should respond with Content-Range header including length when an invalid Range is provided', function (done) {
                request.get('/' + handler.id + '/callbacks/')
                    .set('Range', 'items=5-7')
                    .end(function (err, response) {
                        should(response.headers['content-range']).equal('items */2');
                        done();
                    });
            });

            it('should respond a non limited result set when found', function (done) {
                request.get('/' + handler.id + '/callbacks/')
                    .end(function (err, response) {
                        var json = JSON.parse(response.text);
                        json.length.should.equal(2);
                        done();
                    });
            });

            it('should correctly limit the result set when a valid Range header is provided', function (done) {
                request.get('/' + handler.id + '/callbacks/')
                    .set('Range', 'items=0-0')
                    .end(function (err, response) {
                        var json = JSON.parse(response.text);
                        should(response.headers['content-range']).equal('items 0-0/2');
                        json.length.should.equal(1);
                        done();
                    });
            });

            it('should respond a empty array when no results', function (done) {
                db.Handler.create().success(function (handler) {
                    request.get('/' + handler.id + '/callbacks/').end(function (err, response) {
                        var json = JSON.parse(response.text);
                        json.length.should.equal(0);
                        done();
                    });
                });
            });
        });
    });

    describe('/:id/callbacks/:index', function () {
        var callback, handler;

        beforeEach(function (done) {
            handler = db.Handler.build();
            handler.save().success(function () {
                handler.makeCallback(makePayload(handler, {
                    body: 'a sample body',
                    method: 'GET'
                }), function (newCallback) {
                    callback = newCallback;
                    done();
                });
            });
        });

        describe('GET', function () {
            it('should respond with 404 status when not found', function (done) {
                request.get(handler.toJSON().url + '/callbacks/100')
                    .end(function (err, response) {
                        response.status.should.equal(404);
                        done();
                    });
            });
            it('should respond with 200 status when found', function (done) {
                request.get(callback.toJSON().url)
                    .end(function (err, response) {
                        response.status.should.equal(200);
                        done();
                    });
            });

            it('should respond callback payload when found', function (done) {
                request.get(callback.toJSON().url)
                    .end(function (err, response) {
                        var json = JSON.parse(response.text),
                            payload = callback.toJSON();
                        lodash.each(payload, function (value, key) {
                            json.should.have.property(key);
                        });
                        done();
                    });
            });
        });
    });
});
