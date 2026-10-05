const { Sequelize } = require('sequelize');
const config = require('../config/db.js');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  storage: config.storage || './database.sqlite',
  logging: false, // Turn off logging
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.MenuCategory = require('./MenuCategory')(sequelize);
db.MenuItem = require('./MenuItem')(sequelize);

// Associations
db.MenuCategory.hasMany(db.MenuItem, { foreignKey: 'CategoryId' });
db.MenuItem.belongsTo(db.MenuCategory, { foreignKey: 'CategoryId' });

module.exports = db;
