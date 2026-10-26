const express = require("express");
const c = require("../controllers/needController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", c.listNeeds);
router.post("/", authenticateToken, requireRole("admin", "coordinador"), c.createNeed);
router.put("/:id", authenticateToken, requireRole("admin", "coordinador"), c.updateNeed);
router.delete("/:id", authenticateToken, requireRole("admin", "coordinador"), c.deleteNeed);

module.exports = router;
