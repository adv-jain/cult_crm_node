const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // =========================
    // BOOKING
    // =========================
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // =========================
    // INVOICE
    // =========================
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    // =========================
    // CUSTOMER
    // =========================
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // =========================
    // ENQUIRY
    // =========================
    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    // =========================
    // QUOTATION
    // =========================
    quotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      default: null,
    },

    // =========================
    // PAYMENT NUMBER
    // =========================
    paymentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // =========================
    // AMOUNT
    // =========================
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // =========================
    // CURRENCY
    // =========================
    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    // =========================
    // PAYMENT METHOD
    // =========================
    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
        "Cheque",
        "Online",
      ],
      required: true,
    },

    // =========================
    // TRANSACTION ID
    // =========================
    transactionId: {
      type: String,
      trim: true,
      default: null,
      unique: true,
      sparse: true,
    },

    // =========================
    // PAYMENT DATE
    // =========================
    paymentDate: {
      type: Date,
      default: Date.now,
    },

    // =========================
    // PAYMENT STATUS
    // =========================
    status: {
  type: String,
  enum: [
    "Pending",
    "Completed",
    "Failed",
    "Partially Refunded",
    "Refunded",
  ],
  default: "Completed",
},

    // =========================
    // NOTES
    // =========================
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // RECEIVED BY
    // =========================
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

paymentSchema.index({ booking: 1 });
paymentSchema.index({ invoice: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });

// =====================================================
// MODEL
// =====================================================

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);