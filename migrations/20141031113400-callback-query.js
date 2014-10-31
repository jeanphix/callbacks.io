/*jslint node:true */
"use strict";
module.exports = {
    up: function (migration, DataTypes, done) {
        migration.addColumn(
            'callback',
            'path',
            {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '/url'
            }
        );
        migration.addColumn(
            'callback',
            'query',
            {
                type: DataTypes.HSTORE
            }
        );
        done();
    },
    down: function (migration, DataTypes, done) {
        migration.removeColumn('callback', 'path');
        migration.removeColumn('callback', 'query');
        done();
    }
};
