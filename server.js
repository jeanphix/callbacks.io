var app = require('./app'),
    db = require('./models'),
    http = require('http');


db.sequelize.sync({ force: true }).complete(function (err) {
    "use strict";
    if (err) { throw err; }
    http.createServer(app).listen(app.get('port'), function () {
        console.log('Express server listening on port ' + app.get('port'));
    });
});
