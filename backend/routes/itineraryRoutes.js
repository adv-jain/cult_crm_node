const express = require("express");

const {
  createItinerary,
  getItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
  approveItinerary,
  shareItinerary,
  getItineraryUsers,
} = require("../controllers/itineraryController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Users — must come before /:id
router.get(
  "/users",
  protect,
  authorize("admin", "manager"),
  getItineraryUsers
);

// Create
router.post(
  "/",
  protect,
  authorize("admin", "manager", "operations", "sales"),
  createItinerary
);

// Get all
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
  getItineraries
);

// Get single
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
  getItineraryById
);

// Update
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "operations", "sales"),
  updateItinerary
);

// Approve
router.put(
  "/:id/approve",
  protect,
  authorize("admin", "manager"),
  approveItinerary
);

// Share with customer
router.put(
  "/:id/share",
  protect,
  authorize("admin", "manager", "sales"),
  shareItinerary
);

// Delete
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  deleteItinerary
);

module.exports = router;