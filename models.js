var Sequelize = require('sequelize'),
    dotenv = require('dotenv'),
    lodash = require('lodash'),
    sequelize;


dotenv.load();


sequelize = new Sequelize(process.env.DATABASE_URL);


module.exports = lodash.extend({
    sequelize: sequelize
}, db);
