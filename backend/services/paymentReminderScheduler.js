
const cron = require("node-cron");

const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const User = require("../models/User");

const {
  createPaymentReminderNotification,
} = require("./notificationService");

const TIMEZONE = "Asia/Kolkata";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getIndiaDateString = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const getDayDifference = (dueDate, today) => {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const current = new Date(`${today}T00:00:00Z`);

  return Math.round((due.getTime() - current.getTime()) / ONE_DAY_MS);
};

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const getRecipients = async (salesOwner) => {
  const users = await User.find({
    role: { $in: ["admin", "accounts"] },
    isActive: true,
  }).select("_id");

  const recipients = new Map();

  users.forEach((user) => {
    recipients.set(String(user._id), user._id);
  });

  if (salesOwner) {
    const activeOwner = await User.findOne({
      _id: salesOwner,
      isActive: true,
    }).select("_id");

    if (activeOwner) {
      recipients.set(String(activeOwner._id), activeOwner._id);
    }
  }

  return [...recipients.values()];
};

const checkPaymentReminders = async () => {
  try {
    const today = getIndiaDateString(new Date());

    const bookings = await Booking.find({
      nextPaymentDueDate: { $ne: null },
      status: { $nin: ["Cancelled", "Refunded"] },
    }).select(
      "_id bookingNumber customer destination status totalAmount nextPaymentDueDate salesOwner"
    );

    if (!bookings.length) {
      console.log("Payment reminders: no bookings with due dates.");
      return;
    }

    const bookingIds = bookings.map((booking) => booking._id);

    // Only Completed payments count as collected.
    const completedPayments = await Payment.aggregate([
      {
        $match: {
          booking: { $in: bookingIds },
          status: "Completed",
        },
      },
      {
        $group: {
          _id: "$booking",
          totalPaid: { $sum: "$amount" },
        },
      },
    ]);

    const paidByBooking = new Map(
      completedPayments.map((item) => [
        String(item._id),
        item.totalPaid,
      ])
    );

    for (const booking of bookings) {
      const totalAmount = Number(booking.totalAmount || 0);
      const completedPaid = Number(
        paidByBooking.get(String(booking._id)) || 0
      );

      const remainingAmount = Math.max(
        totalAmount - completedPaid,
        0
      );

      // Fully paid bookings don't receive reminders.
      if (remainingAmount <= 0) continue;

      const dueDate = getIndiaDateString(
        new Date(booking.nextPaymentDueDate)
      );

      const daysUntilDue = getDayDifference(dueDate, today);

      let stage;
      let type;
      let title;
      let message;

      if (daysUntilDue === 3) {
        stage = "DUE_3_DAYS";
        type = "PAYMENT_DUE";
        title = "Payment Due in 3 Days";
        message =
          `Booking ${booking.bookingNumber || booking._id} ` +
          `for ${booking.destination || "your trip"} has ` +
          `${formatAmount(remainingAmount)} remaining, due on ${dueDate}.`;
      } else if (daysUntilDue === 0) {
        stage = "DUE_TODAY";
        type = "PAYMENT_DUE";
        title = "Payment Due Today";
        message =
          `Payment of ${formatAmount(remainingAmount)} for booking ` +
          `${booking.bookingNumber || booking._id} is due today.`;
      } else if (daysUntilDue < 0) {
        stage = "OVERDUE";
        type = "PAYMENT_OVERDUE";
        title = "Payment Overdue";
        message =
          `Payment of ${formatAmount(remainingAmount)} for booking ` +
          `${booking.bookingNumber || booking._id} was due on ${dueDate}. ` +
          "Please follow up.";
      } else {
        continue;
      }

      const recipients = await getRecipients(booking.salesOwner);
      const reminderKey = `${booking._id}:${dueDate}:${stage}`;

      for (const recipient of recipients) {
        await createPaymentReminderNotification({
          recipient,
          type,
          title,
          message,
          booking,
          reminderKey,
        });
      }
    }

    console.log(`Payment reminders checked successfully for ${today}.`);
  } catch (error) {
    console.error("Payment reminder scheduler error:", error);
  }
};

const startPaymentReminderScheduler = () => {
  cron.schedule(
    "0 9 * * *",
    () => {
      checkPaymentReminders();
    },
    { timezone: TIMEZONE }
  );

  console.log(
    "Payment reminder scheduler started. Runs daily at 9:00 AM IST."
  );

  // Run one check when the server starts.
  checkPaymentReminders();
};

module.exports = {
  startPaymentReminderScheduler,
  checkPaymentReminders,
};
