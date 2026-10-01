const express = require("express");

const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
  getAssignableUsers,
} = require("../controllers/enquiryController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ======================================================
// ASSIGNABLE USERS
// ======================================================

router.get(
  "/assignable-users",
  protect,
  authorize("admin", "manager"),
  getAssignableUsers
);

// ======================================================
// CREATE ENQUIRY
// ======================================================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  createEnquiry
);

// ======================================================
// GET ALL ENQUIRIES
// ======================================================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  getEnquiries
);

// ======================================================
// GET SINGLE ENQUIRY
// ======================================================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  getEnquiryById
);

// ======================================================
// UPDATE ENQUIRY
// ======================================================

router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  updateEnquiry
);

// ======================================================
// DELETE ENQUIRY - ADMIN ONLY
// ======================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteEnquiry
);

module.exports = router;