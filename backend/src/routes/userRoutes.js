const express = require("express");
const c = require("../controllers/userController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken, requireRole("admin"));

router.get("/", c.listUsers);
router.patch("/:id", c.updateUser);

module.exports = router;
