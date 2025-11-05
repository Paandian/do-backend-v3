module.exports = (sequelize, Sequelize) => {
  const Region = sequelize.define("regions", {
    branchId: {
      type: Sequelize.INTEGER,
    },
    name: {
      type: Sequelize.STRING,
    },
    regionCode: {
      type: Sequelize.STRING,
    },
  });

  return Region;
};
