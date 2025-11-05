const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const logger = require("../utils/logger");

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
// Ensure config file exists and is properly formatted
const config = require("../config/database.config.js")[env];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: (msg) => logger.debug(msg),
  });
}

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    logger.info("Database connection established successfully.");
  })
  .catch((err) => {
    logger.error("Unable to connect to the database:", err);
    process.exit(1);
  });

// Load models
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Associate models
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
