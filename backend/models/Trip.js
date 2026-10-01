const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    tripCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    travelType: {
      type: String,
      enum: [
        "Domestic",
        "International",
        "Honeymoon",
        "Family",
        "Solo",
        "Corporate",
        "Group",
        "Adventure",
        "Pilgrimage",
        "Other",
      ],
      default: "Other",
    },

    adults: {
      type: Number,
      default: 1,
      min: 1,
    },

    children: {
      type: Number,
      default: 0,
      min: 0,
    },

    infants: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "Planning",
        "Quotation",
        "Confirmed",
        "Upcoming",
        "Ongoing",
        "Completed",
        "Cancelled",
      ],
      default: "Planning",
    },

    estimatedValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    profit: {
      type: Number,
      default: 0,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    description: {
      type: String,
      trim: true,
    },

    cancellationReason: {
      type: String,
      trim: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

tripSchema.index({ customer: 1 });
tripSchema.index({ company: 1 });
tripSchema.index({ lead: 1 });
tripSchema.index({ owner: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ startDate: 1 });

module.exports = mongoose.model("Trip", tripSchema);