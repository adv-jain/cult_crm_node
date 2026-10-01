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
  getBookingExpenseSummary,
} = require("../controllers/expenseController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// CREATE EXPENSE
// ==========================================
router.post(
  "/",
  protect,
  authorize("admin", "manager", "operations", "accounts"),
  createExpense
);

// ==========================================
// GET ALL EXPENSES
// ==========================================
router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getExpenses
);

// ==========================================
// BOOKING EXPENSE SUMMARY
// ==========================================
router.get(
  "/booking/:bookingId/summary",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getBookingExpenseSummary
);

// ==========================================
// GET EXPENSE BY ID
// ==========================================
router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales", "operations", "accounts"),
  getExpenseById
);

// ==========================================
// UPDATE EXPENSE
// ==========================================
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "operations", "accounts"),
  updateExpense
);

// ==========================================
// APPROVE EXPENSE
// ==========================================
router.put(
  "/:id/approve",
  protect,
  authorize("admin", "manager", "accounts"),
  approveExpense
);

// ==========================================
// REJECT EXPENSE
// ==========================================
router.put(
  "/:id/reject",
  protect,
  authorize("admin", "manager", "accounts"),
  rejectExpense
);

// ==========================================
// MARK EXPENSE PAID
// ==========================================
router.put(
  "/:id/pay",
  protect,
  authorize("admin", "manager", "accounts"),
  markExpensePaid
);

// ==========================================
// DELETE EXPENSE
// ==========================================
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "accounts"),
  deleteExpense
);

module.exports = router;