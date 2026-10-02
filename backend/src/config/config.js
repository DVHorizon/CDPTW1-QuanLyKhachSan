const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

module.exports = {
  development: {
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== "" ? process.env.DB_PASSWORD : null,
    database: process.env.DB_NAME || "hotel_management",
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
};
