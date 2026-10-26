require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'hotel_management',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'hotel_management',
    host: process.env.DB_HOST || 'mysql',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false
  }
};
