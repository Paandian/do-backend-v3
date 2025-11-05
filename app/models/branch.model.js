module.exports = (sequelize, Sequelize) => {
  const Branch = sequelize.define("branches", {
    name: {
      type: Sequelize.STRING,
    },
    brCode: {
      type: Sequelize.STRING,
    },
  });

  return Branch;
};
