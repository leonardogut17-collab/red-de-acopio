const express = require("express");
const c = require("../controllers/deliveryController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken, requireRole("admin", "coordinador"));

router.get("/", c.listDeliveries);
router.post("/", c.createDelivery);

module.exports = router;
