require("dotenv").config();

const config = {
  development: {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER || "root",
    PASSWORD: process.env.DB_PASSWORD || "",
    DB: process.env.DB_NAME || "auth_crud",
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    HOST: process.env.PROD_DB_HOST || "localhost",
    USER: process.env.PROD_DB_USER || "aasbtech",
    PASSWORD: process.env.PROD_DB_PASSWORD || "Aasbtech@22",
    DB: process.env.PROD_DB_NAME || "aasbtech",
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};

module.exports = config[process.env.NODE_ENV || "development"];
