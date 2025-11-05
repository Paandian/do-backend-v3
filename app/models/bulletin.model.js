module.exports = (sequelize, Sequelize) => {
  const Bulletin = sequelize.define("bulletins", {
    newsTitle: {
      type: Sequelize.STRING,
    },
    newsStory: {
      type: Sequelize.STRING,
    },
    // newsPin: {
    //   type: Sequelize.BOOLEAN,
    // },
    newsAuthor: {
      type: Sequelize.STRING,
    },
  });

  return Bulletin;
};
