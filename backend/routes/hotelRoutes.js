const express = require("express");

const {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} = require("../controllers/hotelController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Create hotel
router.post(
  "/",
  protect,
  authorize("admin", "manager", "operations"),
  createHotel
);

// Get all hotels
router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getHotels
);

// Get hotel by ID
router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getHotelById
);

// Update hotel
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  updateHotel
);

// Delete hotel
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  deleteHotel
);

module.exports = router;