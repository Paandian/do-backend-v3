module.exports = (sequelize, Sequelize) => {
  const Casefile = sequelize.define(
    "casefile",
    {
      caseFrom: {
        type: Sequelize.STRING,
      },
      fileStatus: {
        type: Sequelize.STRING,
      },
      flag: {
        type: Sequelize.INTEGER,
      },
      refType: {
        type: Sequelize.INTEGER,
      },
      subRefType: {
        type: Sequelize.INTEGER,
      },
      branch: {
        type: Sequelize.INTEGER,
      },
      insurer: {
        type: Sequelize.INTEGER,
      },
      handler: {
        type: Sequelize.INTEGER,
      },
      adjuster: {
        type: Sequelize.INTEGER,
      },
      editor: {
        type: Sequelize.INTEGER,
      },
      clerkInCharge: {
        type: Sequelize.INTEGER,
      },
      claimNo: {
        type: Sequelize.STRING,
      },
      vehicleNo: {
        type: Sequelize.STRING,
      },
      dateOfAssign: {
        type: Sequelize.DATEONLY,
      },
      dateOfLoss: {
        type: Sequelize.DATEONLY,
      },
      stateOfLoss: {
        type: Sequelize.INTEGER,
      },
      placeOfLoss: {
        type: Sequelize.STRING,
      },
      insuredName: {
        type: Sequelize.STRING,
      },
      insuredIC: {
        type: Sequelize.STRING,
      },
      insuredTel: {
        type: Sequelize.STRING,
      },
      insuredEmail: {
        type: Sequelize.STRING,
      },
      insuredDriverName: {
        type: Sequelize.STRING,
      },
      insuredDriverIc: {
        type: Sequelize.STRING,
      },
      insuredDriverTel: {
        type: Sequelize.STRING,
      },
      insuredDriverEmail: {
        type: Sequelize.STRING,
      },
      policeReportNo: {
        type: Sequelize.STRING,
      },
      policeReportDate: {
        type: Sequelize.DATEONLY,
      },
      policyNo: {
        type: Sequelize.STRING,
      },
      coverFrom: {
        type: Sequelize.DATEONLY,
      },
      coverTo: {
        type: Sequelize.DATEONLY,
      },
      insComment: {
        type: Sequelize.STRING,
      },
      solicitorName: {
        type: Sequelize.STRING,
      },
      solicitorTel: {
        type: Sequelize.STRING,
      },
      solicitorEmail: {
        type: Sequelize.STRING,
      },
      counselName: {
        type: Sequelize.STRING,
      },
      counselTel: {
        type: Sequelize.STRING,
      },
      counselEmail: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantName: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantIc: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantTel: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantEmail: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantVehicleNo: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantVehicleModel: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantSolicitor: {
        type: Sequelize.STRING,
      },
      thirdPartyClaimantSolicitorEmail: {
        type: Sequelize.STRING,
      },
      dateOfCancel: {
        type: Sequelize.DATEONLY,
      },
      applyDocDate: {
        type: Sequelize.DATEONLY,
      },
      dateOfReg: {
        type: Sequelize.DATEONLY,
      },
      dateOfAdj: {
        type: Sequelize.DATEONLY,
      },
      dateStartInv: {
        type: Sequelize.DATEONLY,
      },
      dateEndInv: {
        type: Sequelize.DATEONLY,
      },
      dateOfEdi: {
        type: Sequelize.DATEONLY,
      },
      dateStartEdi: {
        type: Sequelize.DATEONLY,
      },
      dateEndEdi: {
        type: Sequelize.DATEONLY,
      },
      dateOfApproval: {
        type: Sequelize.DATEONLY,
      },
      dateAssignFormatting: {
        type: Sequelize.DATEONLY,
      },
      dateStartFormatting: {
        type: Sequelize.DATEONLY,
      },
      dateEndFormatting: {
        type: Sequelize.DATEONLY,
      },
      dateFinal: {
        type: Sequelize.DATEONLY,
      },
      dateDispatch: {
        type: Sequelize.DATEONLY,
      },
      dateClosed: {
        type: Sequelize.DATEONLY,
      },
      // Invoice
      invNo: {
        type: Sequelize.STRING,
      },
      invFeeNote: {
        type: Sequelize.STRING,
      },
      invTotal: {
        type: Sequelize.STRING,
      },
      // Transfer
      transfer: {
        type: Sequelize.STRING,
      },
      transferDate: {
        type: Sequelize.DATEONLY,
      },
      transferBy: {
        type: Sequelize.INTEGER,
      },
      // Created
      createdBy: {
        type: Sequelize.INTEGER,
      },
      cancelBy: {
        type: Sequelize.INTEGER,
      },
      registerBy: {
        type: Sequelize.INTEGER,
      },
      applyDocBy: {
        type: Sequelize.INTEGER,
      },
      assignBranchBy: {
        type: Sequelize.INTEGER,
      },
      assignAdjBy: {
        type: Sequelize.INTEGER,
      },
      assignEdiBy: {
        type: Sequelize.INTEGER,
      },
      approvedBy: {
        type: Sequelize.INTEGER,
      },
      assignClerkBy: {
        type: Sequelize.INTEGER,
      },
      finalBy: {
        type: Sequelize.INTEGER,
      },
      dispatchBy: {
        type: Sequelize.INTEGER,
      },
      closedBy: {
        type: Sequelize.INTEGER,
      },
    },
    {
      initialAutoIncrement: 156500,
    }
  );

  return Casefile;
};
