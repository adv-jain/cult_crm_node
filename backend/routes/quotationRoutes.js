
const express = require("express");

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  prepareQuotation,
  sendQuotation,
  viewQuotation,
  acceptQuotation,
  rejectQuotation,
  cancelQuotation
} = require("../controllers/quotationController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// CREATE QUOTATION
// ======================================================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createQuotation
);

// ======================================================
// GET ALL QUOTATIONS
// ======================================================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  getQuotations
);

// ======================================================
// PREPARE QUOTATION
// ======================================================

router.put(
  "/:id/prepare",
  protect,
  authorize("admin", "manager", "sales"),
  prepareQuotation
);

// ======================================================
// SEND QUOTATION
// ======================================================

router.put(
  "/:id/send",
  protect,
  authorize("admin", "manager", "sales"),
  sendQuotation
);

// ======================================================
// VIEW QUOTATION
// ======================================================

router.put(
  "/:id/view",
  protect,
  authorize("admin", "manager", "sales"),
  viewQuotation
);

// ======================================================
// ACCEPT QUOTATION
// ======================================================

router.put(
  "/:id/accept",
  protect,
  authorize("admin", "manager", "sales"),
  acceptQuotation
);

// ======================================================
// REJECT QUOTATION
// ======================================================

router.put(
  "/:id/reject",
  protect,
  authorize("admin", "manager", "sales"),
  rejectQuotation
);

// ======================================================
// CANCEL QUOTATION
// ======================================================

router.put(
  "/:id/cancel",
  protect,
  authorize("admin", "manager", "sales"),
  cancelQuotation
);

// ======================================================
// GET QUOTATION BY ID
// IMPORTANT: Keep this after action routes
// ======================================================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  getQuotationById
);

// ======================================================
// UPDATE QUOTATION
// ======================================================

router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  updateQuotation
);

// ======================================================
// DELETE QUOTATION
// ======================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteQuotation
);

module.exports = router;

