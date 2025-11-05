module.exports = (sequelize, Sequelize) => {
  const Handler = sequelize.define("handlers", {
    insId: {
      type: Sequelize.INTEGER,
    },
    deptId: {
      type: Sequelize.INTEGER,
    },
    name: {
      type: Sequelize.STRING,
    },
    offTel: {
      type: Sequelize.STRING,
    },
    mobile: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
  });

  return Handler;
};
