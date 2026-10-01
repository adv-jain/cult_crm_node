
const express = require("express");

const {
  createRefund,
  getRefunds,
  getRefundById,
  updateRefund,
  reviewRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  completeRefund,
  cancelRefund,
  deleteRefund,
} = require("../controllers/refundController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ====================================================
// CREATE REFUND REQUEST
// ====================================================

router.post(
  "/",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "accounts"
  ),
  createRefund
);

// ====================================================
// GET ALL REFUNDS
// ====================================================

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
  getRefunds
);

// ====================================================
// GET REFUND BY ID
// ====================================================

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
  getRefundById
);

// ====================================================
// UPDATE REFUND
// ====================================================

router.put(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  updateRefund
);

// ====================================================
// MOVE REFUND TO UNDER REVIEW
// ====================================================

router.put(
  "/:id/review",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  reviewRefund
);

// ====================================================
// APPROVE REFUND
// ====================================================

router.put(
  "/:id/approve",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  approveRefund
);

// ====================================================
// REJECT REFUND
// ====================================================

router.put(
  "/:id/reject",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  rejectRefund
);

// ====================================================
// START REFUND PROCESSING
// ====================================================

router.put(
  "/:id/process",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  processRefund
);

// ====================================================
// COMPLETE REFUND
// ====================================================

router.put(
  "/:id/complete",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  completeRefund
);

// ====================================================
// CANCEL REFUND
// ====================================================

router.put(
  "/:id/cancel",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  cancelRefund
);

// ====================================================
// DELETE REFUND
// ====================================================

router.delete(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  deleteRefund
);

module.exports = router;

