const db = require("../models");
const MerimenData = db.merimenData;
const Op = db.Sequelize.Op;

exports.create = async (req, res) => {
  try {
    const data = await MerimenData.create(req.body);
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error occurred while creating MerimenData.",
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await MerimenData.findAll();
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error occurred while retrieving MerimenData.",
    });
  }
};

exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const data = await MerimenData.findByPk(id);
    if (!data) {
      res.status(404).send({ message: "MerimenData not found." });
      return;
    }
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: "Error retrieving MerimenData with id=" + id,
    });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await MerimenData.update(req.body, {
      where: { id: id },
    });
    if (num == 1) {
      res.send({ message: "MerimenData updated successfully." });
    } else {
      res.send({ message: "Could not update MerimenData." });
    }
  } catch (err) {
    res.status(500).send({
      message: "Error updating MerimenData with id=" + id,
    });
  }
};

exports.updateStatus = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await MerimenData.update(
      { status: req.body.status },
      { where: { id: id } }
    );
    if (num == 1) {
      res.send({ message: "MerimenData status updated successfully." });
    } else {
      res.send({ message: "Could not update MerimenData status." });
    }
  } catch (err) {
    res.status(500).send({
      message: "Error updating MerimenData status with id=" + id,
    });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await MerimenData.destroy({ where: { id: id } });
    if (num == 1) {
      res.send({ message: "MerimenData deleted successfully!" });
    } else {
      res.send({ message: "Could not delete MerimenData." });
    }
  } catch (err) {
    res.status(500).send({
      message: "Error deleting MerimenData with id=" + id,
    });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const num = await MerimenData.destroy({
      where: { id: { [Op.in]: req.body.ids } },
    });
    res.send({ message: `${num} MerimenData were deleted successfully!` });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error occurred while removing MerimenData.",
    });
  }
};

// exports.bulkDelete = async (req, res) => {
//   try {
//     const { ids } = req.body;

//     if (!Array.isArray(ids) || ids.length === 0) {
//       return res.status(400).send({
//         message: "IDs must be provided as a non-empty array",
//       });
//     }

//     // Perform your deletion logic here
//     await MerimenData.deleteMany({ _id: { $in: ids } });

//     res.send({
//       message: `${ids.length} MerimenData were deleted successfully!`,
//     });
//   } catch (error) {
//     res.status(500).send({
//       message: "Error occurred while removing MerimenData.",
//       error: error.message,
//     });
//   }
// };

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const num = await MerimenData.update(
      { status: req.body.status },
      { where: { id: req.body.ids } }
    );
    res.send({ message: `${num} MerimenData were updated successfully!` });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Error occurred while updating MerimenData.",
    });
  }
};
