
const express = require("express");

const {
  getDashboardSummary,
  getDashboardPipeline,
  getDashboardLeadSources,
  getDashboardMonthlyRevenue,
  getDashboardBookingStatus,
  getDashboardPaymentStatus,
  getDashboardDestinations,
  getDashboardTravelTypes,
  getPaymentDueTracker,
  getDashboardRecent
} = require("../controllers/dashboardController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// DASHBOARD SUMMARY
// =====================================================

router.get(
  "/summary",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardSummary
);


// =====================================================
// SALES PIPELINE
// =====================================================

router.get(
  "/pipeline",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardPipeline
);


// =====================================================
// LEAD SOURCES
// =====================================================

router.get(
  "/lead-sources",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardLeadSources
);


// =====================================================
// MONTHLY REVENUE
// =====================================================

router.get(
  "/monthly-revenue",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardMonthlyRevenue
);


// =====================================================
// BOOKING STATUS
// =====================================================

router.get(
  "/booking-status",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardBookingStatus
);


// =====================================================
// PAYMENT STATUS
// =====================================================

router.get(
  "/payment-status",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardPaymentStatus
);


router.get(
  "/payment-due-tracker",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getPaymentDueTracker
);


// =====================================================
// DESTINATIONS
// =====================================================

router.get(
  "/destinations",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardDestinations
);


// =====================================================
// TRAVEL TYPES
// =====================================================

router.get(
  "/travel-types",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardTravelTypes
);


// =====================================================
// RECENT ACTIVITIES + UPCOMING TASKS
// =====================================================

router.get(
  "/recent",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getDashboardRecent
);


module.exports = router;

