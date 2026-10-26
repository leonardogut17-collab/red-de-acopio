const express = require("express");
const c = require("../controllers/centerController");
const { authenticateToken, optionalAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", optionalAuth, c.listCenters);
router.get("/mine", authenticateToken, requireRole("admin", "coordinador"), c.myCenters);
router.get("/:id", optionalAuth, c.getCenter);
router.get("/:id/inventory", authenticateToken, requireRole("admin", "coordinador"), c.getInventory);
router.post("/", authenticateToken, requireRole("admin"), c.createCenter);
router.put("/:id", authenticateToken, requireRole("admin", "coordinador"), c.updateCenter);
router.delete("/:id", authenticateToken, requireRole("admin"), c.deleteCenter);

module.exports = router;
