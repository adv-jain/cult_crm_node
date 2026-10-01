const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    // =========================
    // ACTIVITY TYPE
    // =========================

    type: {
      type: String,
      enum: [
        "Call",
        "Email",
        "Meeting",
        "Note",
        "Follow-up",
        "WhatsApp",
        "SMS",
        "Quotation",
        "Booking",
        "Payment",
        "Hotel",
        "Transport",
        "Itinerary",
        "Document",
        "Customer Support",
        "Other",
      ],
      required: [true, "Activity type is required"],
    },

    // =========================
    // BASIC INFORMATION
    // =========================

    title: {
      type: String,
      required: [true, "Activity title is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    activityDate: {
      type: Date,
      default: Date.now,
    },

    // =========================
    // OUTCOME
    // =========================

    outcome: {
      type: String,
      enum: [
        "Positive",
        "Neutral",
        "Negative",
        "No Response",
        "Completed",
        "Pending",
      ],
      default: "Completed",
    },

    // =========================
    // CREATED BY
    // =========================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // TRAVEL CRM RELATIONSHIPS
    // =========================

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      default: null,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    // =========================
    // TRIP
    // =========================

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    // =========================
    // BOOKING
    // =========================

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // =========================
    // ADDITIONAL INFORMATION
    // =========================

    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ========================================
// INDEXES
// ========================================

activitySchema.index({
  createdBy: 1,
  activityDate: -1,
});

activitySchema.index({
  lead: 1,
  activityDate: -1,
});

activitySchema.index({
  customer: 1,
  activityDate: -1,
});

activitySchema.index({
  contact: 1,
  activityDate: -1,
});

activitySchema.index({
  company: 1,
  activityDate: -1,
});

// Trip index
activitySchema.index({
  trip: 1,
  activityDate: -1,
});

activitySchema.index({
  booking: 1,
  activityDate: -1,
});

activitySchema.index({
  type: 1,
  activityDate: -1,
});

// ========================================
// MODEL
// ========================================

module.exports = mongoose.model("Activity", activitySchema);