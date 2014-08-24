/*jslint node: true*/
"use strict";
module.exports = {
    up: function (migration, DataTypes, done) {
        migration.createTable('handler', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false
            }
        });
        done();
    },
    down: function (migration, DataTypes, done) {
        migration.dropTable('handler');
        done();
    }
};
