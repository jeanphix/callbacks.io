var Sequelize = require('sequelize'),
    PgHstore = require('pg-hstore'),
    dotenv = require('dotenv'),
    lodash = require('lodash'),
    uuid = require('uuid'),
    db = {},
    sequelize;


dotenv.load();


sequelize = new Sequelize(process.env.DATABASE_URL);


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
                listener_url: '/' + this.id + '/listener'
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


var parseHstore = function (value) {
    "use strict";
    if (lodash.size(value) === 0) {
        return null;
    }
    return PgHstore.parse(value);
};


db.Callback = sequelize.define('Callback', {
    index: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        defaultValue: 1
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
        get: function () {
            "use strict";
            return parseHstore(this.getDataValue('cookies'));
        }
    },
    data: {
        type : Sequelize.HSTORE,
        get: function () {
            "use strict";
            return parseHstore(this.getDataValue('data'));
        }
    },
    headers: {
        type : Sequelize.HSTORE,
        get: function () {
            "use strict";
            return parseHstore(this.getDataValue('headers'));
        }
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
                data = PgHstore.stringify(data);
            }

            handler.countCallbacks(function (count) {
                var newCallback = db.Callback.build({
                    body: request.text,
                    cookies: request.cookies,
                    data: data,
                    handler_id: handler.id,
                    headers: request.headers,
                    index: count + 1,
                    method: request.method
                });
                callback(newCallback);
            });
        }
    }
});


db.Callback.belongsTo(db.Handler, { as: 'handler' });
db.Handler.hasMany(db.Callback, {as: 'callbacks' });


module.exports = lodash.extend({
    sequelize: sequelize
}, db);
