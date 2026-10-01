const express = require("express");

const {
  createTransport,
  getTransports,
  getTransportById,
  updateTransport,
  deleteTransport,
} = require("../controllers/transportController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Create Transport
router.post(
  "/",
  protect,
  authorize("admin", "manager", "operations"),
  createTransport
);

// Get All Transports
router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getTransports
);

// Get Transport By ID
router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getTransportById
);

// Update Transport
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  updateTransport
);

// Delete Transport
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  deleteTransport
);

module.exports = router;