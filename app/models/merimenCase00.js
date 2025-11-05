module.exports = (sequelize, DataTypes) => {
  const MerimenCase = sequelize.define(
    "MerimenCase",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      merimen_ref: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      casefile_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      insurer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      claim_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vehicle_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date_of_loss: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      date_received: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      raw_data: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      is_processed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      processing_attempts: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      last_attempt_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "merimen_cases",
      timestamps: true,
    }
  );

  return MerimenCase;
};
