module.exports = (app) => {
  // const { verifySignUp, upload } = require("../middleware");
  const members = require("../controllers/member.controller");
  const verifySignUp = require("../middleware/verifySignUp");
  // const upload = require("../middleware/upload");

  var router = require("express").Router();

  // Create a new Member
  router.post(
    "/",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      // verifySignUp.checkRolesExisted,
    ],
    members.create
  );

  // Retrieve all Member
  router.get("/", members.findAll);

  // Retrieve all active Member
  router.get("/active", members.findAllActiveMember);

  // Retrieve a single Member with id
  router.get("/:id", members.findOneMember);

  // Update a Member with id
  // router.put("/:id", upload.single("image"), members.updateMember);
  router.put("/:id", members.updateMember);

  router.put("/updatePhoto/:id", members.updatePhoto);

  router.put("/updateProfile/:id", members.updateProfile);

  //Change password
  router.put("/changepass/:id", members.changePass);

  // router.post("/activation", members.activationlink);
  router.post("/reset/sendlink/", members.sendlink);
  router.post("/reset/verifyuser/", members.verifyUser);
  // router.put("/reset", members.updatePass);
  // Upload Image and Update MySQL with id
  // router.put("/upload/:id", upload.single("profile"), members.profileUpdate);yy

  // Upload Image and Update MySQL with id
  // router.post("/upload", upload.single("profile"), members.profileCreate);

  // Delete a Member with id
  router.delete("/:id", members.deleteMember);

  // Delete all Member
  // router.delete("/", members.deleteAllMember);

  // Retrieve all Members (include Roles)
  router.get("/userLevel/all", members.findAllRoles);

  app.use("/api/members", router);
};
