module.exports = (sequelize, Sequelize) => {
  const user_roles = sequelize.define("user_roles", {
    userId: {
      type: Sequelize.UUID,
    },
    roleId: {
      type: Sequelize.UUID,
    },
  });

  return user_roles;
};
