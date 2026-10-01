const express = require("express");

const {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivityUsers,
} = require("../controllers/activityController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// ACTIVITY USERS
// Must come before /:id
// =====================================================

router.get(
  "/users",
  protect,
  authorize(
    "admin",
    "manager"
  ),
  getActivityUsers
);

// =====================================================
// CREATE ACTIVITY
// =====================================================

router.post(
  "/",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  createActivity
);

// =====================================================
// GET ALL ACTIVITIES
// =====================================================

router.get(
  "/",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getActivities
);

// =====================================================
// GET SINGLE ACTIVITY
// =====================================================

router.get(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getActivityById
);

// =====================================================
// UPDATE ACTIVITY
// =====================================================

router.put(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  updateActivity
);

// =====================================================
// DELETE ACTIVITY
// Admin only
// =====================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteActivity
);

module.exports = router;