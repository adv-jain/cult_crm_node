const express = require("express");

const {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  activatePackage,
  archivePackage,
} = require("../controllers/packageController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// CREATE PACKAGE
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin", "manager", "operations"),
  createPackage
);

// =====================================================
// GET ALL PACKAGES
// =====================================================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getPackages
);

// =====================================================
// GET PACKAGE BY ID
// =====================================================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales", "operations"),
  getPackageById
);

// =====================================================
// UPDATE PACKAGE
// =====================================================

router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "operations"),
  updatePackage
);

// =====================================================
// ACTIVATE PACKAGE
// =====================================================

router.patch(
  "/:id/activate",
  protect,
  authorize("admin", "manager", "operations"),
  activatePackage
);

// =====================================================
// ARCHIVE PACKAGE
// =====================================================

router.patch(
  "/:id/archive",
  protect,
  authorize("admin", "manager", "operations"),
  archivePackage
);

// =====================================================
// DELETE PACKAGE
// =====================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deletePackage
);

module.exports = router;