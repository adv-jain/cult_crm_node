
const express = require("express");

const {
  createTraveller,
  getTravellers,
  getTravellerById,
  getTravellersByCustomer,
  updateTraveller,
  updateTravellerStatus,
  deleteTraveller
} = require("../controllers/travellerController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// Create Traveller
router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createTraveller
);


// Get all Travellers
router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getTravellers
);


// Get Travellers by Customer
// IMPORTANT: this must come before /:id
router.get(
  "/customer/:customerId",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getTravellersByCustomer
);


// Get Traveller by ID
router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getTravellerById
);


// Update Traveller
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  updateTraveller
);


// Update Traveller Status
router.put(
  "/:id/status",
  protect,
  authorize("admin", "manager", "sales"),
  updateTravellerStatus
);


// Delete Traveller
// Admin only
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteTraveller
);


module.exports = router;

