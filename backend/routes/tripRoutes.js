const express = require("express");

const {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getAssignableUsers,
} = require("../controllers/tripController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// ASSIGNABLE USERS
// Access: Admin + Manager
// =====================================================

router.get(
  "/assignable-users",
  protect,
  authorize("admin", "manager"),
  getAssignableUsers
);

// =====================================================
// CREATE TRIP
// Access: Admin + Manager + Sales
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createTrip
);

// =====================================================
// GET ALL TRIPS
// Access: Admin + Manager + Sales
// =====================================================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  getTrips
);

// =====================================================
// GET SINGLE TRIP
// Access: Admin + Manager + Sales
// =====================================================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  getTripById
);

// =====================================================
// UPDATE TRIP
// Access: Admin + Manager + Sales
// =====================================================

router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  updateTrip
);

// =====================================================
// DELETE TRIP
// Access: Admin only
// =====================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteTrip
);

module.exports = router;