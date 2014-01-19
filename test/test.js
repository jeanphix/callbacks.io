var app = require('../app'),
    should = require('should'),
    http = require('http'),
    db = require('../models'),
    port = process.env.TESTING_APP_PORT || 9999;


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
