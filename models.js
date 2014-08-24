var Sequelize = require('sequelize'),
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


module.exports = lodash.extend({
    sequelize: sequelize
}, db);
