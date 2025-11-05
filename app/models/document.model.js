module.exports = (sequelize, Sequelize) => {
  const Document = sequelize.define("documents", {
    caseId: {
      type: Sequelize.INTEGER,
    },
    docStageId: {
      type: Sequelize.INTEGER,
    },
    name: {
      type: Sequelize.STRING,
    },
    Type: {
      type: Sequelize.STRING,
    },
    Remark: {
      type: Sequelize.STRING,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
  });

  return Document;
};
