const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // =========================
    // RECIPIENT
    // =========================

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =========================
    // NOTIFICATION TYPE
    // =========================

    type: {
      type: String,
      enum: [
        // Lead
        "LEAD_ASSIGNED",
        "LEAD_CONVERTED",

        // Customer
        "CUSTOMER_CREATED",

        // Enquiry
        "ENQUIRY_CREATED",
        "ENQUIRY_ASSIGNED",
        "ENQUIRY_UPDATED",

        // Task
        "TASK_ASSIGNED",
        "TASK_COMPLETED",
        "TASK_OVERDUE",

        // Trip
        "TRIP_CREATED",
        "TRIP_ASSIGNED",
        "TRIP_UPDATED",
        "TRIP_UPCOMING",
        "TRIP_STARTED",
        "TRIP_COMPLETED",
        "TRIP_CANCELLED",

        // Quotation
        "QUOTATION_CREATED",
        "QUOTATION_SENT",
        "QUOTATION_ACCEPTED",
        "QUOTATION_REJECTED",

        // Booking
        "BOOKING_CREATED",
        "BOOKING_CONFIRMED",
        "BOOKING_CANCELLED",
        "BOOKING_UPDATED",

        // Payment
        "PAYMENT_RECEIVED",
        "PAYMENT_DUE",
        "PAYMENT_OVERDUE",
        "REFUND_PROCESSED",

        // Hotel / Transport
        "HOTEL_CONFIRMED",
        "TRANSPORT_CONFIRMED",

        // Documents
        "DOCUMENT_PENDING",
        "DOCUMENT_VERIFIED",

        // System
        "SYSTEM",
      ],
      required: true,
    },

    // =========================
    // MESSAGE
    // =========================

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // =========================
    // READ STATUS
    // =========================

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =========================
    // RELATED ENTITIES
    // =========================

    relatedLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    relatedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    relatedContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    relatedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    relatedEnquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    relatedTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    relatedQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    relatedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },

    // =========================
    // ADDITIONAL DATA
    // =========================

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ========================================
// INDEXES
// ========================================

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);