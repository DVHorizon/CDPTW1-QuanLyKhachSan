const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

module.exports = {
  development: {
    dialect: "sqlite",
    storage: "./database.sqlite",
    logging: false
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false
  },
  production: {
    dialect: "sqlite",
    storage: "./database.sqlite",
    logging: false
  }
};
