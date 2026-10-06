const express = require("express");

const {
  getOverviewReport,
  getSalesReport,
  getBookingReport,
  getRevenueReport,
  getExpenseReport,
  getRefundReport,
  getCommissionReport,
  getProfitLossReport,
  getAgentPerformanceReport,
  getDestinationReport,
} = require("../controllers/reportController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

const ALL_ROLES = [
  "admin",
  "manager",
  "sales",
  "operations",
  "accounts",
];

/*
|--------------------------------------------------------------------------
| Reports Overview
|--------------------------------------------------------------------------
*/
router.get(
  "/overview",
  protect,
  authorize(...ALL_ROLES),
  getOverviewReport
);

/*
|--------------------------------------------------------------------------
| Sales Report
|--------------------------------------------------------------------------
*/
router.get(
  "/sales",
  protect,
  authorize(...ALL_ROLES),
  getSalesReport
);

/*
|--------------------------------------------------------------------------
| Booking Report
|--------------------------------------------------------------------------
*/
router.get(
  "/bookings",
  protect,
  authorize(...ALL_ROLES),
  getBookingReport
);

/*
|--------------------------------------------------------------------------
| Revenue Report
|--------------------------------------------------------------------------
*/
router.get(
  "/revenue",
  protect,
  authorize(...ALL_ROLES),
  getRevenueReport
);

/*
|--------------------------------------------------------------------------
| Expense Report
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| Refund Report
|--------------------------------------------------------------------------
*/
router.get(
  "/refunds",
  protect,
  authorize(...ALL_ROLES),
  getRefundReport
);

/*
|--------------------------------------------------------------------------
| Commission Report
|--------------------------------------------------------------------------
*/
router.get(
  "/commissions",
  protect,
  authorize(...ALL_ROLES),
  getCommissionReport
);

/*
|--------------------------------------------------------------------------
| Profit & Loss Report
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| Agent Performance
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| Destination Report
|--------------------------------------------------------------------------
*/
router.get(
  "/destinations",
  protect,
  authorize(...ALL_ROLES),
  getDestinationReport
);

module.exports = router;