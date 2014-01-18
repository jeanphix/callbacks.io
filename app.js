var express = require('express'),
    app = express(),
    dotenv = require('dotenv');


dotenv.load();


app.set('port', process.env.PORT || 3000);


module.exports = app;
