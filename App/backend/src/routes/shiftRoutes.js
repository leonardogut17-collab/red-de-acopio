const express = require("express");
const c = require("../controllers/shiftController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", c.listShifts);
router.get("/mine", c.myShifts);
router.post("/", requireRole("admin", "coordinador"), c.createShift);
router.delete("/:id", requireRole("admin", "coordinador"), c.deleteShift);
router.get("/:id/volunteers", requireRole("admin", "coordinador"), c.listVolunteers);
router.post("/:id/signup", requireRole("voluntario"), c.signUpShift);
router.delete("/:id/signup", requireRole("voluntario"), c.cancelSignUp);

module.exports = router;
