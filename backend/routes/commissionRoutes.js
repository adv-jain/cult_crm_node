const express = require("express");

const {
  createCommission,
  getCommissions,
  getCommissionById,
  updateCommission,
  approveCommission,
  markCommissionPayable,
  markCommissionPaid,
  cancelCommission,
  deleteCommission,
} = require("../controllers/commissionController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Create Commission
|--------------------------------------------------------------------------
*/
router.post(
  "/",
  protect,
  authorize("admin", "manager", "accounts"),
  createCommission
);

/*
|--------------------------------------------------------------------------
| Get All Commissions
|--------------------------------------------------------------------------
*/
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
  getCommissions
);

/*
|--------------------------------------------------------------------------
| Get Commission By ID
|--------------------------------------------------------------------------
*/
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
  getCommissionById
);

/*
|--------------------------------------------------------------------------
| Update Commission
|--------------------------------------------------------------------------
*/
router.put(
  "/:id",
  protect,
  authorize("admin", "manager", "accounts"),
  updateCommission
);

/*
|--------------------------------------------------------------------------
| Approve Commission
| Pending → Approved
|--------------------------------------------------------------------------
*/
router.put(
  "/:id/approve",
  protect,
  authorize("admin", "manager", "accounts"),
  approveCommission
);

/*
|--------------------------------------------------------------------------
| Mark Commission Payable
| Approved → Payable
|--------------------------------------------------------------------------
*/
router.put(
  "/:id/payable",
  protect,
  authorize("admin", "manager", "accounts"),
  markCommissionPayable
);

/*
|--------------------------------------------------------------------------
| Mark Commission Paid
| Payable → Paid
|--------------------------------------------------------------------------
*/
router.put(
  "/:id/pay",
  protect,
  authorize("admin", "manager", "accounts"),
  markCommissionPaid
);

/*
|--------------------------------------------------------------------------
| Cancel Commission
|--------------------------------------------------------------------------
*/
router.put(
  "/:id/cancel",
  protect,
  authorize("admin", "manager", "accounts"),
  cancelCommission
);

/*
|--------------------------------------------------------------------------
| Delete Commission
|--------------------------------------------------------------------------
*/
router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "accounts"),
  deleteCommission
);

module.exports = router;