module.exports = (sequelize, Sequelize) => {
  const user_depts = sequelize.define("user_depts", {
    userId: {
      type: Sequelize.UUID,
    },
    deptId: {
      type: Sequelize.UUID,
    },
  });

  return user_depts;
};
