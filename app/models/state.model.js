module.exports = (sequelize, Sequelize) => {
  const State = sequelize.define("states", {
    name: {
      type: Sequelize.STRING,
    },
    stCode: {
      type: Sequelize.STRING,
    },
  });

  return State;
};
