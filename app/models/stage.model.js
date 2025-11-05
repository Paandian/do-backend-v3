module.exports = (sequelize, Sequelize) => {
  const Stage = sequelize.define(
    "stage",
    {
      name: {
        type: Sequelize.STRING,
      },
      stageCode: {
        type: Sequelize.STRING,
      },
    },
    {
      timestamps: false,
    }
  );

  return Stage;
};
