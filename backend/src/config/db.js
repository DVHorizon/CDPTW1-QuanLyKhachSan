require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST || '127.0.0.1',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'sqlite',
  storage: './database.sqlite',
};
