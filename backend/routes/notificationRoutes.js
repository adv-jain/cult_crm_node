
const express = require("express");

const {
  createNotification,
  getNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require("../controllers/notificationController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// CREATE NOTIFICATION
// ==========================================

router.post(
  "/",
  protect,
  authorize("admin", "manager"),
  createNotification
);

// ==========================================
// UNREAD COUNT
// IMPORTANT: Keep this before /:id
// ==========================================

router.get(
  "/unread-count",
  protect,
  authorize("admin", "manager", "sales"),
  getUnreadCount
);

// ==========================================
// GET ALL NOTIFICATIONS
// ==========================================

router.get(
  "/",
  protect,
  authorize("admin", "manager", "sales"),
  getNotifications
);

// ==========================================
// MARK ALL AS READ
// IMPORTANT: Keep this before /:id
// ==========================================

router.put(
  "/read-all",
  protect,
  authorize("admin", "manager", "sales"),
  markAllAsRead
);

// ==========================================
// GET SINGLE NOTIFICATION
// ==========================================

router.get(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  getNotificationById
);

// ==========================================
// MARK SINGLE AS READ
// ==========================================

router.put(
  "/:id/read",
  protect,
  authorize("admin", "manager", "sales"),
  markAsRead
);

// ==========================================
// DELETE NOTIFICATION
// ==========================================

router.delete(
  "/:id",
  protect,
  authorize("admin", "manager", "sales"),
  deleteNotification
);

module.exports = router;

