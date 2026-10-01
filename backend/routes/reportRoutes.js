
const express = require("express");

const {
  getSalesReport,
  getBookingReport,
  getRevenueReport,
  getExpenseReport,
  getRefundReport,
  getCommissionReport,
  getProfitLossReport,
  getAgentPerformanceReport,
  getDestinationReport
} = require("../controllers/reportController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// SALES REPORT
// =====================================================

router.get(
  "/sales",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getSalesReport
);


// =====================================================
// BOOKING REPORT
// =====================================================

router.get(
  "/bookings",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getBookingReport
);


// =====================================================
// REVENUE REPORT
// =====================================================

router.get(
  "/revenue",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getRevenueReport
);


// =====================================================
// EXPENSE REPORT
// =====================================================

router.get(
  "/expenses",
  protect,
  authorize(
    "admin",
    "manager",
    "operations",
    "accounts"
  ),
  getExpenseReport
);


// =====================================================
// REFUND REPORT
// =====================================================

router.get(
  "/refunds",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getRefundReport
);


// =====================================================
// COMMISSION REPORT
// =====================================================

router.get(
  "/commissions",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getCommissionReport
);


// =====================================================
// PROFIT & LOSS
// =====================================================

router.get(
  "/profit-loss",
  protect,
  authorize(
    "admin",
    "manager",
    "operations",
    "accounts"
  ),
  getProfitLossReport
);


// =====================================================
// AGENT PERFORMANCE
// =====================================================

router.get(
  "/agent-performance",
  protect,
  authorize(
    "admin",
    "manager",
    "sales"
  ),
  getAgentPerformanceReport
);


// =====================================================
// DESTINATION REPORT
// =====================================================

router.get(
  "/destinations",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getDestinationReport
);


module.exports = router;

