module.exports = (sequelize, Sequelize) => {
  const TatChart = sequelize.define(
    "tatcharts",
    {
      insId: {
        type: Sequelize.INTEGER,
      },
      subDeptId: {
        type: Sequelize.INTEGER,
      },
      tatAlert: {
        type: Sequelize.INTEGER,
      },
      tatMax: {
        type: Sequelize.INTEGER,
      },
    },
    {
      timestamps: false,
    }
  );

  return TatChart;
};
