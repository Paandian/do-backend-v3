module.exports = (sequelize, Sequelize) => {
  const Dropbox = sequelize.define("dropbox", {
    fileStatus: {
      type: Sequelize.STRING,
    },
    refType: {
      type: Sequelize.INTEGER,
    },
    subRefType: {
      type: Sequelize.INTEGER,
    },
    insurer: {
      type: Sequelize.INTEGER,
    },
    claimNo: {
      type: Sequelize.STRING,
    },
    vehicleNo: {
      type: Sequelize.STRING,
    },
    dateOfAssign: {
      type: Sequelize.DATEONLY,
    },
    dateOfLoss: {
      type: Sequelize.DATEONLY,
    },
  });

  return Dropbox;
};
