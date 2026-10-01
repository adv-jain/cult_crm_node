
const express = require("express");

const {
  createCommission,
  getCommissions,
  getCommissionById,
  updateCommission,
  approveCommission,
  markCommissionPayable,
  markCommissionPaid,
  cancelCommission,
  deleteCommission,
} = require("../controllers/commissionController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Create
router.post(
  "/",
  protect,
  authorize("admin", "manager", "accounts"),
  createCommission
);

// Get All
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
  getCommissions
);

// Get By ID
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
  getCommissionById
);

// Update
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "accounts"),
  updateCommission
);

// Approve
router.put(
  "/:id/approve",
  protect,
  authorize("admin", "manager", "accounts"),
  approveCommission
);

// Mark Payable
router.put(
  "/:id/payable",
  protect,
  authorize("admin", "manager", "accounts"),
  markCommissionPayable
);

// Mark Paid
router.put(
  "/:id/pay",
  protect,
  authorize("admin", "manager", "accounts"),
  markCommissionPaid
);

// Cancel
router.put(
  "/:id/cancel",
  protect,
  authorize("admin", "manager", "accounts"),
  cancelCommission
);

// Delete
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "accounts"),
  deleteCommission
);

module.exports = router;

