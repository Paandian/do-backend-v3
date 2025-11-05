module.exports = (sequelize, Sequelize) => {
  const user_branches = sequelize.define("user_branches", {
    userId: {
      type: Sequelize.UUID,
    },
    brId: {
      type: Sequelize.UUID,
    },
  });

  return user_branches;
};
