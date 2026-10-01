const express = require("express");

const {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  getLeadById,
  getAssignableUsers,
  convertLead,
} = require("../controllers/leadController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// =========================
// ASSIGNABLE USERS
// =========================

router.get(
  "/assignable-users",
  protect,
  authorize("admin", "manager"),
  getAssignableUsers
);

// =========================
// CREATE LEAD
// =========================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createLead
);

// =========================
// GET ALL LEADS
// =========================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  getLeads
);

// =========================
// CONVERT LEAD
// =========================

router.post(
  "/:id/convert",
  protect,
  authorize("admin", "manager", "sales"),
  convertLead
);

// =========================
// GET SINGLE LEAD
// =========================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  getLeadById
);

// =========================
// UPDATE LEAD
// =========================

router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  updateLead
);

// =========================
// DELETE LEAD - ADMIN ONLY
// =========================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteLead
);

module.exports = router;