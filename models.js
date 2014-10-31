/*jslint node:true*/
"use strict";
var Sequelize = require('sequelize'),
    PgHstore = require('pg-hstore'),
    hstore = new PgHstore(),
    dotenv = require('dotenv'),
    lodash = require('lodash'),
    uuid = require('uuid'),
    db = {},
    sequelize;


dotenv.load();


sequelize = new Sequelize(process.env.DATABASE_URL, {
    pool: { maxConnections: 2, maxIdleTime: 30 },
    logging: false
});


db.Handler = sequelize.define('Handler', {
    id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: uuid.v4
    },
    callbacks_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
    }
}, {
    instanceMethods: {
        makeCallback: function (values, next) {
            var callback = db.Callback.build(lodash.extend(values, {
                handler_id: this.id
            }));
            callback.handler = this;
            this.increment('callbacks_count').success(function (handler) {
                callback.index = handler.callbacks_count - 1;
                callback.save().success(function () {
                    return next(callback);
                });
            });
        },
        toJSON: function () {
            return lodash.extend(this.values, {
                url: '/' + this.id,
                links: {
                    listener: {
                        method: '*',
                        description: 'Listen to incoming requests',
                        href: '/' + this.id + '/listener'
                    },
                    callback_list: {
                        rel: 'callbacks',
                        method: 'GET',
                        description: 'List callbacks',
                        href: '/' + this.id + '/callbacks/'
                    }
                }
            });
        }
    },
    tableName: 'handler',
    underscored: true
});


var parseHstore = function (object, column) {
    var value = object.getDataValue(column);

    if (lodash.size(value) === 0) {
        return null;
    }
    if (typeof value === 'object') {
        return value;
    }
    return hstore.parse(value);
};


db.Callback = sequelize.define('Callback', {
    index: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        defaultValue: 0
    },
    handler_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        references: 'handler',
        referencesKey: 'id'
    },
    body: Sequelize.TEXT,
    cookies: {
        type : Sequelize.HSTORE,
        get: function () { return parseHstore(this, 'cookies'); }
    },
    data: {
        type : Sequelize.HSTORE,
        get: function () { return parseHstore(this, 'data'); }
    },
    headers: {
        type : Sequelize.HSTORE,
        get: function () { return parseHstore(this, 'headers'); }
    },
    method: {
        type: Sequelize.STRING,
        allowNull: false
    },
    path: Sequelize.TEXT,
    query: {
        type : Sequelize.HSTORE,
        get: function () { return parseHstore(this, 'query'); }
    }
}, {
    tableName: 'callback',
    underscored: true,
    classMethods: {
        buildFromRequest: function (request, handler, next) {
            var data = request.data,
                query = request.query;

            if (typeof data === typeof {}) {
                data = hstore.stringify(data);
            }
            if (typeof query === typeof {}) {
                query = hstore.stringify(query);
            }
            handler.makeCallback({
                body: request.text,
                cookies: request.cookies,
                data: data,
                headers: request.headers,
                method: request.method,
                query: query,
                path: request.originalUrl
            }, function (callback) {
                next(callback);
            });
        }
    },
    instanceMethods: {
        toJSON: function () {
            var json = lodash.extend(this.values, {
                handler: this.handler.toJSON(),
                url: '/' + this.handler.id + '/callbacks/' + this.index
            }), links = {};

            json.number = this.index + 1;

            if (this.index > 0) {
                links.previous = {
                    method: 'GET',
                    description: 'Get previous callback',
                    href: '/' + this.handler.id + '/callbacks/' + (this.index - 1).toString()
                };
            }

            if (this.index < this.handler.callbacks_count - 1) {
                links.next = {
                    method: 'GET',
                    description: 'Get next callback',
                    href: '/' + this.handler.id + '/callbacks/' + (this.index + 1).toString()
                };
            }

            if (Object.keys(links).length > 0) {
                json.links = links;
            }

            delete json.index;
            delete json.handler_id;
            return json;
        }
    }
});


db.Callback.belongsTo(db.Handler, { as: 'handler' });
db.Handler.hasMany(db.Callback, {as: 'callbacks' });


module.exports = lodash.extend({
    sequelize: sequelize
}, db);
