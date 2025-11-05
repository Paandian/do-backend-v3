module.exports = (sequelize, Sequelize) => {
  const Dept = sequelize.define("depts", {
    name: {
      type: Sequelize.STRING,
    },
    description: {
      type: Sequelize.STRING,
    },
    picID: {
      type: Sequelize.INTEGER,
    },
  });

  return Dept;
};
