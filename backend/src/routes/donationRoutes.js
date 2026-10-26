const express = require("express");
const c = require("../controllers/donationController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/mine", c.myDonations);
router.get("/", requireRole("admin", "coordinador"), c.listDonations);
router.post("/", c.createDonation);
router.patch("/:id/receive", requireRole("admin", "coordinador"), c.receiveDonation);
router.patch("/:id/cancel", c.cancelDonation);

module.exports = router;
