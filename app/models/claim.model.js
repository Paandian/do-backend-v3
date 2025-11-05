module.exports = (sequelize, Sequelize) => {
  const claims = sequelize.define("claims", {
    caseId: {
      type: Sequelize.INTEGER,
    },
    adjId: {
      type: Sequelize.INTEGER,
    },
    travMileage: {
      type: Sequelize.DECIMAL(10, 2),
    },
    additional: {
      type: Sequelize.DECIMAL(10, 2),
    },
    sdAndStamps: {
      type: Sequelize.DECIMAL(10, 2),
    },
    medicalReport: {
      type: Sequelize.DECIMAL(10, 2),
    },
    policeDoc: {
      type: Sequelize.DECIMAL(10, 2),
    },
    jpjDoc: {
      type: Sequelize.DECIMAL(10, 2),
    },
    misc: {
      type: Sequelize.DECIMAL(10, 2),
    },
    typing: {
      type: Sequelize.DECIMAL(10, 2),
    },
    isApproved: {
      type: Sequelize.INTEGER,
    },
    isApprovedBy: {
      type: Sequelize.INTEGER,
    },
    isApprovedOn: {
      type: Sequelize.DATE,
    },
    isRejectedBy: {
      type: Sequelize.INTEGER,
    },
    isRejectedOn: {
      type: Sequelize.DATE,
    },
    isComment: {
      type: Sequelize.STRING,
    },
  });

  return claims;
};
