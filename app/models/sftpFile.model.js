module.exports = (sequelize, Sequelize) => {
  const SftpFile = sequelize.define(
    "sftpFile",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fileName: {
        type: Sequelize.STRING,
        field: "file_name",
        allowNull: false,
      },
      originalName: {
        type: Sequelize.STRING,
        field: "original_name",
      },
      location: {
        type: Sequelize.ENUM("incoming", "processed", "error", "temp"),
        allowNull: false,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        field: "file_size",
      },
      uploadedAt: {
        type: Sequelize.DATE,
        field: "uploaded_at",
      },
      processedAt: {
        type: Sequelize.DATE,
        field: "processed_at",
      },
      errorAt: {
        type: Sequelize.DATE,
        field: "error_at",
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "NEW",
      },
      errorMessage: {
        type: Sequelize.TEXT,
        field: "error_message",
      },
      processingSummary: {
        type: Sequelize.JSON,
        field: "processing_summary",
      },
    },
    {
      timestamps: true,
      underscored: true,
    }
  );

  return SftpFile;
};
