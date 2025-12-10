const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");

/**
 * @route   GET /api/users/test
 * @desc    Test endpoint to check if users can be loaded (no auth required)
 * @access  Public
 */
router.get("/test", userController.getAllUsers);

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get("/", verifyToken, requireAdmin, userController.getAllUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (admin only)
 * @access  Private/Admin
 */
router.get("/stats", verifyToken, requireAdmin, userController.getUserStats);

module.exports = router;
