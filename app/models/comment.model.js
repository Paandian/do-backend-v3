module.exports = (sequelize, Sequelize) => {
  const Comment = sequelize.define("comments", {
    caseId: {
      type: Sequelize.INTEGER,
    },
    comment: {
      type: Sequelize.STRING,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
  });

  return Comment;
};
