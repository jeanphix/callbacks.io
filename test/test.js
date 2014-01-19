var app = require('../app'),
    should = require('should'),
    http = require('http'),
    db = require('../models'),
    port = process.env.TESTING_APP_PORT || 9999,
    uuid = require('uuid'),
    request = require('supertest'),
    request = request('http://localhost:' + port.toString());


db.sequelize.config.database += '_test';


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

            it('should contain the listener url', function () {
                json.should.have.property('listener_url', '/' + handler.id + '/listener');
            });
        });
    });
});


describe('App', function () {
    "use strict";
    var checkHandlerPayload = function (json, handler, callback) {
        var payload = handler.toJSON();
        json.should.have.property('url', payload.url);
        json.should.have.property('listener_url', payload.listener_url);
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
});
