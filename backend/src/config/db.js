const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "hotel_user",
  password: process.env.DB_PASSWORD || "hotel_password",
  database: process.env.DB_NAME || "hotel_management",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

module.exports = pool;
