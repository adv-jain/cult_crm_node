
const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    refundNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },

    amount: {
      type: Number,
      required: [true, "Refund amount is required"],
      min: 0.01,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    refundDate: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      required: [true, "Refund reason is required"],
      trim: true,
      maxlength: 3000,
    },

    refundMethod: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Bank Transfer",
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "Cheque",
        "Wallet",
        "Original Payment Method",
        "Other",
      ],
      default: "Original Payment Method",
    },

    transactionId: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "Requested",
        "Under Review",
        "Approved",
        "Processing",
        "Completed",
        "Rejected",
        "Cancelled",
      ],
      default: "Requested",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ===============================
// INDEXES
// ===============================

refundSchema.index({ booking: 1 });
refundSchema.index({ payment: 1 });
refundSchema.index({ invoice: 1 });
refundSchema.index({ customer: 1 });
refundSchema.index({ trip: 1 });
refundSchema.index({ refundDate: -1 });
refundSchema.index({ status: 1 });
refundSchema.index({ requestedBy: 1 });
refundSchema.index({ processedBy: 1 });


// ===============================
// MODEL
// ===============================

module.exports = mongoose.model("Refund", refundSchema);

