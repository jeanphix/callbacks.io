var app = require('../app'),
    should = require('should'),
    http = require('http'),
    port = process.env.TESTING_APP_PORT || 9999;


before(function (done) {
    "use strict";
    http.createServer(app).listen(port.toString(), function () {
        done();
    });
});
