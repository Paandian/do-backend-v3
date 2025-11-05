module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    username: {
      type: Sequelize.STRING,
    },
    profile: {
      type: Sequelize.STRING,
    },
    fullname: {
      type: Sequelize.STRING,
    },
    nric: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    telnumber: {
      type: Sequelize.STRING,
    },
    datejoined: {
      type: Sequelize.STRING,
    },
    position: {
      type: Sequelize.STRING,
    },
    empid: {
      type: Sequelize.STRING,
    },
    usercode: {
      type: Sequelize.STRING,
    },
    address: {
      type: Sequelize.STRING,
    },
    emcontactname: {
      type: Sequelize.STRING,
    },
    emcontactno: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    active: {
      type: Sequelize.BOOLEAN,
    },
    activatelink: {
      type: Sequelize.STRING,
    },
    resetlink: {
      type: Sequelize.STRING,
    },
  });

  return User;
};
