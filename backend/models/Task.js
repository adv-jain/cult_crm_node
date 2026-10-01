const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC INFORMATION
    // =========================

    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "Call",
        "Email",
        "Meeting",
        "Follow-up",
        "Quotation",
        "Booking",
        "Hotel",
        "Transport",
        "Visa",
        "Documentation",
        "Payment",
        "Itinerary",
        "Customer Support",
        "Other",
      ],
      default: "Follow-up",
    },

    // =========================
    // ASSIGNMENT
    // =========================

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task must be assigned to a user"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =========================
    // STATUS & PRIORITY
    // =========================

    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    priority: {
      type: String,
      enum: [
        "Low",
        "Medium",
        "High",
        "Urgent",
      ],
      default: "Medium",
    },

    // =========================
    // SCHEDULING
    // =========================

    startDate: {
      type: Date,
      default: null,
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },

    completedAt: {
      type: Date,
      default: null,
    },

    // =========================
    // REMINDER
    // =========================

    reminder: {
      enabled: {
        type: Boolean,
        default: false,
      },

      reminderAt: {
        type: Date,
        default: null,
      },
    },

    // =========================
    // TRAVEL CRM RELATIONSHIPS
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

    // =========================
    // RELATED TRIP
    // =========================

    relatedTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },

    // =========================
    // RELATED BOOKING
    // =========================

    relatedBooking: {
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
      maxlength: 2000,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ========================================
// AUTOMATIC COMPLETION DATE
// ========================================

taskSchema.pre("save", function () {
  if (
    this.isModified("status") &&
    this.status === "Completed" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  if (
    this.isModified("status") &&
    this.status !== "Completed"
  ) {
    this.completedAt = null;
  }
});

// ========================================
// INDEXES
// ========================================

taskSchema.index({
  assignedTo: 1,
  status: 1,
});

taskSchema.index({
  dueDate: 1,
});

taskSchema.index({
  relatedLead: 1,
});

taskSchema.index({
  relatedCustomer: 1,
});

taskSchema.index({
  relatedContact: 1,
});

taskSchema.index({
  relatedCompany: 1,
});

// Trip index
taskSchema.index({
  relatedTrip: 1,
});

taskSchema.index({
  relatedBooking: 1,
});

// ========================================
// MODEL
// ========================================

module.exports = mongoose.model("Task", taskSchema);