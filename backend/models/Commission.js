const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    commissionNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    commissionType: {
      type: String,
      enum: ["Percentage", "Fixed"],
      default: "Percentage",
    },

    baseAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    commissionAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Payable",
        "Paid",
        "Cancelled",
      ],
      default: "Pending",
      index: true,
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    paymentReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
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

    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// commissionSchema.index({ booking: 1 });
// commissionSchema.index({ trip: 1 });
// commissionSchema.index({ customer: 1 });
// commissionSchema.index({ salesPerson: 1 });
// commissionSchema.index({ status: 1 });
commissionSchema.index({ paymentDate: 1 });

module.exports = mongoose.model("Commission", commissionSchema);