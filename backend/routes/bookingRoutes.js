const express = require("express");

const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  confirmBooking,
  cancelBooking,
} = require("../controllers/bookingController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// CREATE BOOKING
// ======================================================
router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createBooking
);

// ======================================================
// GET ALL BOOKINGS
// ======================================================
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
  getBookings
);

// ======================================================
// GET BOOKING BY ID
// ======================================================
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
  getBookingById
);

// ======================================================
// UPDATE BOOKING
// ======================================================
router.put(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations"
  ),
  updateBooking
);

// ======================================================
// CONFIRM BOOKING
// ======================================================
router.put(
  "/:id/confirm",
  protect,
  authorize(
    "admin",
    "manager",
    "operations"
  ),
  confirmBooking
);

// ======================================================
// CANCEL BOOKING
// ======================================================
router.put(
  "/:id/cancel",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations"
  ),
  cancelBooking
);

module.exports = router;