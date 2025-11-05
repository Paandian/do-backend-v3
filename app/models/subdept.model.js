module.exports = (sequelize, Sequelize) => {
  const sub_depts = sequelize.define("sub_depts", {
    deptId: {
      type: Sequelize.INTEGER,
    },
    subCode: {
      type: Sequelize.STRING,
    },
    subCodeDesc: {
      type: Sequelize.STRING,
    },
  });

  return sub_depts;
};
