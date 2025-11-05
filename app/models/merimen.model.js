module.exports = (sequelize, Sequelize) => {
  const MerimenCase = sequelize.define(
    "merimen_cases",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merimen_ref: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: "Unique reference from Merimen",
      },
      casefile_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "casefiles",
          key: "id",
        },
      },
      insurer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "insurers",
          key: "id",
        },
      },
      claim_no: {
        type: Sequelize.STRING(100),
      },
      vehicle_no: {
        type: Sequelize.STRING(50),
      },
      date_of_loss: {
        type: Sequelize.DATEONLY,
      },
      date_received: {
        type: Sequelize.DATE,
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: "NEW",
      },
      raw_data: {
        type: Sequelize.JSON,
        comment: "Original data from Merimen",
      },
      is_processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      error_message: {
        type: Sequelize.TEXT,
      },
      processing_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_attempt_at: {
        type: Sequelize.DATE,
      },
      // caseNo: {
      //   type: Sequelize.STRING,
      //   unique: true,
      // },
      // caseStatus: {
      //   type: Sequelize.STRING,
      // },
      // insurer: {
      //   type: Sequelize.STRING,
      // },
      // policy: {
      //   type: Sequelize.STRING,
      // },
      // claim: {
      //   type: Sequelize.STRING,
      // },
      // lossDate: {
      //   type: Sequelize.DATE,
      // },
      // processedAt: {
      //   type: Sequelize.DATE,
      // },
      // status: {
      //   type: Sequelize.ENUM("pending", "processed", "error"),
      //   defaultValue: "pending",
      // },
    },
    {
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["merimen_ref"] },
        { fields: ["status"] },
        { fields: ["date_received"] },
        { fields: ["vehicle_no"] },
      ],
    }
  );

  MerimenCase.associate = (models) => {
    MerimenCase.belongsTo(models.inss, {
      foreignKey: "insurer_id",
      as: "insurer",
    });
    MerimenCase.belongsTo(models.casefiles, {
      foreignKey: "casefile_id",
      as: "casefile",
    });
  };

  return MerimenCase;
};
