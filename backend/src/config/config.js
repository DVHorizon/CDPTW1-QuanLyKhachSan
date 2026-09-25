const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

module.exports = {
  development: {
    username: process.env.DB_USER || "hotel_user",
    password: process.env.DB_PASSWORD || "hotel_password",
    database: process.env.DB_NAME || "hotel_management",
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
  }
};
