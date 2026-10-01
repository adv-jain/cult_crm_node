
const express = require("express");

const router = express.Router();


// ============================================
// CONTROLLER IMPORTS
// ============================================

const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  issueInvoice,
  sendInvoice,
  markInvoiceViewed,
  recordInvoicePayment,
  cancelInvoice,
  deleteInvoice
} = require("../controllers/invoiceController");


// ============================================
// MIDDLEWARE IMPORTS
// ============================================

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");


// ============================================
// CREATE INVOICE
// POST /api/invoices
// ============================================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales", "accounts"),
  createInvoice
);


// ============================================
// GET ALL INVOICES
// GET /api/invoices
// ============================================

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
  getInvoices
);


// ============================================
// GET SINGLE INVOICE
// GET /api/invoices/:id
// ============================================

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
  getInvoiceById
);


// ============================================
// UPDATE INVOICE
// PUT /api/invoices/:id
// ============================================

router.put(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  updateInvoice
);


// ============================================
// ISSUE INVOICE
// PUT /api/invoices/:id/issue
// ============================================

router.put(
  "/:id/issue",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  issueInvoice
);


// ============================================
// SEND INVOICE
// PUT /api/invoices/:id/send
// ============================================

router.put(
  "/:id/send",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "accounts"
  ),
  sendInvoice
);


// ============================================
// MARK INVOICE AS VIEWED
// PUT /api/invoices/:id/view
// ============================================

router.put(
  "/:id/view",
  protect,
  authorize(
    "admin",
    "manager",
    "sales",
    "operations",
    "accounts"
  ),
  markInvoiceViewed
);


// ============================================
// RECORD INVOICE PAYMENT
// PUT /api/invoices/:id/payment
// ============================================

router.put(
  "/:id/payment",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  recordInvoicePayment
);


// ============================================
// CANCEL INVOICE
// PUT /api/invoices/:id/cancel
// ============================================

router.put(
  "/:id/cancel",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  cancelInvoice
);


// ============================================
// DELETE INVOICE
// DELETE /api/invoices/:id
// ============================================

router.delete(
  "/:id",
  protect,
  authorize(
    "admin",
    "manager",
    "accounts"
  ),
  deleteInvoice
);


// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;

