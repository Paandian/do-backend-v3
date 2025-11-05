module.exports = (sequelize, Sequelize) => {
  const MerimenData = sequelize.define(
    "merimenData",
    {
      // Changed table name to match error
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      claimAction: {
        type: Sequelize.STRING,
        field: "claim_action",
      },
      merimenCaseId: {
        type: Sequelize.STRING,
        field: "merimen_case_id",
        unique: true, // This must be unique as it's the Merimen's unique identifier
        allowNull: false,
      },
      claimType: {
        type: Sequelize.STRING,
        field: "claim_type",
      },
      insuranceClaimNo: {
        type: Sequelize.STRING,
        field: "insurance_claim_no",
        unique: true, // Each claim should have a unique insurance claim number
        allowNull: false,
      },
      insuredName: {
        type: Sequelize.STRING,
        field: "insured_name",
      },
      insuredIdNo: {
        type: Sequelize.STRING,
        field: "insured_id_no",
      },
      insuredTel: {
        type: Sequelize.STRING,
        field: "insured_tel",
      },
      insuredVehRegNo: {
        type: Sequelize.STRING,
        field: "insured_veh_reg_no",
      },
      dateOfLoss: {
        type: Sequelize.DATEONLY,
        field: "date_of_loss",
      },
      timeOfLoss: {
        type: Sequelize.TIME,
        field: "time_of_loss",
      },
      policyCoverNoteNo: {
        type: Sequelize.STRING,
        field: "policy_cover_note_no",
      },
      repairerName: {
        type: Sequelize.STRING,
        field: "repairer_name",
      },
      handlingInsurer: {
        type: Sequelize.STRING,
        field: "handling_insurer",
      },
      claimantInsurer: {
        type: Sequelize.STRING,
        field: "claimant_insurer",
      },
      assignmentDate: {
        type: Sequelize.DATE,
        field: "assignment_date",
      },
      cancellationDate: {
        type: Sequelize.DATE,
        field: "cancellation_date",
      },
      editingDate: {
        type: Sequelize.DATE,
        field: "editing_date",
      },
      adjAsgRemarks: {
        type: Sequelize.TEXT,
        field: "adj_asg_remarks",
      },
      placeOfLossPostcode: {
        type: Sequelize.STRING,
        field: "place_of_loss_postcode",
      },
      recommendedReserve: {
        type: Sequelize.DECIMAL(10, 2),
        field: "recommended_reserve",
      },
      adjProviFee: {
        type: Sequelize.DECIMAL(10, 2),
        field: "adj_provi_fee",
      },
      policeReportDate: {
        type: Sequelize.DATEONLY,
        field: "police_report_date",
      },
      policeReportTime: {
        type: Sequelize.TIME,
        field: "police_report_time",
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "NEW",
      },
      is_processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      processing_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
    },
    {
      timestamps: true, // Enables createdAt and updatedAt
      underscored: true, // Uses snake_case for auto-generated fields
      indexes: [
        // Composite unique index for these fields combined
        {
          unique: true,
          fields: ["insured_veh_reg_no", "date_of_loss", "time_of_loss"],
          name: "unique_claim_index",
        },
      ],
    }
  );

  return MerimenData;
};
