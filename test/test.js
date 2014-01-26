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


var getLinkByRel = function (json, rel) {
    "use strict";
    var url = null;
    lodash.each(json.links, function (link) {
        if (link.rel === rel) {
            url = link.href;
        }
    });
    return url;
};


before(function (done) {
    "use strict";
    http.createServer(app).listen(port.toString(), function () {
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
        it('should have a valid uuid4 as default id', function () {
            var handler = db.Handler.build();
            handler.should.not.equal(null);
            should(handler.id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)).not.equal(null);
        });

        describe('toJSON', function () {
            var handler, json;

            before(function (done) {
                // Let's create a well known handler.
                handler = db.Handler.build();
                handler.save().success(function () {
                    json = handler.toJSON();
                    done();
                });
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
                var url = getLinkByRel(json, 'listener');
                url.should.equal('/' + handler.id + '/listener');
            });

            it('should contain the callbacks url', function () {
                var url = getLinkByRel(json, 'callbacks');
                url.should.equal('/' + handler.id + '/callbacks/');
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
                response.headers['content-type'].should.equal('application/json');
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
            listenerUrl = getLinkByRel(handler.toJSON(), 'listener');
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
});
