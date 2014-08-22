/*jslint node:true */
"use strict";
module.exports = {
    up: function (migration, DataTypes, done) {
        migration.addColumn(
            'handler',
            'callbacks_count',
            {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        );
        done();
    },
    down: function (migration, DataTypes, done) {
        migration.removeColumn('handler', 'callbacks_count');
        done();
    }
};
