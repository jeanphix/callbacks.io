/*jslint node:true*/
var Sequelize = require('sequelize'),
    PgHstore = require('pg-hstore'),
    hstore = new PgHstore(),
    dotenv = require('dotenv'),
    lodash = require('lodash'),
    uuid = require('uuid'),
    db = {},
    sequelize;


dotenv.load();


sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });


db.Handler = sequelize.define('Handler', {
    id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: uuid.v4
    }
}, {
    instanceMethods: {
        toJSON: function () {
            "use strict";
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
        },
        countCallbacks: function (callback) {
            "use strict";
            db.Callback.count({
                where: { handler_id: this.id }
            }).success(function (count) { callback(count); });
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
    }
}, {
    tableName: 'callback',
    underscored: true,
    classMethods: {
        buildFromRequest: function (request, handler, callback) {
            "use strict";
            var data = request.data;
            if (typeof data === typeof {}) {
                data = hstore.stringify(data);
            }

            handler.countCallbacks(function (count) {
                var newCallback = db.Callback.build({
                    body: request.text,
                    cookies: request.cookies,
                    data: data,
                    handler_id: handler.id,
                    headers: request.headers,
                    index: count,
                    method: request.method
                });
                callback(newCallback);
            });
        }
    },
    instanceMethods: {
        toJSON: function () {
            "use strict";
            var json = lodash.extend(this.values, {
                handler: this.handler.toJSON(),
                url: '/' + this.handler.id + '/callbacks/' + this.index
            });
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
