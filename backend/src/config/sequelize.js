const path = require('path');
const { Sequelize } = require('sequelize');
const dbConfig = require('./config').development;

let sequelize;
if (dbConfig.dialect === 'sqlite') {
  const sqlitePath = path.resolve(__dirname, '../../database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: dbConfig.logging
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database || process.env.DB_NAME,
    dbConfig.username || process.env.DB_USER,
    dbConfig.password || process.env.DB_PASSWORD,
    {
      host: dbConfig.host || process.env.DB_HOST,
      port: dbConfig.port || process.env.DB_PORT,
      dialect: dbConfig.dialect || 'mysql',
      logging: dbConfig.logging,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;
