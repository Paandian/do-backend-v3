module.exports = (sequelize, Sequelize) => {
  const Transfer = sequelize.define("transfers", {
    caseId: {
      type: Sequelize.INTEGER,
    },
    branchId: {
      type: Sequelize.INTEGER,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
  });

  return Transfer;
};
