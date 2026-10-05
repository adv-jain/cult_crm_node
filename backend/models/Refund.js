const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    /* =================================================
       REFUND NUMBER
    ================================================= */
    refundNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    /* =================================================
       RELATIONS
    ================================================= */
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
      index: true,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
      index: true,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
      index: true,
    },

    /* =================================================
       REFUND DETAILS
    ================================================= */
    amount: {
      type: Number,
      required: [true, "Refund amount is required"],
      min: [0.01, "Refund amount must be greater than 0"],
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },

    refundDate: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      required: [true, "Refund reason is required"],
      trim: true,
      maxlength: [3000, "Refund reason cannot exceed 3000 characters"],
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
      maxlength: [200, "Transaction ID cannot exceed 200 characters"],
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: [200, "Reference number cannot exceed 200 characters"],
      default: null,
    },

    /* =================================================
       STATUS
    ================================================= */
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
      index: true,
    },

    /* =================================================
       AUDIT FIELDS
    ================================================= */
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requested by user is required"],
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
      maxlength: [2000, "Rejection reason cannot exceed 2000 characters"],
      default: null,
    },

    /* =================================================
       NOTES
    ================================================= */
    notes: {
      type: String,
      trim: true,
      maxlength: [5000, "Notes cannot exceed 5000 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
   INDEXES
===================================================== */

refundSchema.index({ booking: 1, status: 1 });
refundSchema.index({ payment: 1, status: 1 });
refundSchema.index({ invoice: 1, status: 1 });
refundSchema.index({ customer: 1, refundDate: -1 });
refundSchema.index({ trip: 1, refundDate: -1 });
refundSchema.index({ refundDate: -1 });
refundSchema.index({ status: 1, refundDate: -1 });
refundSchema.index({ requestedBy: 1 });
refundSchema.index({ approvedBy: 1 });
refundSchema.index({ processedBy: 1 });

/* =====================================================
   NORMALIZE DATA BEFORE SAVE
===================================================== */

refundSchema.pre("save", function () {
  if (this.currency) {
    this.currency = String(this.currency).trim().toUpperCase();
  }

  if (this.amount !== undefined && this.amount !== null) {
    this.amount = Number(Number(this.amount).toFixed(2));
  }

  if (this.transactionId) {
    this.transactionId = String(this.transactionId).trim();
  }

  if (this.referenceNumber) {
    this.referenceNumber = String(this.referenceNumber).trim();
  }

  if (this.reason) {
    this.reason = String(this.reason).trim();
  }

  if (this.notes) {
    this.notes = String(this.notes).trim();
  }

  if (this.rejectionReason) {
    this.rejectionReason = String(this.rejectionReason).trim();
  }
});

/* =====================================================
   REFUND STATUS VALIDATION
===================================================== */

refundSchema.pre("validate", function () {
  if (this.status === "Completed") {
    if (!this.processedBy) {
      throw new Error("Completed refund must have a processedBy user.");
    }
    if (!this.processedAt) {
      throw new Error("Completed refund must have a processedAt date.");
    }
  }

  if (this.status === "Approved") {
    if (!this.approvedBy) {
      throw new Error("Approved refund must have an approvedBy user.");
    }
    if (!this.approvedAt) {
      throw new Error("Approved refund must have an approvedAt date.");
    }
  }

  if (this.status === "Rejected") {
    if (!this.rejectionReason || !String(this.rejectionReason).trim()) {
      throw new Error("Rejected refund must have a rejection reason.");
    }
  }
});

/* =====================================================
   MODEL
===================================================== */

module.exports = mongoose.model("Refund", refundSchema);