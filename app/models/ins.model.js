module.exports = (sequelize, Sequelize) => {
  const Ins = sequelize.define("ins", {
    name: {
      type: Sequelize.STRING,
    },
    formerName: {
      type: Sequelize.STRING,
    },
    insCode: {
      type: Sequelize.STRING,
    },
    insAddLine01: {
      type: Sequelize.STRING,
    },
    insAddLine02: {
      type: Sequelize.STRING,
    },
    insTown: {
      type: Sequelize.STRING,
    },
    insState: {
      type: Sequelize.STRING,
    },
    insPostcode: {
      type: Sequelize.STRING,
    },
    tatAlert: {
      type: Sequelize.INTEGER,
    },
    tatMax: {
      type: Sequelize.INTEGER,
    },
  });

  return Ins;
};
