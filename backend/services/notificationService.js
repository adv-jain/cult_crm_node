const Notification = require("../models/Notification");

// ======================================================
// CORE: CREATE NOTIFICATION
// ======================================================

const createNotification = async ({
  recipient,
  type,
  title,
  message,

  relatedLead = null,
  relatedCustomer = null,
  relatedContact = null,
  relatedCompany = null,
  relatedEnquiry = null,
  relatedTask = null,
  relatedTrip = null,
  relatedQuotation = null,
  relatedBooking = null,
  relatedPayment = null,
  relatedDocument = null,

  metadata = null,
}) => {
  try {
    if (!recipient) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,

      relatedLead,
      relatedCustomer,
      relatedContact,
      relatedCompany,
      relatedEnquiry,
      relatedTask,
      relatedTrip,
      relatedQuotation,
      relatedBooking,
      relatedPayment,
      relatedDocument,

      metadata,
    });

    return notification;
  } catch (error) {
    console.error(
      "Notification creation error:",
      error.message
    );

    // Notification failure should NOT break the main CRM flow.
    return null;
  }
};

// ======================================================
// PAYMENT REMINDER: CREATE WITHOUT DUPLICATES
// ======================================================

const createPaymentReminderNotification = async ({
  recipient,
  type,
  title,
  message,
  booking,
  reminderKey,
}) => {
  try {
    if (!recipient || !booking?._id || !reminderKey) {
      return null;
    }

    // Check whether this reminder already exists.
    const existingNotification = await Notification.findOne({
      recipient,
      type,
      relatedBooking: booking._id,
      "metadata.reminderKey": reminderKey,
    }).select("_id");

    if (existingNotification) {
      return existingNotification;
    }

    return await createNotification({
      recipient,
      type,
      title,
      message,
      relatedBooking: booking._id,
      relatedCustomer: booking.customer || null,
      metadata: {
        reminderKey,
        reminderDate: new Date(),
      },
    });
  } catch (error) {
    console.error(
      "Payment reminder error:",
      error.message
    );

    return null;
  }
};


// ======================================================
// LEAD ASSIGNED
// ======================================================

const createLeadAssignedNotification = async ({
  recipient,
  lead,
  leadName,
}) => {
  return createNotification({
    recipient,
    type: "LEAD_ASSIGNED",
    title: "New Lead Assigned",
    message: `${leadName} has been assigned to you.`,
    relatedLead: lead,
  });
};

// ======================================================
// TASK ASSIGNED
// ======================================================

const createTaskAssignedNotification = async ({
  recipient,
  task,
  taskTitle,
}) => {
  return createNotification({
    recipient,
    type: "TASK_ASSIGNED",
    title: "New Task Assigned",
    message: `${taskTitle} has been assigned to you.`,
    relatedTask: task,
  });
};

// ======================================================
// TRIP ASSIGNED (renamed from createDealAssignedNotification)
// ======================================================

const createTripAssignedNotification = async ({
  recipient,
  trip,
  tripTitle,
}) => {
  return createNotification({
    recipient,
    type: "TRIP_ASSIGNED",
    title: "New Trip Assigned",
    message: `${tripTitle} has been assigned to you.`,
    relatedTrip: trip,
  });
};

// ======================================================
// CUSTOMER CREATED
// ======================================================

const createCustomerCreatedNotification = async ({
  recipient,
  customer,
  customerName,
}) => {
  return createNotification({
    recipient,
    type: "CUSTOMER_CREATED",
    title: "New Customer Created",
    message: `${customerName} has been added as a customer.`,
    relatedCustomer: customer,
  });
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createNotification,
  createLeadAssignedNotification,
  createTaskAssignedNotification,
  createTripAssignedNotification,
  createCustomerCreatedNotification,
  createPaymentReminderNotification,
};