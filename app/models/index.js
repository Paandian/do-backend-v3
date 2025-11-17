const config = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
  host: config.HOST,
  dialect: config.dialect,
  operatorsAliases: 0,

  pool: {
    max: config.pool.max,
    min: config.pool.min,
    acquire: config.pool.acquire,
    idle: config.pool.idle,
  },
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require("../models/user.model.js")(sequelize, Sequelize);
db.role = require("../models/role.model.js")(sequelize, Sequelize);
db.branch = require("../models/branch.model.js")(sequelize, Sequelize);
db.region = require("../models/region.model.js")(sequelize, Sequelize);
db.tatchart = require("../models/tatchart.model.js")(sequelize, Sequelize);
db.inss = require("../models/ins.model.js")(sequelize, Sequelize);
db.dept = require("../models/dept.model.js")(sequelize, Sequelize);
db.subDept = require("./subdept.model")(sequelize, Sequelize);
db.stages = require("../models/stage.model.js")(sequelize, Sequelize);
db.casefiles = require("../models/casefile.model.js")(sequelize, Sequelize);
db.userRoles = require("../models/userRole.model.js")(sequelize, Sequelize);
db.userBranches = require("../models/userBranch.model.js")(
  sequelize,
  Sequelize
);
db.userDepts = require("../models/userDept.model.js")(sequelize, Sequelize);
db.bulletin = require("../models/bulletin.model.js")(sequelize, Sequelize);
db.handler = require("../models/handler.model.js")(sequelize, Sequelize);
db.document = require("../models/document.model.js")(sequelize, Sequelize);
db.transfer = require("../models/transfer.model.js")(sequelize, Sequelize);
db.comment = require("../models/comment.model.js")(sequelize, Sequelize);
db.state = require("../models/state.model.js")(sequelize, Sequelize);
db.dropboxes = require("../models/dropbox.model.js")(sequelize, Sequelize);
db.claims = require("../models/claim.model")(sequelize, Sequelize);
db.MerimenCase = require("../models/merimen.model")(sequelize, Sequelize);
db.merimenData = require("../models/merimenData.model.js")(
  sequelize,
  Sequelize
);

db.refreshToken = require("../models/refreshToken.model.js")(
  sequelize,
  Sequelize
);

db.role.belongsToMany(db.user, {
  as: "staff",
  through: "user_roles",
  foreignKey: "roleId",
  otherKey: "userId",
});

db.user.belongsToMany(db.role, {
  as: "roles",
  through: "user_roles",
  foreignKey: "userId",
  otherKey: "roleId",
});

db.dept.belongsToMany(db.user, {
  as: "staff",
  through: "user_depts",
  foreignKey: "deptId",
  otherKey: "userId",
});

db.user.belongsToMany(db.dept, {
  as: "depts",
  through: "user_depts",
  foreignKey: "userId",
  otherKey: "deptId",
});

db.branch.belongsToMany(db.user, {
  as: "staff",
  through: "user_branches",
  foreignKey: "brId",
  otherKey: "userId",
});

db.user.belongsToMany(db.branch, {
  as: "branches",
  through: "user_branches",
  foreignKey: "userId",
  otherKey: "brId",
});

db.refreshToken.belongsTo(db.user, {
  foreignKey: "userId",
  targetKey: "id",
});
db.user.hasOne(db.refreshToken, {
  foreignKey: "userId",
  targetKey: "id",
});

// db.MerimenCase.belongsTo(db.inss, {
//   foreignKey: "insurer_id",
//   as: "insurer",
// });

// db.MerimenCase.belongsTo(db.casefiles, {
//   foreignKey: "casefile_id",
//   as: "casefile",
// });

// db.ROLES = ["user", "admin", "moderator"];
// db.ROLES = [
//   "admin",
//   "manager",
//   "branchmanager",
//   "clerk",
//   "branchclerk",
//   "adjuster",
//   "editor",
//   "director",
//   "account",
// ];

// Fix association for casefiles -> inss (insurer)
db.casefiles.belongsTo(db.inss, { foreignKey: "insurer", as: "insurerRef" });
db.inss.hasMany(db.casefiles, { foreignKey: "insurer", as: "files" });

module.exports = db;
