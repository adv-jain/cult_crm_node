
const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentById,
} = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// CREATE PAYMENT
// =====================================================

router.post(
  "/",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "accounts"
  ),
  createPayment
);

// =====================================================
// GET ALL PAYMENTS
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
  getPayments
);

// =====================================================
// GET PAYMENT BY ID
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
  getPaymentById
);

module.exports = router;

