const express = require("express");

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  cancelExpense,
  getBookingExpenseSummary,
} = require("../controllers/expenseController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/",
  protect,
  authorize(
    "admin",
    "manager",
    "operations",
    "accounts"
  ),
  createExpense
);

/* =========================================================
   LIST
========================================================= */

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
  getExpenses
);

/* =========================================================
   BOOKING SUMMARY
   IMPORTANT: Keep this BEFORE /:id
========================================================= */

router.get(
  "/booking/:bookingId/summary",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  getBookingExpenseSummary
);

/* =========================================================
   GET SINGLE
========================================================= */

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
  getExpenseById
);

/* =========================================================
   UPDATE
========================================================= */

router.put(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "operations",
    "accounts"
  ),
  updateExpense
);

/* =========================================================
   APPROVE
========================================================= */

router.put(
  "/:id/approve",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  approveExpense
);

/* =========================================================
   REJECT
========================================================= */

router.put(
  "/:id/reject",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  rejectExpense
);

/* =========================================================
   PAY
========================================================= */

router.put(
  "/:id/pay",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  markExpensePaid
);

/* =========================================================
   CANCEL
========================================================= */

router.put(
  "/:id/cancel",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  cancelExpense
);

/* =========================================================
   DELETE
========================================================= */

router.delete(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  deleteExpense
);

module.exports = router;