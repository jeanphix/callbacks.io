/*jslint node:true */
"use strict";
module.exports = {
    up: function (migration, DataTypes, done) {
        migration.createTable('callback', {
            index: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                defaultValue: 1
            },
            handler_id: {
                type: DataTypes.UUID,
                primaryKey: true,
                references: 'handler',
                referencesKey: 'id'
            },
            body: DataTypes.TEXT,
            cookies: DataTypes.HSTORE,
            data: DataTypes.HSTORE,
            headers: DataTypes.HSTORE,
            method: {
                type: DataTypes.STRING,
                allowNull: false
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
        migration.dropTable('callback');
        done();
    }
};
