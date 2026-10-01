const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getAssignableUsers,
  getSupplierTypes,
  getSupplierStatuses,
} = require("../controllers/supplierController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// SUPPLIER ROUTES
// =====================================================

// Get all suppliers
router.get(
  "/",
  authMiddleware,
  getSuppliers
);

// Get supplier types
router.get(
  "/types",
  authMiddleware,
  getSupplierTypes
);

// Get supplier statuses
router.get(
  "/statuses",
  authMiddleware,
  getSupplierStatuses
);

// Get assignable users
router.get(
  "/assignable-users",
  authMiddleware,
  getAssignableUsers
);

// Get supplier by ID
router.get(
  "/:id",
  authMiddleware,
  getSupplierById
);

// Create supplier
router.post(
  "/",
  authMiddleware,
  createSupplier
);

// Update supplier
router.put(
  "/:id",
  authMiddleware,
  updateSupplier
);

// Delete supplier
router.delete(
  "/:id",
  authMiddleware,
  deleteSupplier
);

module.exports = router;